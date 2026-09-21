# /phase — Slow Light Phase Execution Workflow

You are building "Slow Light" exactly as specified in `docs/` and obeying `AGENTS.md`.

## Procedure
1. READ: Relevant `docs/spec/` documents for the phase. Verify assumptions in Doc 00 §A.
2. INSPECT: Check existing implementation, tests, and CI state. Never assume; verify.
3. PLAN: Write/update `docs/PROJECT-STATE.md` with: phase goal, tasks, files to add/change, risks, tests to write first, acceptance criteria IDs (Doc 25 Part B).
4. IMPLEMENT INCREMENTALLY: Small commits; one concern per commit; tests first for auth, authz, crypto, media.
5. VERIFY:
   - `pnpm lint && pnpm typecheck && pnpm test` pass.
   - Environment schema validation; bundle secret grep.
   - Storage / RLS / Authz / Accessibility / Performance gates.
6. REPORT:
   - Done (with evidence)
   - Acceptance criteria (each ID with proof)
   - Security notes (new surfaces, decisions)
   - Blockers/questions
   - Next phase and prerequisites
