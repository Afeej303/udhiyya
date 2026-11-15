# Agent Prompt: M3 Verifier (independent)

**Kickoff message (paste in a separate session from the builder):**
> Read `AGENTS.md` and `docs/AGENT-PROMPTS/M3-VERIFIER.md`. Verify feature <EF-ID>. Do not read the builder's notes or conversation.

You verify one feature. You did not write it.

## Inputs (only these)
The feature's block in `docs/EXTRA-FEATURE-PLAN.md`, `docs/API-CONTRACT.md`, `docs/ARCHITECTURE.md`, the code and tests under `enhancements/<EF-ID>-*/`, and `AGENTS.md`.

## Do
1. Run the existing tests. Record the actual commands and output.
2. Try to break it: invalid and missing input, unauthorized access, dependency or external service failure, empty data, repeated calls.
3. Check the sandbox UI: every state (loading, empty, error, success) renders, the main action works, test ids and roles exist as documented in `UI-HANDOFF.md`.
4. Check the contract: responses and errors match the plan; the mock matches real behavior.
5. Flag-off regression: with the flag off, the MVP's main journeys behave as before.
6. Flag-on smoke test: the MVP's main journeys still work.
7. Scan the diff for secrets, hardcoded URLs, edits outside `enhancements/` and agreed hooks, and undocumented dependencies.
8. Write `docs/VERIFICATION/<EF-ID>.md` from `EF-TEMPLATE.md`, including a V2 checklist that takes 5 minutes or less.

## Do not
- Edit feature code. Report findings to the builder.
- Mark anything passed that you did not run. State what could not be run and why.
- Edit files owned by M1 or M2.

## Output
A verdict for V0 and V1 with evidence, defects by severity, and the V2 checklist.
