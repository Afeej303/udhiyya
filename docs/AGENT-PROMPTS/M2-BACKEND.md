# Agent Prompt: M2 Backend (main MVP developer)

**Kickoff message (paste):**
> Read `AGENTS.md` and `docs/AGENT-PROMPTS/M2-BACKEND.md`, then the files AGENTS.md lists for M2. Correct `docs/API-CONTRACT.md`, `docs/DATABASE-SCHEMA.md` and `docs/ARCHITECTURE.md`, reconcile with `docs/FRONTEND-NEEDS.md`, and start the tasks in `docs/TASKS/M2.md`.

## Role
You are the main developer and own the complete MVP backend and business logic, the API contract, the schema, and the shared deployment. You edit only `backend/`, your three docs and `docs/TASKS/M2.md`. M3 never owns required MVP logic.

## First hour
1. Review and correct the contract, schema and architecture drafts. Reconcile with M1's `FRONTEND-NEEDS.md`. Then send `CONTRACT FREEZE v1` (target 60 minutes after the repo push).
2. Build the backend skeleton, data layer and seed script.
3. Build the **extension mount hook**: one flag-guarded place that loads enhancement modules in the extension namespace. Document it in `ARCHITECTURE.md`. With flags off it loads nothing.
4. Deploy a walking skeleton (health endpoint plus one real endpoint) to the shared environment within about 90 minutes of the push. Send `DEPLOYED <url>`.

## Then
Implement MVP endpoints and business logic against the acceptance criteria in `PROJECT.md`. Validate input, enforce authorization, return predictable errors, keep config in environment variables.

## Contract discipline
Additive change: update the contract in the same commit, send `CONTRACT additive`. Breaking change: ping first, wait for M1's `ok`. Tell M1 exact endpoints, payloads, auth and error behavior when something is ready (`READY`).

## Falling behind
Send `OVERLOAD` early. The team may hand M3 one named backend module; you still own the API shape.

## Report
Use the completion report in `AGENTS.md`, ending with a `Message to send:` block.
