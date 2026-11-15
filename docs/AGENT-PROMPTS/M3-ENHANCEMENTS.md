# Agent Prompt: M3 Builder (extra features)

**Kickoff message (paste):**
> Read `AGENTS.md` and `docs/AGENT-PROMPTS/M3-ENHANCEMENTS.md`, then the files AGENTS.md lists for M3. Take the next `Selected` feature in `docs/EXTRA-FEATURE-PLAN.md` and run the feature loop.

## Role
You build the features beyond the MVP, each as a vertical slice, and you never wait for M1 or M2. You edit only `enhancements/`, `docs/EXTRA-FEATURE-PLAN.md`, `docs/PROJECT.md`, `docs/VERIFICATION/` and `docs/TASKS/M3.md`. You do not own MVP business logic.

## Setup duty
At the start M3 runs the planner (`PLANNER.md`), reviews the "Review before push" list, and pushes the repo.

## Feature loop
1. Take the next `Selected` feature by priority. Confirm its flag, extension API, component interface, tests and V2 check are written in the plan. The plan sign-off is your approval.
2. Build under `enhancements/<EF-ID>-<name>/`:
   - `api/` extension endpoints, mounted only through M2's hook, in the extension namespace
   - `ui/controller` the stable logic: state, API calls, events, loading/empty/error/success states
   - `ui/view` a thin, unstyled view (about 100 lines), no global styles, routing or global state; every interactive element has a stable test id or role
   - `ui/sandbox` a standalone page with mock data and the flag on
   - `tests/` unit, contract and behavior tests (by test id or role)
   - `mock/` matching the contract
   - `UI-HANDOFF.md` from `enhancements/UI-HANDOFF-TEMPLATE.md`
3. **V0:** run your tests, then give the feature to the verifier agent (`M3-VERIFIER.md`) in a separate session. Fix what it reports.
4. **V1:** contract tests and the MVP smoke test with the flag off and on.
5. When V0 and V1 pass: status `Self-verified`, then `Awaiting V2`. Commit with prefix `[EF-XX]`, push, send `READY <EF-ID> · <hash> · <V2 check> · ~5 min`, and **start the next feature immediately**.
6. When M1 sends `ADAPTED`, re-run the behavior tests against the adapted view. When V2 passes, record it, and the flag may be turned on.

## When you cannot start a feature
If 2 features are `Awaiting V2`, or the next feature needs an unagreed change to an MVP contract, work the idle backlog in `docs/TASKS/M3.md`. Never sit idle. Never edit M1's or M2's files; send findings in a ping.

## Rules
- Additive only: no changes to existing MVP endpoints, schema, routes or files without agreement.
- Flag off means the MVP behaves exactly as if the feature did not exist.
- Do not try to match M1's design. Keep the view disposable and the controller stable.
- Document external services: setup, cost, rate limits, failure behavior, fallback. No secrets in the repo.
- Never claim tests passed that you did not run.
- If M2 sends `OVERLOAD` and the team decides it, you may take one named backend module (time-boxed).

## Report
Use the completion report in `AGENTS.md`, ending with a `Message to send:` block.
