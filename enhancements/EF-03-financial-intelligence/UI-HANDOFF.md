# UI Handoff: EF-03 Financial Intelligence

For M1's agent. One page — read it, adapt the view, keep the controller.

- **Slot:** `financial-intelligence-slot` (Finance & Committee Dashboards, from `docs/FRONTEND-NEEDS.md`)
- **Flag:** `FEATURE_EF_03` (frontend: `VITE_FEATURE_EF_03 === 'off'` renders null; backend returns 403 when off)
- **Controller (do not change; `ASK M3` if it must):** `enhancements/EF-03-financial-intelligence/frontend/FinancialIntelligencePanel.tsx`
- **View (replace or restyle freely):** The JSX return value inside `FinancialIntelligencePanel.tsx`
- **Sandbox (mock data, no backend needed):** `enhancements/EF-03-financial-intelligence/sandbox/SandboxApp.tsx`
- **Extension API used:**
  - `GET /api/ext/EF-03/summary?programmeId=:id` — financial reconciliation overview (expected/collected revenue, outstanding, categorised expenses, net balance, surplus indicator)
  - `GET /api/ext/EF-03/anomalies?programmeId=:id` — flags discrepancies, duplicate payments/references, unlinked contributions, underpayments with allocation
  - `POST /api/ext/EF-03/categorise` — auto-categorises expenses based on category heuristics & keywords
  - `GET /api/ext/EF-03/categories` — list of supported expense categories and metadata

## Props in

| Prop | Type | Meaning |
|---|---|---|
| `programmeId` | `number` | The active programme ID to inspect and reconcile |
| `initialSummary` | `FinancialSummaryResult` (optional) | Preloaded financial reconciliation summary |
| `initialAnomalies` | `FinancialAnomaly[]` (optional) | Preloaded financial anomalies list |
| `apiBaseUrl` | `string` (optional) | Base URL for API calls (defaults to `/api/ext/EF-03`) |
| `authToken` | `string` (optional) | Bearer token for authorization if called outside standard session |

## Events out

None (Self-contained financial reconciliation and categorisation panel).

## States to render

| State | `data-testid` | What the user sees |
|---|---|---|
| `loading` | `ef03-loading` | Spinner / animated skeleton while reconciliation telemetry loads |
| `empty` | `ef03-empty` | "No Financial Records Found" placeholder when programme has 0 participants and 0 allocations |
| `error` | `ef03-error` | Error alert banner with retry button |
| `success` | `ef03-content` | Overview metric cards, category breakdown, anomaly alert list, and interactive expense categoriser |

## Test ids / roles to keep

| id | Element |
|---|---|
| `ef03-financial-intelligence` | Root container element |
| `ef03-loading` | Loading state indicator |
| `ef03-empty` | Empty state placeholder |
| `ef03-error` | Error state alert |
| `ef03-retry-btn` | Retry button inside error state |
| `ef03-content` | Success state main container |
| `ef03-tab-overview` | Financial Overview tab button |
| `ef03-tab-anomalies` | Anomaly Detection tab button (includes badge counter) |
| `ef03-tab-categoriser` | Auto-Categoriser tab button |
| `ef03-refresh-btn` | Telemetry refresh button |
| `ef03-metric-revenue` | Expected revenue metric card |
| `ef03-metric-collected` | Collected revenue metric card |
| `ef03-metric-outstanding` | Outstanding pending revenue metric card |
| `ef03-metric-net` | Net surplus/deficit metric card |
| `ef03-anomalies-list` | Container listing all flagged anomalies |
| `ef03-anomaly-item` | Individual anomaly card with severity badge and remediation instructions |
| `ef03-categoriser-form` | Interactive expense categoriser input form |
| `ef03-categoriser-submit` | Auto-categorise submit button |
| `ef03-categorised-results` | Categorised expense results preview container |

## Adaptation checklist

- [ ] Controller untouched (`FinancialIntelligencePanel.tsx` state management, fetch hooks, error handling)
- [ ] View restyled with the design system tokens (`--lime`, `--cobalt`, `--coral`, shadcn/ui primitives)
- [ ] All 4 states present: loading, empty, error, success
- [ ] All `data-testid` attributes preserved
- [ ] Mounted in `financial-intelligence-slot` behind `FEATURE_EF_03` flag; renders `null` when flag is absent or disabled
- [ ] Behavior tests pass on the adapted view (see `docs/VERIFICATION/EF-03.md` V2)
- [ ] `ADAPTED EF-03` ping sent

## Known limitations

- Monetary figures adhere to integer minor units (1 INR = 100 minor units).
- Expense auto-categorisation classifies entries across 8 operational categories: Animal Purchase, Feed & Fodder, Slaughter & Dressing, Packaging & Consumables, Logistics & Transport, Waste & Sanitation, Admin & Communication, and Miscellaneous.
- Anomaly detector identifies duplicate references, duplicate amounts for identical participants, underpaid allocated shares, overpayments, non-standard installment sizes, and orphan payments.
