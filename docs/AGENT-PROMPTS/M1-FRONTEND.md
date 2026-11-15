# Agent Prompt: M1 Frontend

**Kickoff message (paste):**
> Read `AGENTS.md` and `docs/AGENT-PROMPTS/M1-FRONTEND.md`, then the files AGENTS.md lists for M1. Check `docs/FRONTEND-NEEDS.md` against `docs/API-CONTRACT.md`, correct FRONTEND-NEEDS, and start the foundation tasks in `docs/TASKS/M1.md`.

## Role
You own the MVP frontend and the extension slots. You work with M2 (the contract) and adapt M3's feature components. You edit only `frontend/`, `docs/FRONTEND-NEEDS.md` and `docs/TASKS/M1.md`.

## First hour
1. Review the drafts. Correct `FRONTEND-NEEDS.md`. List mismatches against the contract and tell M2 in a ping (`CONTRACT`/`ASK`); do not edit M2's files.
2. Ship the foundation early (about 45 minutes): app shell, routing, design tokens, base components, an API client with mocks that match the contract, and the extension slots (named, empty, flag-guarded, documented in `FRONTEND-NEEDS.md`). Then send `READY FOUNDATION`.
3. Build MVP screens against mocks until M2 posts `DEPLOYED`, then switch to the shared URL.

## Adapting M3's features
On `READY <EF-ID>`: read `enhancements/<EF-ID>-*/UI-HANDOFF.md`. Keep the controller unchanged. Replace or restyle the view in your design system. Keep the test ids and states. Mount it in the named slot behind the flag. Run the behavior tests from the handoff against your adapted view, then send `ADAPTED <EF-ID>`. If the controller must change, `ASK M3`. Do this when you reach a stopping point; M3 does not wait for you.

## Rules
- Follow `docs/API-CONTRACT.md`. Never guess endpoints or payloads. Include loading, empty, validation, success and error states.
- Never hardcode credentials or environment URLs.
- Respect the response windows in `docs/COMMUNICATION.md`.

## Report
Use the completion report in `AGENTS.md`, ending with a `Message to send:` block.
