# Architecture

Status: DRAFT v0 · Owner: M2

> Planner: fill from the planning-call stack. Inspect any starter project before writing commands; otherwise leave `TBD`.

## 1. Stack
- **Application type:** TBD
- **Frontend:** TBD
- **Backend:** TBD
- **Database:** TBD
- **External services:** TBD
- **Hosting / shared environment:** TBD

## 2. Repository map (actual)

| Path | Purpose | Owner |
|---|---|---|
| `frontend/` | TBD (record the real path if the starter differs) | M1 |
| `backend/` | TBD | M2 |
| `enhancements/` | M3 feature modules | M3 |
| `shared/` | Shared types or clients, only if needed | By agreement |

## 3. Request and data flow
TBD

## 4. Extension hooks (set up once; M3's features use them)
- **Backend mount hook:** one place in `backend/` that loads enhancement modules, guarded by flags. M2 builds it early. TBD
- **Extension namespace:** TBD (for example a route prefix per feature: `/api/ext/<EF-ID>/...`).
- **Frontend slots:** named in `docs/FRONTEND-NEEDS.md`. M1 builds them early.
- **Flag mechanism:** `FEATURE_<EF-ID>` environment variables, default `off`. Frontend equivalent: TBD (depends on the stack).

## 5. Shared environment
- **URL:** TBD (posted in a `DEPLOYED` ping)
- **How to deploy:** TBD
- **Seed/demo data command:** TBD

## 6. Local development
- Prerequisites: TBD · Install: TBD · Configure env: TBD · Run: TBD · Test: TBD

## 7. Environment variables

| Variable | Used by | Required | Description | Safe example |
|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD |

Never include real secrets.

## 8. Scalability notes (for the pitch)
TBD
