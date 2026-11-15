# Frontend Needs

Status: RECONCILED v1 · Owner: M1 · Scope: Organisation Onboarding, Annual Programme Setup, Public Programme Page
Baseline contract: commit `33a7555` · Field conventions confirmed: Decision `D-003` (commit `d432451`) · Last updated: 2026-11-15

## 1. UI stack, design direction, and confirmed conventions

- **Framework:** React 19 + Vite (Client-side SPA) + TanStack Router (code-based routing tree).
- **Component library:** shadcn/ui (Radix primitives) + Tailwind CSS v4 with OKLCH design tokens.
- **Design reference:** `canvas-saas-suite` (commit in that repo). Design is approved; it must not be altered. All screens here port that design into `frontend/`.
- **Design tokens:** `--lime` (primary), `--coral`, `--cobalt`, `--sun`, `--ink`, `--ink-soft`. Fonts: Bricolage Grotesque (display), Geist (body), Geist Mono.
- **Icons:** Lucide React.
- **Forms:** React Hook Form + Zod.
- **Data fetching:** TanStack Query (`useQuery` / `useMutation`) with the dual-mode API client described in Section 5.
- **Toasts:** Sonner.

### Confirmed field conventions (D-003):
1. **Endpoint Identification:** Identified strictly by HTTP method + path (e.g. `GET /platform/organisations`), never legacy IDs.
2. **Opaque string IDs:** All entity identifiers (`id`, `orgId`, `programmeId`, `registrationId`, `householdId`) are treated as opaque strings.
3. **Date fields:** Standard ISO 8601 UTC strings (`registrationOpensAt`, `registrationClosesAt`).
4. **Money structure:** `{ amountMinor: number, currency: "INR" }` in integer minor units (paise, so `250000 amountMinor = ₹2500.00`).
5. **Quantity & weight:** Integer grams for all inventory and distribution records (`quantityGrams: number`).
6. **Distribution lifecycle:** Ordered states: `draft` → `confirmed` → `packed` → `collected` | `delivered`.
7. **Cancellation action:** Uses the documented committee action (`POST /registrations/:id/decision` with `{ action: "cancel" }` and `POST /distribution/allocations/:id/transition` with `{ action: "cancel" }`).
8. **Reports & Exports:** Formats supported are strictly `format=xlsx|pdf` (via `GET /reports/:kind/export?format=xlsx|pdf`).
9. **Batch allocation:** Proposed additive only; not implemented. Single share allocation (`POST /organisations/:orgId/programmes/:programmeId/share-allocations`) is used.

---

## 2. Screens — Scope: Organisation Onboarding (SA02–SA04)

> These screens are inside the Super Admin portal. The signed-in user must have `role: "super_admin"`. All requests carry `Authorization: Bearer <supabase_token>`.

---

### SA02 — Organisation List

**Purpose:** Super Admin views all organisations, searches, filters by status, and initiates new-org creation.

**Endpoint:** `GET /platform/organisations?search=&cursor=&limit=25`

**Expected response:**
```json
{
  "items": [
    {
      "id": "org_demo",
      "name": "Example Mahallu",
      "locality": "Example Town",
      "contact": { "email": "office@example.test" },
      "status": "onboarding"
    }
  ],
  "nextCursor": null
}
```

**Fields displayed per row:** `id`, `name`, `locality`, `status`
**Private fields not displayed:** `contact.email` (show only on SA03 detail)

**States:**
| State | UI behaviour |
|---|---|
| Loading | Skeleton rows (3–5), search bar disabled |
| Empty (no orgs) | "No organisations yet. Create the first one." + Create button |
| Empty (search miss) | "No organisations match your search." + Clear button |
| Error (network/5xx) | "Could not load organisations. Try again." + Retry button |
| Success | Paginated list with status badges; next-page button when `nextCursor` is non-null |

**Status badge values:** `onboarding` → amber, `active` → green, `suspended` → red, `closed` → grey. These must derive from the API value, not be hardcoded labels.

**Navigation:**
- Clicking a row → `SA03` (organisation detail, URL param `:orgId`)
- "Create Organisation" button → opens multi-step modal (see SA02-CREATE below)

---

### SA02-CREATE — New Organisation (3-step modal)

**Step 1 — Organisation details**
- `POST /platform/organisations` with `{ name, locality, contact: { email } }`
- Expected 201: organisation object with `status: "onboarding"`

**Step 2 — Invite Committee Admin**
- `POST /platform/organisations/:orgId/invitations` with `{ name, email }`
- Expected 201: `{ id, status: "pending" }`

