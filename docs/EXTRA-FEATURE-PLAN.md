# M3 Extra-Feature Plan

Status: DRAFT v0 · Owner: M3

Features beyond the MVP, built and verified in parallel by M3. The MVP must work without any of them.

**Sign-off:** agreed on the planning call by M1 [ ] M2 [ ] M3 [ ]. This is the one-time standing approval for every `Selected` feature. M3 does not ask again per feature.

## 1. Selection criteria
User value and relevance to the problem, demo impact, feasibility in the time available, **UI cost (S/M/L)**, dependencies on M1/M2/data/external services, integration risk, cost and rate limits. Do not choose a feature only because it uses AI, maps or another fashionable technology; it must solve a real user problem and be demonstrable. Prefer features whose UI is a panel, card or form.

## 2. Candidates (ranked, more than will fit)

| ID | Idea | User value | Demo impact | Feasibility | UI cost | Risk | Decision |
|---|---|---|---|---|---|---|---|
| EF-01 | Analytics Dashboard | High – gives committee historical trends & live metrics | High – visual charts in demo | High | M | Low | Selected |
| EF-02 | Smart Allocation Engine | Medium – auto-assigns animal shares with constraints | Medium – shows allocation optimization | Medium | M | Medium | Selected |
| EF-03 | Financial Intelligence (auto-categorise expenses) | Medium – reduces manual bookkeeping | Medium – displays expense breakdowns | Medium | S | Low | Selected |
| EF-04 | Operational Intelligence (bottleneck detection) | Medium – highlights slaughter/processing delays | Medium – live warning badges | Medium | S | Low | Optional |
| EF-05 | Household Intelligence (duplicate detection) | Low – cleans participant records | Low – shows duplicate warnings | High | S | Low | Optional |

Decision values: `Selected`, `Optional`, `Rejected`. Priority: P1 best value, P2 if time remains, P3 stretch.

## 3. Selected features

### EF-01: Analytics Dashboard
- **Priority / status:** P1 · Selected
- **Problem and target user:** Committee admins lack deep analytical insights into multi-year registration growth, animal yield averages, and payment completion velocity.
- **Why it is beyond the MVP:** The MVP provides basic operational counts; this feature adds trend analytics, yield distribution curves, and interactive visualizations.
- **Expected behavior and acceptance criteria:** Renders interactive charts showing participant distribution by ward/neighbourhood, animal weight distribution, and payment collection velocity over time.
- **Backend extension:**
  - `GET /api/ext/EF-01/summary?programmeId=:id` -> returns aggregated analytics metrics.
  - `GET /api/ext/EF-01/charts?type=:chartType&programmeId=:id` -> returns timeseries / category dataset.
- **UI component:**
  - Slot: `analytics-dashboard-slot` (from `docs/FRONTEND-NEEDS.md`)
  - Props in: `{ programmeId: number }`
  - Events out: none
  - States: loading, empty, error, success
  - Test ids or roles: `data-testid="ef01-analytics-dashboard"`
- **Flag:** `FEATURE_EF_01` (default off)
- **External services:** None (aggregates existing PostgreSQL data)
- **V0 / V1 tests:** Unit tests for analytics aggregation queries; sandbox render test with mock dataset.
- **V2 check (5 minutes or less):** Open Committee Dashboard with `FEATURE_EF_01=on`. Visual charts render with synthetic data; toggle flag off, slot disappears cleanly.
- **Rollback:** Set `FEATURE_EF_01=off`. No schema mutations or data side effects.
- **Fallback if unfinished:** Hide slot; dashboard displays standard MVP summary counters.
- **Effort / UI cost:** M

---

### EF-02: Smart Allocation Engine
- **Priority / status:** P1 · Selected
- **Problem and target user:** Committee volunteers spend hours manually pairing 7 participant shares per cattle/buffalo while respecting preferences and group affinities.
- **Why it is beyond the MVP:** The MVP supports manual 1-by-1 allocation; this auto-solves the knapsack/constraint matching problem across all unassigned participants.
- **Expected behavior and acceptance criteria:** One-click algorithm groups unassigned participants into available animal shares matching preferred day/time and household groupings without leaving fractional orphan slots.
- **Backend extension:**
  - `POST /api/ext/EF-02/optimize` -> accepts `{ programmeId: number, policy: string }`, returns proposed allocations preview.
  - `POST /api/ext/EF-02/commit` -> commits proposed allocations to the database.
