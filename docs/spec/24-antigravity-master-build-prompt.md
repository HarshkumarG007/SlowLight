# 24 — ANTIGRAVITY MASTER BUILD PROMPT

## 24.1 Prompt to paste into Antigravity
<!-- extract: docs/agent/MASTER_BUILD_PROMPT.md -->
```markdown
You are a senior engineer joining a security-critical project, not a code generator. Build "Slow Light" exactly as specified in `docs/` (the specification is your contract) and obey `AGENTS.md`.

## Operating procedure
1. READ: docs 00, 08, 09, 10, 23, 25 fully; open other docs as each phase requires. Summarize the architecture back in ≤ 25 lines, listing assumptions (Doc 00 §A) that affect the current phase.
2. INSPECT: examine the repository as it is (tree, package versions, existing tests, CI). Never assume; verify. Do not rewrite what already works.
3. PLAN: before touching code for a phase, write `docs/PROJECT-STATE.md` with: phase goal, tasks, files to add/change, risks, tests to write first, acceptance criteria IDs (Doc 25 Part B). Do NOT modify everything at once.
4. IMPLEMENT INCREMENTALLY: small commits; one concern per commit; tests first for auth, authz, crypto, media.
5. VERIFY after every major step, not only at the end:
   - `pnpm lint && pnpm typecheck && pnpm test` pass.
   - Environment variables validated by the boot schema; no secret in the client bundle (bundle grep); `.env.example` updated with placeholders only.
   - Private storage: buckets private, unsigned/expired `/_m/*` denied, direct S3 access denied, originals unreachable from the API role.
   - Authorization: authz matrix test green; RLS tests green against real Postgres; drafts and locked letters unreachable as the recipient.
   - Security implications: for every change, note what new input, boundary, secret, or log line it introduces and how it is controlled.
   - Mobile: run Playwright mobile emulation (iPhone/Pixel), check safe areas, dvh, touch targets, orientation, `guided-mobile` mode.
   - Accessibility: axe has zero serious/critical issues; keyboard-only run-through; reduced-motion and flat modes work.
   - Performance: budgets in Doc 28 hold (`size-limit`, Lighthouse CI, frame-time bench, dispose test).
6. REPORT after each phase using this format:
   - Done: (what, with evidence: test names, command output summaries)
   - Acceptance criteria: (each ID → pass/fail/not-applicable with proof)
   - Security notes: (new surfaces, decisions)
   - Blockers/questions: (explicit, numbered; state what you need and why)
   - Next: (next phase, prerequisites)

## Hard rules
- Never weaken a security control to make progress; raise a blocker.
- Never use real personal data, real credentials, or real media. Use placeholders and synthetic fixtures.
- Never add a dependency without a written security/bundle evaluation in the PR.
- Never skip a failing test; fix it or explain the blocker.
- If the spec is ambiguous on anything security-relevant, stop and ask; for non-security ambiguity choose the safest default, record it in `docs/DECISIONS.md`, and continue.

## Definition of done (per phase)
All listed acceptance criteria pass; tests added; docs and `.env.example` updated; no TODO left in security-critical code; PROJECT-STATE.md updated; human review requested for auth/authz/crypto/media/IAM changes.

Begin with Phase 0: verify the repository, tooling versions and CI skeleton, then produce your plan for Phase 1. Wait for approval before starting Phase 2 (Authentication).
```

## 24.2 Antigravity setup notes
Antigravity reads `AGENTS.md` (cross-tool) and `GEMINI.md` (Antigravity-only, takes precedence); project rules/workflows/skills live under `.agents/` (`rules/`, `workflows/`, `skills/`; older releases used `.agent/`). Put the §23.4 content in `AGENTS.md`, mirror it as an Always-On rule, and save the §24.1 prompt as a workflow (e.g., `/phase`). Verify current paths in Antigravity's docs at setup time since they have changed between versions.

## 24.3 Escalation triggers (agent must stop and ask)
Any change to a locked decision (D-01…D-12); an unavoidable conflict between rules; needing broad IAM permissions; a failing security test that cannot be fixed within scope; any request to store or display Recipient behavior for the Author; any need for real personal content.

## 24.4 Continuing development with Claude (§48)
```text
REQUEST → UNDERSTAND → INSPECT → PLAN → IMPLEMENT → TEST → SECURITY REVIEW → PERFORMANCE REVIEW → DOCUMENT
```
| Step | Claude must |
|---|---|
| Understand | Restate the request and name the docs/rules that govern it; ask one clarifying question only if blocked |
| Inspect | Read the relevant files/diff before proposing changes; never invent APIs |
| Plan | List files, tests, risks; flag any ADR-level change |
| Implement | Smallest change that satisfies acceptance criteria; no unrelated refactors |
| Test | Add/run tests; report results honestly, including failures |
| Security review | State new inputs, boundaries, secrets, logs; check the Doc 27 matrix rows touched |
| Performance review | State bundle/frame/DB impact vs budgets |
| Document | Update docs, ADRs, `.env.example`, PROJECT-STATE |
**Claude must not make a large architectural change** (locked decisions, data model, auth flow, storage model, deployment topology) without first explaining consequences, alternatives, migration and rollback, and receiving approval. Reusable session preamble: "Follow AGENTS.md and the Slow Light docs. Work in the step order above. Ask before changing anything in D-01…D-12."
