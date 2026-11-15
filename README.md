# Buildathon Team Template

A three-person team, each member working with AI agents (Google Antigravity).

| Member | Role | Owns |
|---|---|---|
| M1 | MVP frontend. Also adapts M3's feature components into the real UI | `frontend/`, `docs/FRONTEND-NEEDS.md` |
| M2 | MVP backend, business logic, data, API contract, shared deployment | `backend/`, `docs/API-CONTRACT.md`, `docs/DATABASE-SCHEMA.md`, `docs/ARCHITECTURE.md` |
| M3 | Extra features (backend extension plus a basic working UI component each), repo setup, verification, demo and pitch | `enhancements/`, `docs/EXTRA-FEATURE-PLAN.md`, `docs/PROJECT.md`, `docs/VERIFICATION/` |

M2 is the main MVP developer. M3 never owns missing MVP work.

## How the system works

1. **Files are the truth.** Contracts, schema, scope and tasks live in `docs/`.
2. **WhatsApp is the doorbell.** Short pings with a commit hash announce changes. Formats are in `docs/COMMUNICATION.md`. Details never live only in chat.
3. **One writer per file.** Ownership table in `AGENTS.md`. This is what prevents merge conflicts on the shared `main` branch.
4. **M3's features merge dark** behind flags (default off), so M3 never waits for M1/M2 and the MVP is never at risk.
5. **Every agent reads `AGENTS.md` and its role prompt first.** Each role prompt starts with a kickoff message to paste.

## Event workflow

| Phase | Who | What |
|---|---|---|
| 0. Planning call (20 to 30 min) | All | Fill the checklist below. Agree the stack, MVP features, M3's ranked features, deployment target. Confirm `D-000` in `docs/DECISIONS.md`. |
| 1. Repo setup | M3 | Copy this template to the project folder, create the repo, collaborators added. Run the planner agent (`docs/AGENT-PROMPTS/PLANNER.md`) with the planning-call inputs. It writes every file as `DRAFT v0`. |
| 2. Review and push | M3 | Review the "Review before push" list in `docs/PROJECT.md`, fix, push once, ping `FYI · repo ready`. |
| 3. Reconcile | M1, M2 | Clone, start agents with kickoff messages. M2 corrects contract, schema and architecture. M1 corrects frontend needs. Each pushes only their own files. M2 pings `CONTRACT FREEZE v1` (target: 60 min after the push). Foundation work starts immediately; it does not wait for the freeze. |
| 4. Parallel build | All | M1 builds screens against mocks. M2 builds the backend and deploys a walking skeleton early (`DEPLOYED`). M3 runs the feature loop and idle backlog. |
| 5. Finish | All | Cut line at T-90, feature and flag freeze at T-60, clean-clone rehearsal at T-45, submission checks at T-15. See `docs/COMMUNICATION.md`. |

## Planning call checklist (inputs for the planner)

- [ ] Problem statement and target users
- [ ] Tech stack (frontend, backend, database, hosting target) and any starter repo
- [ ] MVP must-have features (aim for 5 or fewer)
- [ ] M3's features, ranked, more than will fit. Include UI cost (S/M/L) for each
- [ ] Event length and submission deadline
- [ ] Who is M1/M2/M3 and confirmation that all three accept the protocol (`D-000`)

## Before the event (preparation)

- [ ] Template saved as a GitHub template repo. M1 and M2 pre-added as collaborators
- [ ] Antigravity set up and signed in on all three laptops
- [ ] Practice with 3 fake topics. Target: 15 minutes or less from topic to pushed repo
- [ ] A hosting target tested once, so M2 can deploy a skeleton quickly
- [ ] One WhatsApp group with the three members

## File map

```
README.md                      humans: workflow and setup
AGENTS.md                      all agents: rules, ownership, protocol
docs/COMMUNICATION.md          WhatsApp formats, windows, decision rights, timeline
docs/PROJECT.md                scope, acceptance criteria, demo script, pitch, checklist (M3)
docs/ARCHITECTURE.md           stack, run commands, env, hooks, shared environment (M2)
docs/API-CONTRACT.md           MVP API contract (M2)
docs/DATABASE-SCHEMA.md        data model (M2)
docs/FRONTEND-NEEDS.md         screens, data needs, states, slots (M1)
docs/EXTRA-FEATURE-PLAN.md     M3's features, interfaces, pipeline (M3)
docs/DECISIONS.md              append-only decision log
docs/TASKS/M1.md M2.md M3.md   each member's task list
docs/VERIFICATION/             per-feature evidence and V2 checklists (M3)
docs/AGENT-PROMPTS/            planner and role prompts with kickoff messages
frontend/ backend/ enhancements/ shared/
```

## Run locally

TBD. The planner or M2 fills this in `docs/ARCHITECTURE.md` after the stack is known. Do not invent commands before then.
