# Agent Instructions (all members, all agents)

Every agent in this repository reads this file first, then its role prompt in `docs/AGENT-PROMPTS/`. These rules apply to everyone.

## 1. How the system works

- **Files are the source of truth.** Contracts, schema, scope and tasks live in `docs/`. If a chat message and a file disagree, the file wins: pull and read it.
- **WhatsApp is the doorbell.** The humans coordinate in one WhatsApp group using short pings with a commit hash (formats in `docs/COMMUNICATION.md`). Pings announce changes; details live in files.
- **Agents have no WhatsApp.** When your work needs a ping, end your report with a `Message to send:` block in the standard format for your human to paste. When your human pastes an incoming ping, run `git pull`, read the referenced commit and files, and act on those, not on the message text alone.
- **One writer per file** (table in section 3). Never edit a file you do not own. If you need a change in someone else's file, say so in a ping (`ASK` or `CONTRACT`).
- **M3's features merge dark** behind flags, so M3 never waits for M1/M2 and the MVP is never put at risk.

## 2. Read first

Everyone: `README.md`, `docs/COMMUNICATION.md`, `docs/PROJECT.md`, `docs/API-CONTRACT.md`, your task file in `docs/TASKS/`, `docs/DECISIONS.md`.

- M1 also: `docs/FRONTEND-NEEDS.md`, `docs/ARCHITECTURE.md`, `docs/EXTRA-FEATURE-PLAN.md` (component interfaces).
- M2 also: `docs/ARCHITECTURE.md`, `docs/DATABASE-SCHEMA.md`, `docs/FRONTEND-NEEDS.md`, `docs/EXTRA-FEATURE-PLAN.md` (extension API).
- M3 also: `docs/EXTRA-FEATURE-PLAN.md`, `docs/ARCHITECTURE.md`, `docs/FRONTEND-NEEDS.md`, `docs/VERIFICATION/`.

If something you need is missing, mark it `TBD`, ask in a ping, and record an `ASSUMED:` line in your task file. Do not invent requirements, endpoints, fields, credentials or infrastructure.

## 3. Roles and ownership

- **M1:** MVP frontend (UI, client state, accessibility, responsive behavior, API consumption). Owns the extension slots and adapts M3's components into the real UI.
- **M2:** main MVP developer. Backend, business logic, data model, authentication/authorization, validation, backend tests, the API contract, the shared deployment.
- **M3:** extra features beyond the MVP (backend extension plus a basic working UI component each), initial repo setup through the planner agent, verification of own features, demo, pitch, end-to-end and security checks. M3 does not own MVP business logic. If an idea is actually needed for MVP acceptance, raise it with the team; do not silently take it.

| Path | Single writer | Notes |
|---|---|---|
| `frontend/` | M1 | M3's components are adapted into here by M1 |
| `backend/` | M2 | M2 provides one flag-guarded extension mount hook |
| `enhancements/` | M3 | |
| `docs/PROJECT.md` | M3 | Scope changes need a `DECISIONS` entry |
| `docs/ARCHITECTURE.md`, `docs/API-CONTRACT.md`, `docs/DATABASE-SCHEMA.md` | M2 | |
| `docs/FRONTEND-NEEDS.md` | M1 | |
| `docs/EXTRA-FEATURE-PLAN.md`, `docs/VERIFICATION/` | M3 | |
| `docs/TASKS/M1.md`, `M2.md`, `M3.md` | M1, M2, M3 | Each edits only their own |
| `docs/DECISIONS.md` | Anyone, append only | One entry per decision at the end of the file. On a conflict, keep both entries |
| `AGENTS.md`, `docs/COMMUNICATION.md`, `docs/AGENT-PROMPTS/` | M3 (template maintainer) | Change only through a `DECISIONS` entry |
| `shared/`, root config, `.env.example` | By agreement | Send an `FYI` ping before editing |

At setup only, the planner agent (run by M3) writes first drafts of M1's and M2's files. After the first push those files belong to their owners.

## 4. Setup phase

- Files written by the planner start with `Status: DRAFT v0` and an `Owner:` line. Unknowns are `TBD`.
- Owners review and correct their own files, then set `Status: Reconciled`. M2 pings `CONTRACT FREEZE v1` when the API contract and FRONTEND-NEEDS agree.
- Work that does not depend on unreconciled details (app shell, backend skeleton, extension hooks, mocks) can start right after the push. Do not wait for the freeze.

## 5. Contracts

- `docs/API-CONTRACT.md` is the agreement between M2 (producer) and M1 (consumer). Consumers build against mocks that match it.
- **Additive change** (new endpoint, new optional field): update the contract in the same commit as the code and send a `CONTRACT additive` ping. No approval needed.
- **Breaking change** (rename, remove, change a type, change an error format): send a `CONTRACT breaking` ping first. Do not merge until every affected consumer replies `ok` or a counter-proposal. M2 decides backend disputes, M1 decides UI disputes.
- After `CONTRACT FREEZE v1`, only additive changes are made without agreement.
- Never silently rename endpoints, fields, types, events or error formats. Keep mocks aligned with the contract.
- M3's extension endpoints live in the extension namespace defined in `docs/ARCHITECTURE.md` and are documented in `docs/EXTRA-FEATURE-PLAN.md`. They are additive by definition and need only an `FYI` ping.
- For external services, document configuration, cost, rate limits, failure behavior and fallback. Never hardcode secrets.