**Step 3 — Feature access**
- `GET /platform/organisations/:orgId/features` → `{ enabledFeatures: string[] }`
- `PATCH /platform/organisations/:orgId/features` → `{ enabledFeatures: string[] }`
- Agreed feature keys from workflow: `Registration`, `Households`, `Finance`, `Volunteers`, `Distribution`, `Reports`

**Form fields (Step 1):**

| Field | Type | Validation |
|---|---|---|
| Organisation name | text | required, min 2, max 120 |
| Locality | text | required, min 2, max 120 |
| Contact email | email | required, valid email format |

**Form fields (Step 2):**

| Field | Type | Validation |
|---|---|---|
| Admin full name | text | required, min 2, max 120 |
| Admin email | email | required, valid email format |

**Error handling:**
- 400 → show field-level validation message from `message` array
- 409 `ORGANISATION_YEAR_EXISTS` → not applicable here; show generic conflict message
- 409 on invitation → "An invitation is already pending for this address."
- Step navigation: each step submits independently; Step 2 uses `orgId` returned from Step 1; do not re-submit Step 1 on back/forward.

**States per step:**
| State | UI |
|---|---|
| Submitting | Spinner on button, fields disabled |
| Step success | Advance to next step with confirmation message |
| Final success | Show summary: org name + "Invitation sent to [email]" + Close |

---

### SA03 — Organisation Detail

**Endpoint:** `GET /platform/organisations/:orgId`
**Expected response:** full organisation object including `contact.email`, `status`

**Endpoint (edit):** `PATCH /platform/organisations/:orgId` with `{ name?, locality?, contact?, status? }`

**Fields displayed:**
- Name, locality, public contact email
- Status badge + status-change actions (activate, suspend — when appropriate)
- Assigned committee admin list (from `GET /platform/organisations/:orgId/invitations`)
- Feature access toggle list (from `GET /platform/organisations/:orgId/features`)

**Invitation list endpoint:** `GET /platform/organisations/:orgId/invitations?cursor=&limit=25`
**Expected response:** `{ items: [{ id, name, email, status }], nextCursor }`

Invitation `status` values: `pending`, `accepted`, `expired`, `revoked`

**Revoke action:** `POST /platform/organisations/:orgId/invitations/:id/revoke`

**States:**
| State | UI |
|---|---|
| Loading | Skeleton for all sections |
| Org not found (404) | "This organisation could not be found." + Back to list |
| Access denied (403) | "You do not have access to this organisation." |
| Edit save error | Inline error below the form |
| Revoke loading | Spinner on revoke button, row dimmed |

**Navigation:** Breadcrumb: Platform → Organisations → [Org name]

---

### SA04 — Admin & Access

**Embedded within SA03 as a tab or section.** Shows invitation list and re-invite / revoke actions.

