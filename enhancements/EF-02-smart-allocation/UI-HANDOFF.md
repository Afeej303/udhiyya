# UI Handoff: EF-02 Smart Allocation Engine

For M1's agent. One page — read it, adapt the view, keep the controller.

- **Slot:** `smart-allocation-slot` (Allocations page, from `docs/FRONTEND-NEEDS.md`)
- **Flag:** `FEATURE_EF_02` env var (default `off`; frontend: render null when flag is off)
- **Controller (do not change; `ASK M3` if it must):** `enhancements/EF-02-smart-allocation/frontend/SmartAllocationPanel.tsx`
- **View (replace or restyle freely):** The JSX return value inside `SmartAllocationPanel.tsx`
- **Sandbox (mock data, no backend needed):** `enhancements/EF-02-smart-allocation/sandbox/SandboxApp.tsx`
- **Extension API used:**
  - `POST /api/ext/EF-02/optimize` — returns allocation preview
  - `POST /api/ext/EF-02/commit` — persists confirmed allocations

## Props in

| Prop | Type | Meaning |
|---|---|---|
| `programmeId` | `number` | The active programme to allocate for |
| `onAllocate` | `() => void` (optional) | Called when user clicks Run Smart Allocation |
| `onAllocateComplete` | `(result: CommitResult) => void` (optional) | Called after successful commit |

## Events out

| Event | Payload | When |
|---|---|---|
| `onAllocate` | — | User clicks "Run Smart Allocation" button |
| `onAllocateComplete` | `{ committed, skipped, programmeId }` | Commit succeeds |

## States to render

| State | `data-testid` | What the user sees |
|---|---|---|
| `idle` | `ef02-smart-allocation-panel` | Policy selector + "Run Smart Allocation" button |
| `processing` | `ef02-loading` | Spinner or loading text |
| `review_preview` | `ef02-preview`, `ef02-preview-table` | Allocation table (participant → animal tag, share #); Confirm + Cancel buttons |
| `committing` | `ef02-committing` | Saving indicator |
| `success` | `ef02-success` | Committed count, "Run Again" button |
| `error` | `ef02-error` | Error message, "Retry" button |

## Test ids / roles to keep

| id | Element |
|---|---|
| `ef02-smart-allocation-panel` | Root container |
| `ef02-smart-allocation-btn` | "Run Smart Allocation" button |
| `ef02-policy-select` | Policy dropdown |
| `ef02-loading` | Loading indicator |
| `ef02-preview` | Preview section |
| `ef02-preview-table` | Allocation results table |
| `ef02-commit-btn` | "Confirm & Commit" button |
| `ef02-cancel-btn` | "Cancel" button |
| `ef02-committing` | Saving indicator |
| `ef02-success` | Success message |
| `ef02-reset-btn` | "Run Again" button |
| `ef02-error` | Error message |
| `ef02-retry-btn` | "Retry" button |

## Adaptation checklist

- [ ] Controller untouched
- [ ] View restyled with the design system; all 6 states present (idle, processing, review_preview, committing, success, error)
- [ ] All `data-testid` attributes preserved
- [ ] Mounted in `smart-allocation-slot` behind `FEATURE_EF_02` flag; flag off renders `null`
- [ ] Behavior tests pass on the adapted view (see `docs/VERIFICATION/EF-02.md` V2)
- [ ] `ADAPTED EF-02` ping sent

## Known limitations

- The commit step is irreversible at the UI level (allocations persist in the DB). Rolling back requires setting `FEATURE_EF_02=off` — existing allocations remain.
- The optimizer is greedy (first-fit). It does not guarantee optimal share distribution when animal counts are low.
- `household_first` policy relies on Prisma ordering; validate sort order against the real DB if behavior differs from the sandbox mock.
