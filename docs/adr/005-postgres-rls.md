# ADR-005: Server-Side Authorization plus Postgres Row-Level Security (Defense in Depth)

- **Status:** LOCKED
- **Date:** 2026-09-20
- **Deciders:** Author
- **Spec Reference:** Spec 00 §Locked Decisions (D-05), Spec 08 §8.2, Spec 17

## Context & Problem Statement
The data layer contains sensitive records: memories, draft entries, unscheduled letters, and private assets. An application bug, query omission (e.g., forgotten `WHERE status = 'published'`), or SQL injection in application code could inadvertently leak draft memories, locked letters, or soft-deleted items to the Recipient or an unauthorized actor.

## Decision
We mandate a dual-layer **Defense-in-Depth** authorization model:
1. **Application-Level Authorization (`apps/api/src/authz/policy.ts`)**: Every route explicitly checks `{ auth, policy }` and scopes queries.
2. **Database-Level Row-Level Security (RLS)**: Enforced with `ALTER TABLE ... FORCE ROW LEVEL SECURITY` on all content tables in PostgreSQL (`db/migrations/0001_init.sql`).

Database connections run with transaction-scoped actor settings (`app.role` and `app.user_id`) initialized via `withActor(tx, actor, fn)` using `SET LOCAL`.

## Rationale
1. **Defensive Invariant**: Even if an engineer writes `SELECT * FROM letters` without any `WHERE` clause in the API service layer, PostgreSQL RLS silently filters out rows that the actor role is not permitted to see (e.g., locked letters or unpublished drafts for the Recipient role).
2. **Preventing Broken Object-Level Authorization (BOLA/IDOR)**: Direct ID lookups (`SELECT * FROM memories WHERE id = :id`) return zero rows at the database engine level if the user does not own or have visibility on the record.
3. **Auditability**: Authorization rules are codified declaratively in SQL policies, separate from application control flow.

## Consequences
- **Positive**: Hard cryptographic and relational defense against coding errors; impossible for application-level query bugs to leak unauthorized records.
- **Negative / Trade-off**: Requires running queries inside explicit transactions with `SET LOCAL` overhead (negligible at A-02 scale).
