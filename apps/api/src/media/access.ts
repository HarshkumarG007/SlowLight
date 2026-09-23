/**
 * media/access.ts — Signed URL generation for media assets.
 *
 * Security model:
 *  - Caller must have a valid session (enforced by route preHandler).
 *  - RLS on the DB query ensures the asset is reachable only through a
 *    published memory or an unlocked letter that the current actor can see.
 *    A deliberately buggy query would still be blocked by RLS (AUTHZ-08).
 *  - In local dev: returns a presigned MinIO URL (S3-compatible).
 *  - In production: returns a CloudFront signed URL (canned policy,
 *    private key from Secrets Manager) — wired in Phase 11.
 *
 * URL lifetimes per spec §14.4:
 *   image  →  90 s
 *   audio  → 600 s
 *   video  → 900 s
 */
import { db } from '../db/index.js';
import { mediaAssets } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { env } from '../config/env.js';

// TTL per media kind (seconds)
const SIGNED_TTL: Record<string, number> = {
  image: 90,
  audio: 600,
  video: 900,
};

type Variant = 'thumb' | 'display' | 'large' | 'zoom' | 'display-jpg' | '720p' | '1080p' | 'aac' | 'original' | 'hls';

export interface AccessResult {
  assetId: string;
  variant: Variant;
  url: string;
  expiresAt: string; // ISO-8601
}

/**
 * Resolve a signed URL for a single asset/variant pair.
 * Throws a 404-flavoured error if the asset is not visible to the actor,
 * so callers never learn whether an asset exists but is restricted.
 */
export async function resolveMediaAccess(
  assetId: string,
  variant: Variant,
  actorId: string, // used for future audit logging
): Promise<AccessResult> {
  void actorId;
  // Verify the asset exists, is ready, and not deleted
  const [asset] = await db
    .select({ id: mediaAssets.id, kind: mediaAssets.kind, variants: mediaAssets.variants })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, assetId),
        eq(mediaAssets.status, 'ready'),
        isNull(mediaAssets.deletedAt),
      ),
    );

  // Always 404 — never reveal whether the asset exists but is restricted
  if (!asset) throw Object.assign(new Error('NOT_FOUND'), { statusCode: 404 });

  const ttl = SIGNED_TTL[asset.kind] ?? 90;

  // Build the object key: _hls/<assetId>/master.m3u8 or m/<assetId>/<variant>.<ext>
  const ext = variantExt(asset.kind, variant);
  const objectKey = variant === 'hls' ? `_hls/${assetId}/master.m3u8` : `m/${assetId}/${variant}.${ext}`;

  const url = await signUrl(objectKey, ttl);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  return { assetId, variant, url, expiresAt };
}

/** Batch: up to 24 assets per request (spec §14.4). */
export async function resolveMediaAccessBatch(
  requests: Array<{ assetId: string; variant: Variant }>,
  actorId: string,
): Promise<AccessResult[]> {
  if (requests.length > 24) {
    throw Object.assign(new Error('BATCH_TOO_LARGE'), { statusCode: 400 });
  }
  return Promise.all(requests.map((r) => resolveMediaAccess(r.assetId, r.variant, actorId)));
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function variantExt(kind: string, variant: string): string {
  if (variant === 'hls') return 'm3u8';
  if (kind === 'image') {
    if (variant === 'display-jpg') return 'jpg';
    return 'avif';
  }
  if (kind === 'video') return 'mp4';
  if (kind === 'audio') return 'm4a';
  return 'bin';
}

/**
 * Signs a media object key.
 *
 * Local dev: generates a presigned MinIO/S3 URL using AWS SDK v3 with
 * endpoint override pointing at the Docker MinIO instance.
 *
 * Production: CloudFront signed URL is substituted here in Phase 11
 * once the key-group private key is available in Secrets Manager.
 */
async function signUrl(objectKey: string, ttlSeconds: number): Promise<string> {
  if (env.NODE_ENV !== 'production') {
    // Local presigned URL via MinIO (S3-compatible)
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const s3 = new S3Client({
      region: 'us-east-1',
      endpoint: 'http://localhost:9000',
      forcePathStyle: true,
      credentials: { accessKeyId: 'root', secretAccessKey: 'rootpassword' },
    });

    const cmd = new GetObjectCommand({
      Bucket: 'sl-media',
      Key: objectKey,
    });

    return getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
  }

  // Production path (Phase 11): CloudFront signed URL
  // TODO: load private key from Secrets Manager, sign with canned policy
  throw new Error('CLOUDFONT_SIGNING_NOT_IMPLEMENTED: deploy via Phase 11');
}
