# 15 — API SPECIFICATION

## 15.1 Conventions
Base `/api/v1`. JSON only (`Content-Type: application/json`, UTF-8); bodies ≤ 256 KB (story text ≤ 100 KB). Auth: cookie `__Host-sl_sid`. Every non-GET requires `X-SL-Client` and a matching `Origin` (Doc 10 §10.2). Every response carries `X-Request-Id`; all API responses `Cache-Control: no-store`. IDs are UUIDv4. Times RFC 3339 UTC; calendar dates `YYYY-MM-DD`. Pagination: opaque `cursor` + `limit` (≤ 100). Concurrency: `ETag: "<version>"` on resources; PATCH/DELETE require `If-Match` (412 on mismatch). Idempotency: `Idempotency-Key` header on admin POSTs. Unauthorized or invisible objects both return **404** (no existence oracle). No CORS. OpenAPI 3.1 is generated from the zod schemas in CI (not served in production) and used for contract tests.

Envelope:
```json
{ "success": true, "data": { } }
```
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "This isn't available.", "requestId": "r_8f2c1d", "details": [] } }
```

## 15.2 Error catalogue
| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | zod failure (`details[]` has path + code, never echoing values) |
| 401 | `AUTH_REQUIRED` / `SESSION_EXPIRED` | No/expired session |
| 401 | `STEP_UP_REQUIRED` | Fresh assertion needed (`details.action`) |
| 403 | `FORBIDDEN` | Role can never do this (e.g., recipient on admin) |
| 403 | `KNOCK_REQUIRED` | Session pending Author approval |
| 404 | `NOT_FOUND` | Missing **or** not visible |
| 409 | `CONFLICT` | Duplicate/invalid state |
| 412 | `VERSION_MISMATCH` | If-Match failed |
| 413 / 415 | `PAYLOAD_TOO_LARGE` / `UNSUPPORTED_MEDIA` | Limits |
| 423 | `LETTER_SEALED` | Letter locked (`details.unlockAt` if timed) |
| 429 | `RATE_LIMITED` | With `Retry-After` |
| 500 / 503 | `INTERNAL` / `SEALED_UNAVAILABLE` / `UNAVAILABLE` | Server faults; never leak internals |

## 15.3 Catalogue
Columns: **Auth** (P public, S session, E elevated author), **Authz** policy, **Limit** (per IP or session), **Audit** (✔ logged).

### Public / authentication
| ID | Method | Route | Auth | Authz | Limit | Audit |
|---|---|---|---|---|---|---|
| A1 | GET | `/health` | P | — | 60/min | — |
| A2 | GET | `/session` | P | returns `{authenticated:false}` or summary | 60/min | — |
| A3 | POST | `/auth/passkey/options` | P | — | 10/min | ✔ (fail only) |
| A4 | POST | `/auth/passkey/verify` | P | challenge bound | 10/min | ✔ |
| A5 | POST | `/auth/enrollment/begin` | invite | token+phrase | 5/h | ✔ |
| A6 | POST | `/auth/enrollment/complete` | invite | challenge bound | 5/h | ✔ |
| A7 | POST | `/auth/knock/verify` | S(pending) | code, attempts ≤ 5 | 5/10min | ✔ |
| A8 | POST | `/auth/logout` | S | own session | 30/min | ✔ |
| A9 | POST | `/auth/step-up/options`, `/verify` | S | own credential | 10/min | ✔ |
| A10 | POST | `/telemetry/client-error`, `/telemetry/csp` | P | schema-only, redacted | 20/min | — |

### Account (recipient and author)
| ID | Method | Route | Auth | Authz | Limit | Audit |
|---|---|---|---|---|---|---|
| U1 | GET | `/me` | S | self | 60/min | — |
| U2 | GET | `/me/sessions`, `/me/devices` | S | own rows | 30/min | — |
| U3 | DELETE | `/me/sessions/:id` | S | own | 30/min | ✔ |
| U4 | PATCH/DELETE | `/me/devices/:id` | S+step-up | own; cannot revoke last credential | 10/min | ✔ |
| U5 | POST | `/me/devices/options`, `/verify` | S+step-up | add passkey | 5/h | ✔ |
| U6 | POST | `/me/sign-out-everywhere` | S+step-up | own | 5/h | ✔ |

### World (read; recipient or author)
| ID | Method | Route | Auth | Authz | Limit | Audit |
|---|---|---|---|---|---|---|
| W1 | GET | `/world` | S | visible content only | 30/min | — |
| W2 | GET | `/memories/:id` | S | visible | 120/min | — |
| W3 | GET | `/chapters/:id` | S | visible | 60/min | — |
| W4 | GET | `/letters`, `/letters/:id` | S | visible; body only if unlocked else 423 | 60/min | opening ✔ |
| W5 | POST | `/letters/:id/open` | S | recipient; unlocked; seal_ceremony | 10/min | ✔ |
| W6 | GET | `/future`, `/future/:id` | S | unlit/arrived | 60/min | — |
| W7 | GET | `/archive/search` | S | visible | 30/min | — |
| W8 | GET | `/tags` | S | — | 30/min | — |
| W9 | PUT/DELETE | `/favorites/memories/:id`, `/favorites/letters/:id` | S | own; target visible | 60/min | — |
| W10 | POST | `/world/seen` | S | updates `last_seen_world_at` | 10/min | — |
| M1 | POST | `/media/access`, `/media/access:batch` | S | asset reachable via visible parent | 300/min | optional |

### Admin (Admin Door open, `role=author`, elevated session)
| ID | Method | Route | Notes | Audit |
|---|---|---|---|---|
| D1 | GET/POST | `/admin/memories` | list incl. drafts; create | ✔ |
| D2 | GET/PATCH/DELETE | `/admin/memories/:id` | If-Match; DELETE = soft delete, step-up | ✔ |
| D3 | POST | `/admin/memories/:id/publish`, `/unpublish`, `/archive`, `/restore` | schedule via `publishAt` | ✔ |
| D4 | PUT | `/admin/memories/:id/assets` | ordered array with captions, cover | ✔ |
| D5 | CRUD | `/admin/chapters`, `/admin/tags`, `/admin/locations` | reorder via `PUT /admin/chapters/order` | ✔ |
| D6 | CRUD | `/admin/letters` + `/admin/letters/:id/release` | unlock mode, seal ceremony | ✔ |
| D7 | CRUD | `/admin/future` + `/admin/future/:id/arrive` | arrive promotes to memory | ✔ |
| D8 | GET/PUT | `/admin/site-texts/:key` | greeting, closing, world seed | ✔ |
| D9 | POST | `/admin/media/uploads` → `/:id/complete` | presigned POST; enqueue | ✔ |
| D10 | GET/PATCH/DELETE | `/admin/media/:id`, POST `/:id/retry` | status, alt text; delete step-up | ✔ |
| D11 | POST/DELETE | `/admin/invites`, `/admin/invites/:id` | enrollment invite for recipient | ✔ |
| D12 | GET/POST | `/admin/users`, `/admin/users/:id/revoke-sessions`, `DELETE /admin/users/:id/credentials/:cid` | step-up | ✔ |
| D13 | GET/POST | `/admin/knocks`, `/admin/knocks/:sessionId/approve` | shows pending Knock codes | ✔ |
| D14 | GET | `/admin/audit` | filters; category ≠ content | — |
| D15 | GET | `/admin/system/status` | queue depth, backups, key ids | — |
| D16 | GET | `/admin/preview/*` | Preview as Recipient (read-only, flagged) | ✔ |

## 15.4 Contracts (representative)
**A3 → options** `POST /auth/passkey/options` `{}` →
```json
{ "success": true, "data": { "challengeId": "9f0c2a10-6d0e-4d59-9a3e-1d4f5a7f8b21", "options": { "rpId": "example.com", "challenge": "b64url…", "timeout": 60000, "userVerification": "required", "allowCredentials": [] } } }
```
**A4 → verify** `{ "challengeId": "…", "credential": { "id": "…", "rawId": "…", "type": "public-key", "response": { "clientDataJSON": "…", "authenticatorData": "…", "signature": "…", "userHandle": "…" } }, "deviceKind": "personal" }` (`deviceKind`: `personal` | `not_mine`) →
```json
{ "success": true, "data": { "session": { "role": "recipient", "kind": "standard", "expiresAt": "2026-10-20T10:00:00Z", "knock": false } } }
```
**W1 → world manifest** (no sealed long text; ETag on content version)
```json
{ "success": true, "data": {
  "worldSeed": "b3f1…", "frontierAt": "2026-08-01", "newSince": ["<memoryId>"],
  "texts": { "veil.hint": "Let your eyes adjust.", "threshold.greeting": "[GREETING]", "unlit.closing": "This is as far as the light has come." },
  "chapters": [ { "id": "…", "slug": "first-year", "title": "[CHAPTER TITLE]", "order": 1 } ],
  "memories": [ { "id": "…", "chapterId": "…", "title": "[MEMORY TITLE]", "occurredOn": "2021-02-14", "datePrecision": "day",
                  "kind": "milestone", "significance": 4, "emotion": "tender", "assetCount": 3, "coverAssetId": "…", "kept": false, "layoutHint": null } ],
  "letters": [ { "id": "…", "title": "[LETTER TITLE]", "lock": { "state": "timed", "unlockAt": "2027-02-14T00:00:00Z" }, "sealCeremony": true, "opened": false } ],
  "future": [ { "id": "…", "kind": "place", "title": "[PLACE]", "targetDate": "2028", "status": "unlit" } ]
} }
```
**W2 → memory**
```json
{ "success": true, "data": { "id": "…", "title": "[MEMORY TITLE]", "subtitle": null, "occurredOn": "2021-02-14", "datePrecision": "day",
  "story": "[PERSONAL MESSAGE — SL-text]", "chapter": { "id": "…", "title": "[CHAPTER TITLE]" }, "location": { "label": "[PLACE]" },
  "assets": [ { "assetId": "…", "kind": "image", "position": 1, "isCover": true, "caption": "[CAPTION]", "alt": "[ALT TEXT]", "width": 3024, "height": 4032, "lqip": "data:image/webp;base64,…" } ],
  "neighbors": { "prev": "…", "next": "…" }, "kept": false } }
```
**W4 → locked letter** `423`
```json
{ "success": false, "error": { "code": "LETTER_SEALED", "message": "This letter isn't open yet.", "requestId": "r_1a2b3c", "details": { "state": "timed", "unlockAt": "2027-02-14T00:00:00Z" } } }
```
**M1 → media access** `{ "assetId": "…", "variant": "display" }` →
```json
{ "success": true, "data": { "url": "/_m/5f2c…/display.avif?Expires=1791000090&Signature=…&Key-Pair-Id=K…", "expiresAt": "2026-09-20T10:01:30Z", "mime": "image/avif", "fallbackVariant": "display-jpg" } }
```
**D9 → upload intent** `{ "kind": "image", "mime": "image/heic", "bytes": 3480211, "sha256": "b64…" }` →
```json
{ "success": true, "data": { "assetId": "…", "upload": { "url": "https://sl-quarantine.s3.<region>.amazonaws.com/", "fields": { "key": "q/<assetId>", "Content-Type": "image/heic", "x-amz-checksum-sha256": "…", "Policy": "…", "X-Amz-Signature": "…" } } } }
```
(This is the **only** call where the browser talks to a non-`self` origin; the admin CSP adds exactly that bucket host to `connect-src`.)
**D2 → create memory** `POST /admin/memories`
```json
{ "title": "[MEMORY TITLE]", "occurredOn": "2021-02-14", "datePrecision": "day", "kind": "moment", "significance": 3, "emotion": "quiet",
  "chapterId": null, "story": "[PERSONAL MESSAGE]", "tags": ["[TAG]"], "status": "draft", "publishAt": null }
```
**W7 → search** `GET /archive/search?q=harbour&chapter=…&kind=milestone&from=2020-01-01&kept=true&limit=20` →
```json
{ "success": true, "data": { "items": [ { "id": "…", "title": "[MEMORY TITLE]", "occurredOn": "2021-02-14", "snippet": { "text": "…the harbour at dusk…", "matches": [[4, 11]] } } ], "nextCursor": null } }
```
Validation, error and rate-limit behaviors are tested from the OpenAPI document (Doc 26).