**Re-invite:** re-send invitation — endpoint not yet defined in contract (see Section 3, Gap #1).

---

## 3. Screens — Scope: Annual Programme Setup (ADM02)

> These screens are inside the Committee Admin portal. The signed-in user must be a `committee_admin` in an `active` organisation.

---

### ADM02 — Programme List

**Purpose:** Committee Admin views their own organisation's annual programmes and creates a new one.

**Endpoint:** `GET /organisations/:orgId/programmes?cursor=&limit=25`

**Expected response:**
```json
{
  "items": [
    {
      "id": "prog_abc",
      "organisationId": "org_demo",
      "year": 2027,
      "title": "Annual Aḍḥiyah Programme",
      "status": "published",
      "registrationOpensAt": "2027-04-01T03:30:00Z",
      "registrationClosesAt": "2027-05-01T03:30:00Z"
    }
  ],
  "nextCursor": null
}
```

**Status badge values:** `draft` → grey, `published` → green

**States:**
| State | UI |
|---|---|
| Loading | Skeleton list |
| Empty (no programmes) | "No programme has been created yet. Start by creating this year's programme." + Create button |
| Error | "Could not load programmes." + Retry |
| Success | List sorted newest-first; each row links to ADM02-DETAIL |

**Create action:** "Create Programme" button → modal

**Create endpoint:** `POST /organisations/:orgId/programmes` with `{ year: number, title: string }`
**Expected 201:** programme object with `status: "draft"`

**Create form fields:**

| Field | Type | Validation |
|---|---|---|
| Year | number | required, 4-digit, current or future year |
| Title | text | required, min 2, max 200 |

**Error handling:**
- 409 `PROGRAMME_YEAR_EXISTS` → "A programme already exists for the year [year]. Each year may only have one programme."

---

### ADM02-DETAIL — Programme Setup / Edit

**Endpoint (read):** `GET /organisations/:orgId/programmes/:programmeId`

**Endpoint (edit):** `PATCH /organisations/:orgId/programmes/:programmeId`

**Endpoint (publish):** `POST /organisations/:orgId/programmes/:programmeId/publish`

**Full programme response (from contract):**
```json
{
  "id": "prog_abc",
  "organisationId": "org_demo",
  "year": 2027,
  "title": "Annual Aḍḥiyah Programme",
  "status": "published",
  "description": "Programme information for residents",
  "guidelines": "Read the participation requirements before registering.",
  "publicContact": { "email": "programme@example.test" },
  "registrationOpensAt": "2027-04-01T03:30:00Z",
  "registrationClosesAt": "2027-05-01T03:30:00Z",
  "registrationLimit": 150,
  "price": { "amountMinor": 250000, "currency": "INR" }
}
```

**Editable fields and display:**

| Field | Type | Validation | Notes |
|---|---|---|---|
| title | text | required, min 2, max 200 | Year is immutable after creation |
| description | textarea | required for publish | Public-facing |
| guidelines | textarea | required for publish | Public-facing |
| publicContact.email | email | required for publish | Distinct from org contact |
| registrationOpensAt | datetime-local | required for publish; must be future | ISO 8601 input converted to UTC |
| registrationClosesAt | datetime-local | required for publish; must follow opensAt | |
| registrationLimit | number | positive integer, required for publish | |
| price.amountMinor | number | non-negative integer (paise/minor units) | Display as ₹ amount = amountMinor / 100 |
| price.currency | read-only | always INR for now | Show as label, not editable |

**Registration status derived on the frontend** (not a separate field):
- `registrationOpensAt` in the future → "Upcoming"
- Between open and close → "Open"
- After `registrationClosesAt` → "Ended"
This is display logic only; do not send a separate status field to the backend.

**Publish pre-flight check (frontend):**
Before sending `POST /publish`, the frontend must check that all required-for-publish fields are non-null and show field-level hints for any missing ones. Send the publish request only after the check passes.

**Publish errors from backend:**
- 400 → show which fields are invalid/missing
- 409 → "Cannot publish: a transition conflict occurred. Refresh and try again."

**States:**
| State | UI |
|---|---|
| Loading | Skeleton form |
| Draft / incomplete | Show "Publish" button as disabled with tooltip listing missing fields |
| Draft / complete | "Publish" button active |
| Published | Show "Published" badge; allow editing non-critical fields; Publish button changes to "Re-publish" or hidden |
| Saving (PATCH) | Inline spinner; fields remain readable |
| Publish in progress | Full-screen spinner or button spinner |
| Save/publish error | Inline banner below the section with the error message |

**Navigation:** Breadcrumb: Dashboard → Programme Setup → [Year] [Title]

---

## 4. Screens — Scope: Public Programme Page (PUB02–PUB04, PUB08)

> These screens are anonymous (no auth required). The URL structure must encode both `orgId` and `year` to identify the programme uniquely.

**Public URL design question for M2:** The contract defines `GET /public/organisations/:orgId/programmes/:year` but the frontend URL structure needs to be agreed. Options:
- `/:orgSlug/:year` (requires org slug — not in contract yet)
- `/programme/:orgId/:year` (exposes internal ID in URL)
- `/programme/:year` (single-org assumption — not suitable for SaaS)

**M1 is treating the URL as `/programme/:orgId/:year` until M2 clarifies.** Noted in Section 6, Gap #3.

---

### PUB02 — Landing / Programme Home

**Endpoint:** `GET /public/organisations/:orgId/programmes/:year`

**Expected response (public projection):**
```json
{
  "year": 2027,
  "title": "Annual Aḍḥiyah Programme",
  "status": "published",
  "description": "Programme information for residents",
  "guidelines": "Read the participation requirements before registering.",
  "publicContact": { "email": "programme@example.test" },
  "registrationOpensAt": "2027-04-01T03:30:00Z",
  "registrationClosesAt": "2027-05-01T03:30:00Z",
  "price": { "amountMinor": 250000, "currency": "INR" }
}
```

**Note:** `id`, `organisationId`, `registrationLimit` are **not** in the public response per M2's contract. M1 must not display internal IDs publicly.

**Fields displayed on the landing page:**
- Programme title and year
- Description (intro paragraph)
- Registration status chip: "Upcoming / Open / Ended" (derived from dates as above)
- Registration open/close dates formatted as human-readable (`dd MMM yyyy` in `Asia/Kolkata`)
- Price per share (convert from `amountMinor / 100`, format as ₹ with `en-IN` locale)
- "Register" CTA button — visible only when status is "Open"; disabled with "Registration closed" when ended; hidden when upcoming
- Intro animation (splash screen on first visit only — `sessionStorage` gate from existing design)

**States:**
| State | UI |
|---|---|
| Loading | Intro splash (always shown on first load; replaces skeleton for first-visit UX) |
| Subsequent loads | Standard page skeleton |
| Programme not found (404) | "This programme page is unavailable." neutral message |
| Organisation suspended (403/404) | Same unavailable message; do not expose suspension reason |
| Programme not published (404) | Same unavailable message |
| Error (network) | "Could not load programme information. Please try again." + Retry |
| Success, upcoming | Show countdown timer (from existing `countdownValues()` logic) |
| Success, open | Show "Registration open" banner, CTA active |
| Success, ended | Show "Registration closed" badge, CTA disabled |

---

### PUB03 — About / Programme Description

**Endpoint:** same as PUB02 — reuse the cached query result (single request).

**Fields displayed:** `description` (full text), `title`, `year`

No separate API call. Use TanStack Query's cached result from the PUB02 load.

---

### PUB04 — Guidelines & Pricing

**Endpoint:** same as PUB02 — reuse cached result.

**Fields displayed:**
- `guidelines` (full text, rendered as paragraphs)
- `price.amountMinor` / `price.currency` → formatted share price
- Registration dates (`registrationOpensAt`, `registrationClosesAt`) formatted with timezone

---

### PUB08 — FAQ & Contact

**Static content** for FAQ questions (no API call needed for FAQ text — content is authored in the frontend).

**Contact section — Enquiry form:**
**Endpoint:** `POST /public/organisations/:orgId/programmes/:year/enquiries`
**Request:** `{ name: string, replyEmail: string, message: string }`
**Expected 201:** `{ id: string }` (acknowledgement only)

**Form validation:**

| Field | Validation |
|---|---|
| Name | required, min 2, max 120 |
| Reply email | required, valid email |
| Message | required, min 10, max 1000 |

**States:**
| State | UI |
|---|---|
| Idle | Form visible |
| Submitting | Button spinner, fields disabled |
| Success | Form replaced with "Your enquiry has been sent. We will get back to you." |
| Error (400) | Field-level errors |
| Error (429) | "Too many requests. Please wait a moment and try again." |
| Error (5xx) | "Could not send your enquiry. Please try again." |

**Public contact display:** Show `publicContact.email` from the programme response with a `mailto:` link. Do not show the private org `contact.email`.

---

## 5. Mock data and service structure

**Mock location:** `frontend/src/mocks/` — described below. All mocks must match this contract (commit `33a7555`).

### Mock files to create (M1-owned, inside `frontend/`)

```
frontend/src/mocks/
  organisations.mock.ts    ← mock data for SA02–SA04
  programmes.mock.ts       ← mock data for ADM02 + PUB02–PUB08
  api-client.mock.ts       ← TanStack Query mock adapter (wraps fetch, returns fixtures)
```

### organisations.mock.ts — fixture

```ts
// Derived from API contract payload example (commit 33a7555)
export const mockOrganisations = [
  {
    id: "org_noor",
    name: "Noor Mahallu",
    locality: "Kozhikode, Kerala",
    contact: { email: "office@noor.example" },
    status: "active",
  },
  {
    id: "org_alhuda",
    name: "Al Huda Mosque",
    locality: "Malappuram, Kerala",
    contact: { email: "office@alhuda.example" },
    status: "onboarding",
  },
  {
    id: "org_rahma",
    name: "Rahma Aḍḥiyah Committee",
    locality: "Kannur, Kerala",
    contact: { email: "office@rahma.example" },
    status: "active",
  },
  {
    id: "org_eastward",
    name: "East Ward Mahallu",
    locality: "Thrissur, Kerala",
    contact: { email: "office@eastward.example" },
    status: "suspended",
  },
];

export const mockInvitations: Record<string, InvitationItem[]> = {
  org_noor: [
    { id: "inv_001", name: "Amina Rahman", email: "amina@noor.example", status: "accepted" },
  ],
  org_alhuda: [
    { id: "inv_002", name: "Faisal Ali", email: "faisal@alhuda.example", status: "pending" },
  ],
};

export type OrgStatus = "onboarding" | "active" | "suspended" | "closed";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
export type InvitationItem = { id: string; name: string; email: string; status: InvitationStatus };
export type Organisation = {
  id: string;
  name: string;
  locality: string;
  contact: { email: string };
  status: OrgStatus;
};
export type PaginatedList<T> = { items: T[]; nextCursor: string | null };
```

### programmes.mock.ts — fixture

```ts
// Derived from API contract payload example (commit 33a7555)
export const mockProgrammes: Record<string, Programme[]> = {
  org_noor: [
    {
      id: "prog_noor_2027",
      organisationId: "org_noor",
      year: 2027,
      title: "Annual Aḍḥiyah Programme 2027",
      status: "published",
      description: "Annual Aḍḥiyah programme for the residents of Noor Mahallu.",
      guidelines: "Participation is open to registered households. Read the full guidelines before submitting.",
      publicContact: { email: "programme@noor.example" },
      registrationOpensAt: "2027-04-01T03:30:00Z",
      registrationClosesAt: "2027-05-01T03:30:00Z",
      registrationLimit: 150,
      price: { amountMinor: 850000, currency: "INR" },
    },
    {
      id: "prog_noor_2026",
      organisationId: "org_noor",
      year: 2026,
      title: "Annual Aḍḥiyah Programme 2026",
      status: "published",
      description: "Previous year's programme archive.",
      guidelines: "Registration closed.",
      publicContact: { email: "programme@noor.example" },
      registrationOpensAt: "2026-04-01T03:30:00Z",
      registrationClosesAt: "2026-05-01T03:30:00Z",
      registrationLimit: 130,
      price: { amountMinor: 820000, currency: "INR" },
    },
  ],
  org_alhuda: [
    {
      id: "prog_alhuda_2027",
      organisationId: "org_alhuda",
      year: 2027,
      title: "Al Huda Aḍḥiyah Programme",
      status: "draft",
      description: null,
      guidelines: null,
      publicContact: null,
      registrationOpensAt: null,
      registrationClosesAt: null,
      registrationLimit: null,
      price: { amountMinor: 0, currency: "INR" },
    },
  ],
};

// Public projection — no id, organisationId, registrationLimit
export const mockPublicProgramme = {
  year: 2027,
  title: "Annual Aḍḥiyah Programme 2027",
  status: "published",
  description: "Annual Aḍḥiyah programme for the residents of Noor Mahallu.",
  guidelines: "Participation is open to registered households. Read the full guidelines before submitting.",
  publicContact: { email: "programme@noor.example" },
  registrationOpensAt: "2027-04-01T03:30:00Z",
  registrationClosesAt: "2027-05-01T03:30:00Z",
  price: { amountMinor: 850000, currency: "INR" },
};

export type ProgrammeStatus = "draft" | "published";
export type Programme = {
  id: string;
  organisationId: string;
  year: number;
  title: string;
  status: ProgrammeStatus;
  description: string | null;
  guidelines: string | null;
  publicContact: { email: string } | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  registrationLimit: number | null;
  price: { amountMinor: number; currency: string };
};
export type PublicProgramme = Omit<Programme, "id" | "organisationId" | "registrationLimit">;
```

---

## 6. Mismatches and open questions for M2

| # | Gap | Description | Resolution / Status | Impact on Frontend |
|---|---|---|---|---|
| GAP-01 | Re-send invitation endpoint | SA04 needs to let the Super Admin resend an invitation that is `pending` or `expired`. No separate re-send endpoint in contract. | **Open:** Workaround in UI is revoking and creating a fresh invitation. | SA04 screen |
| GAP-02 | Organisation status transitions | Status transitions allowed via `PATCH /platform/organisations/:orgId`. | **Resolved (M2 Notes):** Transitions: `onboarding` → `active`, between `active` and `suspended`, or to `closed` from any non-closed state. | SA03 edit & status actions |
| GAP-03 | Public URL design | `GET /public/organisations/:orgId/programmes/:year` vs public vanity slug. | **Open:** Currently routing with `orgId`. Awaiting confirmation if slug endpoint will be introduced. | PUB02–PUB08 routing |
| GAP-04 | Feature keys list | Case-sensitivity and list of agreed feature keys. | **Resolved (D-003):** Title Case confirmed: `Registration`, `Households`, `Animals`, `Allocations`, `Finance`, `Distribution`, `Volunteers`, `Reports`. | SA03 feature access |
| GAP-05 | Money display (amountMinor precision) | Divisor for `amountMinor` (paise vs rupees). | **Resolved (D-003):** Confirmed: `amountMinor` is integer minor units (paise, ÷100 = ₹). | ADM02, PUB04 price display |
| GAP-06 | `publicContact` vs org `contact` | Programme public contact isolation. | **Resolved (Contract & D-003):** Programme `publicContact` is `{ email: string }`, set independently per programme. | PUB08 contact display |
| GAP-07 | Authentication starter reference | Supabase Auth Bearer token contract. | **Resolved:** Frontend passes standard Supabase Auth Bearer JWT in `Authorization: Bearer <token>`. | Login, all protected routes |
| GAP-08 | Programme PATCH after publish | Editable fields after a programme is published. | **Resolved (M2 Notes):** Updates to a published programme must preserve required public fields (`title`, `description`, `guidelines`, `publicContact`, `registrationOpensAt`, `registrationClosesAt`, `price`). | ADM02-DETAIL edit state |
| GAP-09 | `GET /organisations` workspace endpoint | Response shape for user's accessible workspaces. | **Resolved (M2 Notes):** Returns membership entries with `organization.id`, `name`, `slug`, lowercase `status`, `membershipStatus`, `joinedAt`, `roles`. Route `suspended` and `closed` workspaces to unavailable state. | Workspace routing / auth handoff |

---

## 7. Extension slots (M3 features — empty for now)

Built early, flag-guarded, renders nothing with flags off.

| Slot name | Screen and location | Props provided | Feature | Flag |
|---|---|---|---|---|
| `slot-sa02-org-list-actions` | SA02 — below metrics row | `orgId`, `orgStatus` | EF-TBD (e.g., bulk analytics) | `FEATURE_EF_01` |
| `slot-adm02-programme-setup-extra` | ADM02-DETAIL — below publish section | `programmeId`, `orgId`, `status` | EF-TBD (e.g., smart limits) | `FEATURE_EF_02` |
| `slot-pub02-overview-panel` | PUB02 — below registration CTA | `year`, `orgId` | EF-TBD (e.g., public stats) | `FEATURE_EF_03` |

---

## 8. Navigation and redirect behaviour

| Trigger | Action |
|---|---|
| User not signed in → accesses `/admin/*` or `/super-admin/*` | Redirect to `/login` |
| User signed in with `role: committee_admin` → accesses `/super-admin/*` | 403 → redirect to `/admin/dashboard` |
| User signed in with `role: super_admin` → accesses `/admin/*` | 403 → redirect to `/super-admin/dashboard` |
| Org status is `suspended` → committee admin logs in | Show "Your organisation's access is currently suspended. Contact the platform administrator." |
| Programme published successfully | Redirect or scroll to programme detail with "Published" badge and success toast |
| Enquiry sent successfully | Form replaced with success message; no redirect |
| New org created (Step 3 complete) | Close modal; refresh organisation list; show success toast with org name |

---

## 9. Notes and assumptions

- CONFIRMED (D-003): `amountMinor` divisor is 100 (paise), so `250000 amountMinor = ₹2500.00`.
- CONFIRMED (D-003): Date fields use ISO 8601 UTC `registrationOpensAt` and `registrationClosesAt`.
- CONFIRMED (D-003): Integer grams used for all distribution measurements (`quantityGrams`).
- CONFIRMED (D-003): Distribution states: `draft`, `confirmed`, `packed`, `collected`, `delivered`.
- CONFIRMED (D-003): Exports use `format=xlsx|pdf` via `GET /reports/:kind/export?format=xlsx|pdf`.
- CONFIRMED (D-003): Batch allocation is proposed additive only; single allocation is used.
- CONFIRMED (D-003): Documented committee cancellation action supported for registrations and allocations.
- ASSUMED: Public URL routes via `orgId` (`/public/organisations/:orgId/programmes/:year`) until M2 confirms vanity slug design (GAP-03).
- CONFIRMED: Client-side SPA with React 19 + Vite + TanStack Router (code-based tree).
- CONFIRMED: Supabase Auth Bearer token passed in `Authorization: Bearer <token>` header on all protected calls.
- PUB05 announcements, PUB06 public aggregates, PUB07 distribution details are deferred — endpoints defined in contract.
- SA01 platform dashboard metrics are deferred (endpoint proposed in contract).
- All screens strictly adhere to approved visual design from `canvas-saas-suite`.