## 6. M3 feature flow (non-blocking)

1. **Standing approval.** The feature list is agreed on the planning call and recorded in `docs/EXTRA-FEATURE-PLAN.md`. That is approval for every `Selected` feature. M3 does not ask per feature.
2. **Merge dark.** Each feature has a flag `FEATURE_<EF-ID>`, default `off`. With the flag off, the MVP behaves exactly as if the feature did not exist.
3. **Additive only.** M3 works in `enhancements/`, uses the one backend mount hook and the named frontend slots agreed in `docs/ARCHITECTURE.md` and `docs/FRONTEND-NEEDS.md`, and never edits MVP files.
4. **Each feature is a vertical slice:** extension API, plus a UI component built as a *controller* (state, API calls, events, loading/empty/error states: the stable part), a *thin basic view* (about 100 lines, unstyled, replaceable), and a *sandbox page* with mock data. M3 does not try to match M1's design. See `enhancements/README.md`.
5. **Verification tiers:**

| Tier | Who | What | Gates |
|---|---|---|---|
| V0 | M3's builder agent and a separate verifier agent | Unit, edge and failure paths, UI behavior tests in the sandbox, flag-off regression | M3 starting the next feature |
| V1 | Automated | Contract tests against the mock and, when available, the shared deployment. MVP smoke test with flag off and on | M3 starting the next feature |
| V2 | M1 (UI adaptation) or M2, when pinged | 5-minute check in the real app from `docs/VERIFICATION/<EF-ID>.md`. For UI features, M1's agent adapts the view and re-runs the behavior tests | Turning the flag on. Never blocks M3 |

6. **Queue, don't wait.** When V0 and V1 pass, M3 sends `READY <EF-ID>` and starts the next feature immediately. At most 2 features may be awaiting V2. At the limit, M3 works the idle backlog in `docs/TASKS/M3.md`.
7. **Silence is not a blocker.** See response windows in `docs/COMMUNICATION.md`.
8. **Flag freeze.** At T-60 no flag changes. Only features with a passed V2 are on for the demo.
9. **M2 overload exception.** If M2 sends `OVERLOAD`, the team may hand M3 one named backend module through a `DECIDED` ping and a `DECISIONS` entry. M2 still owns the API shape. This is time-boxed and is the only way M3 takes MVP work.

## 7. M1: adapting M3's components

When M3 pings `READY <EF-ID>`: read `enhancements/<EF-ID>-*/UI-HANDOFF.md`. Keep the controller unchanged. Replace or restyle the view with the real design system. Keep the test ids and states. Mount it in the named slot behind the flag. Run the behavior tests from the handoff against the adapted view. Send `ADAPTED <EF-ID>`. If the controller must change, send `ASK M3`; do not edit it.

## 8. Git: shared `main` only

Do not create feature branches unless the team decides otherwise. Before starting:

```bash
git status
git pull --ff-only origin main
```

Work only in your owned files. Before committing:

```bash
git status
git diff
```

Stage only intended files, commit, then:

```bash
git pull --rebase origin main
git push origin main
```

- Small commits, pushed often. One logical change per commit. Contract changes go in the same commit as the code.
- Commit message prefix: `[M1]`, `[M2]`, or `[EF-XX]` for M3's features.
- Every ping includes the short commit hash.
- On a conflict, stop and ask the other member. Never run `git reset --hard`, `git push --force` or `--force-with-lease`. Avoid `git add .`. If unsure, `git rebase --abort` and ask.

## 9. Quality

- Run relevant tests, lint, type checks and build before reporting completion. Never claim tests passed that you did not run; say what you could not run and why.
- Test success, validation failure and error paths. Add tests for new logic and bug fixes.
- Security minimums: no secrets in the repo, use `.env` and keep `.env.example` to names and safe placeholders, hashed passwords, authorization on every protected route, input validation, rate limiting on public endpoints where practical.
- Prefer small, reviewable changes. Inspect existing code before replacing it. Explain new dependencies.

## 10. Task tracking

Every member keeps their own file in `docs/TASKS/` current. When several agents work for one member, one coordinator agent consolidates updates and the human confirms them. Never mark a task Done without verifying its acceptance criteria. Report blockers in a `BLOCKED` ping at once.

## 11. Completion report

End each piece of work with:
1. What was implemented
2. Files created or changed, and the commit hash
3. Interfaces, dependencies or configuration affected
4. Tests, build and lint commands run, with actual results
5. Known bugs, limitations, unverified assumptions
6. Action needed from another member
7. Features only: tier reached (V0/V1/V2), flag name and state, evidence path
8. `Message to send:` the ready-to-paste WhatsApp ping, in the standard format

## 12. Timeline

Cut line at T-90, feature and flag freeze at T-60, rehearsal on a clean clone at T-45, submission checks at T-15 (T is the submission deadline). Details in `docs/COMMUNICATION.md`.

## 13. Never

- Edit files you do not own, or bypass the contract change rules.
- Commit secrets, tokens, private data or local environment files.
- Start work that is not in your task file, or invent scope.
- Put required MVP logic in `enhancements/`.
- Turn a flag on before its V2 has passed.
