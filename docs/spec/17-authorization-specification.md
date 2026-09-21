# 17 — AUTHORIZATION SPECIFICATION

## 17.1 Principles
Deny by default. The server decides; the client never does. One policy module (`apps/api/src/authz/policy.ts`) is the only place permissions are decided. Four layers must all agree: **route guard** (role/elevation) → **policy** (resource + action) → **repository scoping** (queries always via the actor's transaction) → **RLS** (last line). Unauthorized and invisible objects both return 404.

## 17.2 Roles and matrix
| Resource / action | recipient | author | unauthenticated |
|---|---|---|---|
| World manifest, memories, chapters (published or past-scheduled) | read | read (all incl. drafts via admin) | — |
| Letters metadata (published) | read | all | — |
| Letter body | read only when unlocked (open; timed ≤ now; held & released) | all | — |
| Media access | via visible parent only | any ready asset | — |
| Future entries (unlit/arrived) | read | all | — |
| Favorites | own | own | — |
| Search | over visible | over all | — |
| Content create/update/delete/publish | ✗ | ✔ (elevated; delete needs step-up) | — |
| Upload media | ✗ | ✔ (elevated) | — |
| Own sessions/devices | list, revoke; add/rename with step-up | same + manage recipient's | — |
| Audit read | ✗ | ✔ (categories auth, admin, security, system) | — |
| Recipient activity (favorites, opened_at, last_seen) | own | ✗ (never exposed) | — |
| Decrypt sealed fields | server does, only for permitted reads | same | — |

## 17.3 Content visibility state machine
`draft → scheduled (publish_at) → published → archived`; `archived`/`deleted_at` invisible to the recipient. Time is evaluated by the **database clock** (`now()`) in RLS and in queries; the client clock is never used. Letters: `open` visible to read at once; `timed` body unlocked at `unlock_at`; `held` unlocked when the Author sets `released_at`; `seal_ceremony=true` additionally requires `POST /letters/:id/open` once, which sets `opened_at`. A locked letter's body never leaves the database (RLS on `letter_bodies`).

## 17.4 Media authorization chain
```
User → authenticated session → role check → policy(asset reachable via visible memory OR unlocked letter, or author)
     → RLS-filtered query returns the asset row → CloudFront signed URL (≤ 15 min) → private object
```
Direct object access is impossible: bucket private, OAC-only; CloudFront rejects unsigned/expired URLs; keys are random 128-bit.

## 17.5 Step-up and elevation
Recipient step-up: device add/rename/revoke, sign-out-everywhere. Author elevation (15 min): all `/admin/*`. Author step-up per action: delete, hard purge requests, revoke credentials, invites, system settings.

## 17.6 Caching and revocation
No shared caches hold authorized data. Session revocation is immediate for API calls; already-issued media URLs remain valid until expiry (≤ 90–900 s, documented residual R8).

## 17.7 Enforcement tooling
- Every route registers `{ auth, policy }` metadata; a test enumerates the Fastify route table and fails if any route lacks it (except allow-listed public routes).
- A generated **authorization matrix test** runs every route as {anonymous, recipient, author, author-not-elevated, disabled user} and asserts status codes from the matrix above.
- RLS tests run against a real Postgres (Testcontainers) with the actual migration.
- Transaction helper: `withActor(actor, fn)` sets `app.role`/`app.user_id` via `SET LOCAL`; repositories accept only a `Tx` produced by it (compile-time guard); a lint rule forbids importing the raw pool outside `db/`.
Reference skeleton (illustrative; policies must stay in one file):
```ts
export type Actor = { id: string; role: "author" | "recipient"; elevated: boolean };
export type Decision = { allow: true } | { allow: false; as: 403 | 404 };
export const deny404: Decision = { allow: false, as: 404 };
export function canReadLetterBody(actor: Actor | null, l: { status: string; unlocked: boolean }): Decision {
  if (!actor) return { allow: false, as: 403 };
  if (actor.role === "author") return { allow: true };
  return l.status === "published" && l.unlocked ? { allow: true } : deny404;
}
```