- **UI component:**
  - Slot: `smart-allocation-slot` (from `docs/FRONTEND-NEEDS.md`)
  - Props in: `{ programmeId: number, onAllocate: () => void }`
  - Events out: `onAllocateComplete`
  - States: idle, processing, review_preview, success, error
  - Test ids or roles: `data-testid="ef02-smart-allocation-btn"`
- **Flag:** `FEATURE_EF_02` (default off)
- **External services:** None
- **V0 / V1 tests:** Algorithmic test ensuring no animal exceeds 7 shares and no participant is allocated twice; sandbox UI flow test.
- **V2 check (5 minutes or less):** Navigate to Allocations page, click "Run Smart Allocation", inspect proposed distribution preview, confirm.
- **Rollback:** Set `FEATURE_EF_02=off`. Allocations table remains intact.
- **Fallback if unfinished:** Rely entirely on MVP manual allocation.
- **Effort / UI cost:** M

---

### EF-03: Financial Intelligence
- **Priority / status:** P2 · Selected
- **Problem and target user:** Committee accountants and volunteers face tedious manual bookkeeping and reconciliation errors across participant collections, payment installments, and operational expenses.
- **Why it is beyond the MVP:** The MVP provides basic payment record keeping; this feature adds heuristic expense auto-categorisation, automated financial anomaly detection (duplicate references/amounts, orphan payments, allocated underpayments), and comprehensive revenue-expense reconciliation summaries.
- **Expected behavior and acceptance criteria:** Admin dashboard renders financial reconciliation overview (revenues, expenses, surplus/deficit) and anomaly alert badges; auto-categorises expenses across 8 standard categories with confidence scores.
- **Backend extension:**
  - `GET /api/ext/EF-03/summary?programmeId=:id` -> financial reconciliation overview and category breakdown.
  - `POST /api/ext/EF-03/categorise` -> auto-categorises operational expenses with confidence scoring.
  - `GET /api/ext/EF-03/anomalies?programmeId=:id` -> flags payment discrepancies, duplicate records, and orphan contributions.
  - `GET /api/ext/EF-03/categories` -> supported operational expense categories.
- **UI component:**
  - Slot: `financial-intelligence-slot` (from `docs/FRONTEND-NEEDS.md`)
  - Props in: `{ programmeId: number, initialSummary?: FinancialSummaryResult, initialAnomalies?: FinancialAnomaly[] }`
  - Events out: none
  - States: loading, empty, error, success
  - Test ids: `data-testid="ef03-financial-intelligence"`
- **Flag:** `FEATURE_EF_03` (default off)
- **External services:** None
- **V0 / V1 tests:** Unit tests for auto-categorisation keywords and anomaly detection algorithms; integration tests for flag gating and fail-closed admin guard.
- **V2 check (5 minutes or less):** Open Finance Dashboard with `FEATURE_EF_03=on`; inspect metric cards, anomaly alerts, test auto-categoriser form; toggle flag off, slot disappears cleanly.
- **Rollback:** Set `FEATURE_EF_03=off`. Stateless analytical reads; zero database mutations.
- **Fallback if unfinished:** Hide slot; dashboard displays standard MVP payment summaries.
- **Effort / UI cost:** S

## 4. Pipeline

| Feature | Stage (Building / V0 / V1 / Awaiting V2 / V2 passed / Flag on) | Flag state | Evidence |
|---|---|---|---|
| EF-01 | Awaiting Review (V0+V1 passed) | off | `docs/VERIFICATION/EF-01.md` |
| EF-02 | Awaiting V2 | off | `docs/VERIFICATION/EF-02.md` |
| EF-03 | Ready for Review (V0+V1 Passed) | off | `docs/VERIFICATION/EF-03.md` |

Limit: 2 features in `Awaiting V2`.
