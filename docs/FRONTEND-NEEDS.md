# Frontend Needs

Status: DRAFT v0 · Owner: M1 · Reconciled with M2 via `docs/API-CONTRACT.md`

> Planner: draft screens and data needs from the MVP features. M1 corrects after the push; M1 owns this file from then on.

The consumer's side of the contract. M2 compares it against `docs/API-CONTRACT.md` to catch mismatches in the first hour.

## 1. UI stack and design direction
- **Framework and component library:** React 18, Vite, TypeScript, Tailwind CSS, Lucide React icons, Radix UI primitives.
- **Design direction (colors, fonts, feel):** Clean, accessible Islamic civic aesthetic. Emerald green primary, warm slate neutrals, crisp typography (Inter), responsive mobile/tablet first for volunteer field screens.

## 2. Screens

| Screen | Purpose | Endpoints used (API IDs) | Fields needed | States to handle |
|---|---|---|---|---|
| Committee Dashboard (`/`) | High-level metrics, progress bars, recent activities | API-001 | totalParticipants, totalAnimals, progress percentages, paymentsSummary | loading, empty, error, success |
| Programme Setup (`/programme`) | Configure annual programme dates, price, limits | API-002, API-003 | year, startDate, endDate, registrationLimit, pricePerAnimal | loading, empty, error, success |
| Households & Participants (`/households`) | Import CSV, manage households, register participants | API-004, API-005, API-006, API-007, API-008 | address, contactName, contactPhone, participants list, status | loading, empty, error, success |
| Animal Group & Allocation (`/animals`) | Manage animal groups, tag numbers, assign shares | API-009, API-010, API-011, API-012 | groupName, species, tagNumber, weight, participantId, policyApplied | loading, empty, error, success |
| Finance & Payments (`/finance`) | Record payments, view balance sheets | API-013, API-014 | participantId, amountCents, method, paidAt, outstandingCents | loading, empty, error, success |
| Volunteer Operations (`/operations`) | Volunteer task assignment and live status updates | API-015, API-016, API-017, API-018 | volunteerName, department, taskType, taskStatus | loading, empty, error, success |
| Meat Distribution (`/distribution`) | Manage recipient allocations and collection tracking | API-019, API-020 | recipientHousehold, quantityKg, status (ALLOCATED, PACKED, COLLECTED) | loading, empty, error, success |
| Public Information (`/public`) | Public portal with dates, FAQs, high-level stats | API-021, API-022 | publicStats, guidelines, schedule, contact | loading, empty, error, success |
| Reports & Exports (`/reports`) | Generate and download CSV/PDF summaries | API-024 | reportType, dateRange, downloadUrl/stream | loading, empty, error, success |

## 3. Mismatches to resolve with M2

| Need | Missing or different in contract | Raised in ping | Status |
|---|---|---|---|
| Batch allocation API | API-011 handles single allocation; need batch endpoint if volume is high | CONTRACT additive | Proposed |

## 4. Extension slots (M3's features mount here)

M1 builds the slots early, empty and flag-guarded, and keeps their names stable.

| Slot name | Screen and location | Props the host provides | Feature that mounts here | Frontend flag mechanism |
|---|---|---|---|---|
| `analytics-dashboard-slot` | Committee Dashboard page (bottom section) | `{ programmeId: number }` | EF-01 | `VITE_FEATURE_EF_01 === 'on'` |
| `smart-allocation-slot` | Allocation page (action toolbar) | `{ programmeId: number, onAllocate: () => void }` | EF-02 | `VITE_FEATURE_EF_02 === 'on'` |
| `financial-intelligence-slot` | Finance Dashboard page (bottom) | `{ programmeId: number }` | EF-03 | `VITE_FEATURE_EF_03 === 'on'` |
| `operational-intelligence-slot` | Operations Dashboard page (bottom) | `{ programmeId: number }` | EF-04 | `VITE_FEATURE_EF_04 === 'on'` |
| `household-intelligence-slot` | Household Management page (sidebar) | `{ programmeId: number }` | EF-05 | `VITE_FEATURE_EF_05 === 'on'` |

## 5. Mocks
- **Mock location:** `frontend/src/mocks/` with handlers matching `docs/API-CONTRACT.md` (using MSW or lightweight fetch interceptor).

## 6. Open questions

| Question | For | Status |
|---|---|---|
| Will volunteers use mobile devices offline during slaughter? | M2 / M3 | Initial MVP assumes online; offline cache is stretch |
| Preferred charting library for analytics (Chart.js or Recharts)? | M1 | Open (propose Recharts) |
