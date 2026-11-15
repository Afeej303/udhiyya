# Communication Protocol

**Files are the truth. WhatsApp is the doorbell.** Chat says "go look"; the file says what to look at.

## What goes where

| In a file | In WhatsApp |
|---|---|
| Contracts, schema, scope, tasks, decisions, verification evidence | Signals ("I pushed X"), questions, blockers, quick decisions |

If it matters an hour from now, it belongs in a file (one line is enough). Never leave a contract detail only in chat.

Agents have no WhatsApp. Each agent ends its report with a `Message to send:` block. When a human pastes an incoming ping, the agent pulls and reads the referenced commit and files.

## Message formats

Start every ping with a tag. Include the short commit hash whenever code or docs changed. Maximum 3 lines.

| Tag | Use | Format |
|---|---|---|
| `READY` | Work is ready for the next person | `READY <ID> · <hash> · <what to check or do> · ~<minutes>` |
| `ADAPTED` | M1 finished adapting a feature | `ADAPTED <EF-ID> · <hash> · slot <name> · tests pass/fail` |
| `CONTRACT` | Any contract change | `CONTRACT additive/breaking/FREEZE v1 · <file> · <what> · <hash>` |
| `DEPLOYED` | Shared environment updated | `DEPLOYED <url> · <hash> · <what is live>` |
| `ASK` | A question | `ASK M2 · <question> · need by <time>` |
| `BLOCKED` | Cannot progress | `BLOCKED · need <thing> from <M#> · meanwhile <what you do>` |
| `DECIDED` | A decision was made | `DECIDED · <decision> · by <M#> · logged D-<n>` |
| `FYI` | Everything else | `FYI · <what> · <hash>` |
| `OVERLOAD` | Falling behind, need help | `OVERLOAD · <what is slipping> · propose <handoff>` |

Examples:
```
READY EF-02 · a41c9d2 · mount slot "dashboard-side", flag on · ~5 min
CONTRACT additive · docs/API-CONTRACT.md · GET /orders now returns status · 7be03f1
BLOCKED · need POST /login shape from M2 · meanwhile building screens on mocks
```
A thumbs-up reply means `ok`.

## Response windows

| Ping | If no reply |
|---|---|
| `READY` / `ADAPTED` (V2 checks) | After 20 minutes the sender continues. The item stays queued. |
| `ASK` / `BLOCKED` | After 10 minutes proceed on your best assumption. Record an `ASSUMED:` line in your task file. |
| `CONTRACT additive` / `FYI` | No reply needed. |
| `CONTRACT breaking` | Every affected consumer must reply `ok` or a counter within 10 minutes. No merge until they do. Unresolved: M2 decides backend contracts, M1 decides UI. |

Only changes to existing MVP contracts or MVP-owned files can block M3.

## Decision rights

| Topic | Decides |
|---|---|
| Backend, API, data model, deployment | M2 |
| Frontend structure, UI, slots | M1 |
| M3 features (inside their flags), demo, pitch | M3 |
| Scope, or anything that crosses roles | Quick majority vote, within 5 minutes. Log it in `docs/DECISIONS.md` |

## Contract freeze

Contracts start as `DRAFT v0`. After M1 and M2 reconcile, M2 pings `CONTRACT FREEZE v1` (target: 60 minutes after the repo push). After the freeze, only additive changes without agreement.

## Event timeline (T = submission deadline)

| When | What |
|---|---|
| Start | Planning call, 20 to 30 minutes |
| +30 to +45 min | M3 pushes the drafted repo |
| Push +60 min | Contract freeze target |
| Push +90 min | M2's first shared deployment (`DEPLOYED`, a walking skeleton) |
| T-90 | **Cut line.** List what is in the demo. Everything unfinished is flagged off or removed |
| T-60 | **Freeze.** Features and flags frozen, bug fixes only |
| T-45 | **Rehearsal** on a clean clone against the shared URL, with demo data |
| T-15 | Submission checks: README run steps, demo data, pitch ready |

Scale these to the real event length.

## Falling behind

Anyone who is slipping sends `OVERLOAD` early. For M2, the team may hand M3 a named backend module (see `AGENTS.md`, M2 overload exception). Cut scope before cutting quality.

## Dropped on purpose

Scheduled checkpoints (replaced by `READY` pings), handoff documents (replaced by pings plus commit hashes), a separate integration status file (folded into task files), per-feature approvals (replaced by one planning-call sign-off).
