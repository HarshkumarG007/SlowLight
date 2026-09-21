# 14 — MEDIA STORAGE ARCHITECTURE

## 14.1 Buckets (all private; Block Public Access on; ACLs disabled; TLS-only bucket policy; versioning on)
| Bucket | Content | Encryption | Access |
|---|---|---|---|
| `sl-spa` | Built SPA assets | SSE-S3 | CloudFront OAC only |
| `sl-quarantine` | Raw uploads, lifecycle expire 24 h | SSE-KMS `sl-media` | Author presigned POST (write-only); worker read |
| `sl-media` | Sanitized derivatives, keys `m/<assetId>/<variant>.<ext>` | SSE-KMS `sl-media` (bucket keys) | Worker write; CloudFront OAC read via signed URLs |
| `sl-vault` | Originals `o/<assetId>` | SSE-KMS `sl-vault`, **API role denied decrypt** | Worker write; Author CLI read only |
| `sl-backups` (backup account) | Replicas, DB dumps | SSE-KMS `sl-backup`, Object Lock (compliance) | Replication role; restore role |
| `sl-logs` | CloudTrail/WAF logs | SSE-KMS | Security role |
Object keys use random UUIDv4 (never filenames or user data). Nothing is ever placed in `/public`.

## 14.2 Pipeline
```
Author device → presigned POST (quarantine)      conditions: content-length-range, exact key, Content-Type prefix, x-amz-checksum-sha256
      → POST /admin/media/uploads/:id/complete → job (pg-boss) → RunTask(media-worker)
worker: 1 verify checksum → 2 magic-byte type detection (file-type; extension ignored)
        → 3 hard limits (size, pixels ≤ 100 MP, video ≤ 60 min, audio ≤ 120 min, streams ≤ 4)
        → 4 ClamAV scan (signatures refreshed at task start) → 5 decode & RE-ENCODE (sanitizes polyglots, strips metadata)
        → 6 variants + poster + LQIP → 7 write to media (SSE-KMS); original to vault → 8 update DB (ready) → 9 delete quarantine object
any failure → status failed/quarantined + error_code, Author alert; nothing reaches media bucket
```
## 14.3 Formats and variants
| Kind | Variants | Notes |
|---|---|---|
| Image | `thumb` 320, `display` 960, `large` 1440, `zoom` 2560 (long edge) AVIF q≈55 + `display-jpg` 1440 JPEG q82 fallback; LQIP ≤ 2 KB inline in DB | sharp/libvips, `.rotate()` applies orientation then strips ALL metadata; no `withMetadata`; sRGB output |
| HEIC/HEIF (iPhone) | converted first with `heif-convert` in the sandbox | sharp prebuilt binaries lack HEVC; never use ImageMagick with default policy |
| Video | `720p` (H.264 High, CRF 22, AAC 128k) and optional `1080p`; MP4 `+faststart`; `poster` AVIF | Progressive MP4 + Range; HLS only if clips > 10 min become common |
| Audio | `aac` (m4a AAC-LC 128k) + optional Opus/WebM; waveform not required | |
ffmpeg safety: `-nostdin -protocol_whitelist file,pipe`, `-map_metadata -1 -map_chapters -1`, explicit stream mapping (first video, first audio only, no data/attachment streams), `-threads 2`, `timeout`, cgroup memory limit, non-root, read-only rootfs, no inbound network, egress only to S3/KMS/ClamAV mirror. Reject containers other than MP4/MOV/WebM/Matroska(with H.264/HEVC/VP9/AV1)/audio types on the allow-list.

## 14.4 Access (signed same-origin URLs)
`POST /api/v1/media/access` authorizes (RLS: asset reachable through a visible memory or unlocked letter) and returns `/_m/<assetId>/<variant>?Expires=…&Signature=…&Key-Pair-Id=…` signed with a CloudFront **key group** (private key in Secrets Manager; canned policy = exact URL + expiry). Lifetimes: image 90 s, audio 600 s, video 900 s; the client refreshes on 403 and resumes. CloudFront behavior `/_m/*`: viewer access restricted to trusted key group, **caching disabled (TTL 0)**, forwards `Range`, origin = `sl-media` via OAC, response-headers policy adds `Cache-Control: private, no-store`, `X-Content-Type-Options`, `Cross-Origin-Resource-Policy: same-origin`, `X-Robots-Tag`. No directory listing; no CORS. WAF still applies. Batch endpoint `POST /media/access:batch` (≤ 24 assets) for grids.

## 14.5 Trade-offs decided
| Question | Decision | Cost |
|---|---|---|
| Signed URL vs API proxy | Signed URL: S3/CloudFront implement Range/206 correctly (iOS Safari is picky) | URL is a bearer token until expiry (≤ 15 min) |
| CDN caching vs privacy | Edge caching disabled | Slower repeat loads; client keeps decoded blobs in an in-memory LRU |
| Encrypted blobs vs streaming | SSE-KMS only; app-level media encryption deferred (Doc 10 §10.9) | API compromise + signing key can read derivatives |
| Immediate revocation vs performance | URL lifetime is the revocation window | ≤ 90–900 s |
| Preloading vs privacy | Prefetch only the next memory's `thumb`, and only when idle | — |

## 14.6 Deletion, integrity, indexing
Two-stage delete: soft (hidden, 30 d) then purge job deletes DB rows and **all S3 versions** including vault; backups age out per Doc 30. Integrity: SHA-256 checked on upload and stored; weekly sampling job re-reads 1% of objects and compares. Accidental indexing: `robots.txt` disallow all, `X-Robots-Tag` on every response, no sitemap, random keys, no public listing, no analytics or link previews (Referrer suppressed).
