# UI Handoff: EF-01 Analytics Dashboard

For M1's agent. One page — read it, adapt the view, keep the controller.

- **Slot:** `analytics-dashboard-slot` (Committee / Admin Dashboard, from `docs/FRONTEND-NEEDS.md`)
- **Flag:** `FEATURE_EF_01` env var (default `off`; frontend: render null when flag is off)
- **Controller (do not change; `ASK M3` if it must):** `enhancements/EF-01-analytics/frontend/AnalyticsDashboard.tsx`
- **View (replace or restyle freely):** `enhancements/EF-01-analytics/frontend/AnalyticsView.tsx`
- **Sandbox (mock data, no backend needed):** `enhancements/EF-01-analytics/sandbox/SandboxApp.tsx`
- **Extension API used:**
  - `GET /api/ext/EF-01/summary?programmeId=:id` — returns aggregated metrics (participants, animal yield, payment progress, share capacity)
  - `GET /api/ext/EF-01/charts?type=:chartType&programmeId=:id` — returns chart datasets (`participant-distribution`, `weight-distribution`, `payment-velocity`, `registration-trend`, `all`)

## Props in

| Prop | Type | Meaning |
|---|---|---|
| `programmeId` | `number` | The active programme ID to render telemetry for |
| `initialSummary` | `AnalyticsSummaryResult` (optional) | Preloaded summary data (e.g. from SSR/TanStack Query) |
| `initialCharts` | `AllChartsData` (optional) | Preloaded chart datasets |

## Events out

None (Self-contained telemetry component).

## States to render

| State | `data-testid` | What the user sees |
|---|---|---|
| `loading` | `ef01-loading` | Spinner / animated skeleton indicators while telemetry loads |
| `empty` | `ef01-empty` | "No Analytics Available Yet" message when programme has 0 participants and 0 animals |
| `error` | `ef01-error` | Error message and retry button |
| `success` | `ef01-content` | 4 summary metric cards and interactive chart view tabs |

## Test ids / roles to keep

| id | Element |
|---|---|
| `ef01-analytics-dashboard` | Root container element |
| `ef01-loading` | Loading state indicator |
| `ef01-empty` | Empty state placeholder |
| `ef01-error` | Error state alert |
| `ef01-retry-btn` | Retry button inside error state |
| `ef01-content` | Success state main container |
| `ef01-refresh-btn` | Telemetry refresh button |
| `ef01-metric-participants` | Total and status-wise participant metric card |
| `ef01-metric-weight` | Animal weight yield, average, and count metric card |
| `ef01-metric-payments` | Payment collection progress and completion rate card |
| `ef01-metric-shares` | Animal share allocation capacity and utilization card |
| `ef01-chart-participants` | Participant distribution by ward/locality breakdown |
| `ef01-chart-weights` | Animal yield weight distribution histogram |
| `ef01-chart-payments` | Payment velocity daily and cumulative timeseries |
| `ef01-chart-trend` | Participant registration inflow rate table |

## Adaptation checklist

- [ ] Controller untouched (`AnalyticsDashboard.tsx` state management, fetch hooks, error handling)
- [ ] View restyled with the design system tokens (`--lime`, `--cobalt`, `--coral`, shadcn/ui primitives)
- [ ] All 4 states present: loading, empty, error, success
- [ ] All `data-testid` attributes preserved
- [ ] Mounted in `analytics-dashboard-slot` behind `FEATURE_EF_01` flag; renders `null` when flag is absent or disabled
- [ ] Behavior tests pass on the adapted view (see `docs/VERIFICATION/EF-01.md` V2)
- [ ] `ADAPTED EF-01` ping sent

## Known limitations

- Telemetry aggregates data within the single programme specified by `programmeId`.
- Weight yield distribution divides animals into 5 standardized brackets (<250kg, 250-299kg, 300-349kg, 350-399kg, ≥400kg).
- Animal capacity calculations adhere to the canonical 7 shares per cattle/buffalo standard rule.
