# M3 Extra-Feature Plan

Status: DRAFT v0 · Owner: M3

Features beyond the MVP, built and verified in parallel by M3. The MVP must work without any of them.

**Sign-off:** agreed on the planning call by M1 [ ] M2 [ ] M3 [ ]. This is the one-time standing approval for every `Selected` feature. M3 does not ask again per feature.

## 1. Selection criteria
User value and relevance to the problem, demo impact, feasibility in the time available, **UI cost (S/M/L)**, dependencies on M1/M2/data/external services, integration risk, cost and rate limits. Do not choose a feature only because it uses AI, maps or another fashionable technology; it must solve a real user problem and be demonstrable. Prefer features whose UI is a panel, card or form.

## 2. Candidates (ranked, more than will fit)

| ID | Idea | User value | Demo impact | Feasibility | UI cost | Risk | Decision |
|---|---|---|---|---|---|---|---|
| EF-01 | TBD | H/M/L | H/M/L | H/M/L | S/M/L | TBD | Proposed |

Decision values: `Selected`, `Optional`, `Rejected`. Priority: P1 best value, P2 if time remains, P3 stretch.

## 3. Selected features

### EF-XX: [Name]
- **Priority / status:** P1 · Selected
- **Problem and target user:** TBD
- **Why it is beyond the MVP:** TBD
- **Expected behavior and acceptance criteria:** TBD
- **Backend extension:** endpoints in the extension namespace (method, path, request, response, errors), data stored. TBD
- **UI component:**
  - Slot: TBD (from `docs/FRONTEND-NEEDS.md`)
  - Props in: TBD
  - Events out: TBD
  - States: loading, empty, error, success
  - Test ids or roles: TBD
- **Flag:** `FEATURE_EF_XX` (default off)
- **External services:** setup, cost, rate limits, failure behavior, fallback. TBD
- **V0 / V1 tests:** TBD
- **V2 check (5 minutes or less):** exact steps and expected result. TBD
- **Rollback:** set the flag off. Data side effects: TBD
- **Fallback if unfinished:** TBD
- **Effort / UI cost:** TBD

## 4. Pipeline

| Feature | Stage (Building / V0 / V1 / Awaiting V2 / V2 passed / Flag on) | Flag state | Evidence |
|---|---|---|---|
| EF-XX | Building | off | `docs/VERIFICATION/EF-XX.md` |

Limit: 2 features in `Awaiting V2`.
