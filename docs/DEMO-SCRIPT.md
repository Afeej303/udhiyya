# QurbaniOS – Interactive Live Demo Walkthrough Script

**Document Status:** READY · **Owner:** M3  
**Target Duration:** 6–7 minutes  
**Target Audience:** Hackathon Judges, Mahallu Committee Administrators, Donors  
**One-Command Seed Setup:**
```bash
# Seed 140 synthetic participants, 20 cattle, 10 sheep, payments, and 8-category expenses:
./backend/node_modules/.bin/tsx enhancements/demo/seed-demo.ts
```

---

## 1. Demo Overview & Architecture Narrative

| Timeline | Stage | Core Feature | Key Visual Proof Point |
|---|---|---|---|
| **00:00 – 01:00** | Step 1: Admin Login & Live Telemetry | AC-01 + EF-01 (Analytics Dashboard) | 4 KPI metric cards, weight yield curve, payment velocity chart |
| **01:00 – 02:15** | Step 2: Household CSV Bulk Import | AC-02 (Household & Participant Mgmt) | Drag-and-drop CSV parsing, validation badges, participant review table |
| **02:15 – 03:30** | Step 3: Smart Allocation Knapsack Engine | AC-03 + EF-02 (Smart Allocation Engine) | 14 unassigned slots solved into 2 cattle (7 shares each), conflict-free preview & atomic commit |
| **03:30 – 04:45** | Step 4: Finance & Anomaly Intelligence | AC-04 + EF-03 (Financial Intelligence) | Reconciliation surplus/deficit, 4 flagged anomalies (duplicate UTR, deficit), instant expense categoriser |
| **04:45 – 05:45** | Step 5: Volunteer Slaughter & Processing Ops | AC-05 + AC-06 (Operations & Distribution) | Real-time slaughter floor board: `IN_SHED` &rarr; `SLAUGHTERED` &rarr; `PACKED` &rarr; `DELIVERED` |
| **05:45 – 06:45** | Step 6: Public Transparency Portal & Summary | AC-08 (Public Programme Information) | Public live tracker, verified share availability, charity breakdown |

---

## 2. Step-by-Step Walkthrough Guide

### Step 1: Admin Login & Live Operational Telemetry (00:00 – 01:00)
- **Features Demonstrated:** AC-01 (Committee Dashboard) + **EF-01 (Analytics Dashboard)**
- **Presenter Narrative:**
  > *"Welcome to QurbaniOS. Managing an annual Aḍḥiyah programme for hundreds of families across a mahallu used to mean messy paper registers, duplicate shares, and frantic last-minute bookkeeping. Today, we'll demonstrate how QurbaniOS automates this entire lifecycle with mathematical precision."*
  > *"Logging in as the Committee Administrator, our dashboard immediately renders real-time telemetry powered by our Analytics extension."*
- **Actions on Screen:**
  1. Open browser to `/login` and submit admin credentials (`admin@qurbanios.org`).
  2. Land on `/admin/programmes/2026/dashboard`.
  3. Highlight the 4 KPI cards: Total Participants (`140`), Animal Weight Yield (`342 kg avg`), Payment Collection (`88.9%`), and Share Capacity (`126/140 utilized`).
  4. Click through the chart tabs:
     - **Wards Tab:** Participant distribution by locality (Ward 1 through Ward 7).
     - **Weight Yield Tab:** Yield histogram brackets (`<250kg`, `250–299kg`, `300–349kg`, `350–399kg`, `≥400kg`).
     - **Payment Velocity Tab:** Daily and cumulative collection timeseries.
- **Audience Sees:** Instant visual confirmation that 126 of 140 shares are filled, with 14 slots awaiting allocation.
- **Fallback Contingency:** If backend chart telemetry is delayed, toggle to offline fallback mode in `enhancements/EF-01-analytics/sandbox/SandboxApp.tsx` or show pre-rendered telemetry snapshot at `enhancements/demo/seed-data.json`.

---

### Step 2: Household CSV Bulk Import & Participant Review (01:00 – 02:15)
- **Features Demonstrated:** AC-02 (Household & Participant Management)
- **Presenter Narrative:**
  > *"Community registration often arrives in bulk spreadsheets collected after Friday prayers. Let's see how fast QurbaniOS ingests and validates new household registrations."*
- **Actions on Screen:**
  1. Navigate to `/admin/households`.
  2. Click **"Import Households CSV"**.
  3. Select [enhancements/demo/sample-households.csv](file:///home/afeej/.paseo/worktrees/3009bx59/jubilant-spider/enhancements/demo/sample-households.csv).
  4. The import modal renders a live tabular preview of 20 synthetic households (Al-Hassan Family, Siddiqui Residence, etc.) with ward assignments and preferred collection slots.
  5. Click **"Confirm & Import"**.
  6. Toast notification: *"Successfully imported 20 households and registered participants"*.
  7. Filter table by *"Pending Allocation"* to reveal the 14 participants awaiting animal assignment.
- **Audience Sees:** High-speed, validation-checked ingestion of community registrations with zero manual transcription errors.
- **Fallback Contingency:** If file picker dialog is slow, click *"Load Demo Sample"* button which reads preloaded households directly from memory.

---

### Step 3: Smart Allocation Engine – Knapsack Optimization (02:15 – 03:30)
- **Features Demonstrated:** AC-03 (Animal Group & Allocation) + **EF-02 (Smart Allocation Engine)**
- **Presenter Narrative:**
  > *"Here lies the most stressful operational problem: pairing participants into animal shares. Under classical rules, cattle and buffalo must have exactly 7 valid shares. Pairing 140 participants by preferred day and family affinities without leaving orphan fractional shares is an NP-hard knapsack problem that usually takes committee members half a night."*
  > *"Watch how QurbaniOS solves this in under 200 milliseconds."*
- **Actions on Screen:**
  1. Navigate to `/admin/allocations`.
  2. Note the banner: *"14 Unassigned Participants Detected · 2 Cattle Available (CTL-2026-019 & CTL-2026-020)"*.
  3. Click **"Run Smart Allocation"** (`data-testid="ef02-smart-allocation-btn"`).
  4. Select Policy: *"Family Affinity & Day Priority"*.
  5. The interactive preview modal opens (`data-testid="ef02-allocation-preview"`):
     - Cattle `CTL-2026-019` (345 kg): Exactly 7 participant shares grouped.
     - Cattle `CTL-2026-020` (355 kg): Exactly 7 participant shares grouped.
     - Orphan check badge: **0 Orphan Slots · 100% Validated**.
  6. Click **"Commit Allocations"**.
  7. Atomic transaction executes with row-level locks; live status changes to *"140/140 Shares Fully Allocated"*.
- **Audience Sees:** Instant constraint satisfaction solving all remaining participant shares with zero manual pairings.
- **Fallback Contingency:** If the engine endpoint times out, open `enhancements/EF-02-smart-allocation/sandbox/SandboxApp.tsx` and toggle to *"review_preview"* state to display the exact proposed distribution preview and commit response.

---

### Step 4: Finance Verification & Anomaly Detection (03:30 – 04:45)
- **Features Demonstrated:** AC-04 (Finance Tracking) + **EF-03 (Financial Intelligence)**
- **Presenter Narrative:**
  > *"Managing financial reconciliation across hundreds of bank transfers and cash receipts is prone to double-counting and unpaid share shortfalls. Our Financial Intelligence extension acts as an automated auditor."*
- **Actions on Screen:**
  1. Navigate to `/admin/finance`.
  2. Inspect the **Financial Intelligence Panel** (`data-testid="ef03-financial-intelligence"`):
     - Expected Revenue: `₹4,20,000` (140 shares × ₹3,000).
     - Collected Revenue: `₹3,75,000` (88.9% collection rate).
     - Net Operating Balance: `+₹1,33,000` (Surplus after operational expenses).
  3. Click the **"Anomalies (4)"** tab (`data-testid="ef03-tab-anomalies"`):
     - Anomaly 1: **Duplicate Payment Reference** (`TXN-UPI-994411` shared by Participant #45 and #46).
     - Anomaly 2: **Underpayment with Allocation** (Participant #14 allocated to animal Bull #2 but only paid ₹1,500 of required ₹3,000).
     - Anomaly 3: **Overpayment** (Participant #29 paid ₹3,500 for a ₹3,000 share — excess ₹500 flagged for refund or Sadaqah).
     - Anomaly 4: **Orphan Payment** (Payment #999 unlinked to any active participant).
  4. Click the **"Auto-Categoriser"** tab (`data-testid="ef03-tab-categoriser"`):
     - Enter description: `"Diesel fuel and tempo cartage for meat distribution"`.
     - Enter amount: `1500`.
     - Click **"Auto-Categorise Expense"**.
     - System immediately returns category: `LOGISTICS_AND_TRANSPORT` with `HIGH` confidence.
- **Audience Sees:** Complete transparency into financial reconciliation and automated protection against clerical fraud or accounting oversights.
- **Fallback Contingency:** Open `enhancements/EF-03-financial-intelligence/sandbox/SandboxApp.tsx` to display all 4 states and pre-calculated anomaly badges.

---

### Step 5: Volunteer Operations & Slaughter Floor Tracking (04:45 – 05:45)
- **Features Demonstrated:** AC-05 (Volunteer & Operations) + AC-06 (Distribution Management)
- **Presenter Narrative:**
  > *"On Eid morning, operational visibility is crucial. Volunteers on the ground need to know which animal is in the holding pen, which is being slaughtered, and when meat packets are ready for pickup."*
- **Actions on Screen:**
  1. Navigate to `/admin/operations/slaughter-floor`.
  2. Volunteer floor Kanban view displays animal progress cards:
     - `CTL-2026-001` to `CTL-2026-006`: Status `READY_FOR_SLAUGHTER`.
     - `CTL-2026-007` to `CTL-2026-010`: Status `SLAUGHTERED` (recorded by Butcher Team).
     - `CTL-2026-011` to `CTL-2026-014`: Status `DRESSED & WEIGHED`.
     - `CTL-2026-015` to `CTL-2026-017`: Status `PACKED (5kg bags tagged with tokens)`.
  3. Demonstrate a live drag-and-drop or status change: Move `CTL-2026-006` to `SLAUGHTERED`.
  4. Note the distribution register: Recipient families receiving token collection SMS notifications.
- **Audience Sees:** Real-time operational agility replacing chaotic paper checklists on the slaughterhouse floor.
- **Fallback Contingency:** Navigate to distribution list view displaying pre-seeded delivery statuses.

---

### Step 6: Public Programme Portal & Shareable Community Stats (05:45 – 06:45)
- **Features Demonstrated:** AC-08 (Public Programme Information)
- **Presenter Narrative:**
  > *"Finally, trust in community programmes requires complete transparency with participants and donors. Our public-facing portal provides verified, read-only proof of operational integrity without exposing private household data."*
- **Actions on Screen:**
  1. Open an incognito browser window to public portal `/public/programmes/2026`.
  2. Point out:
     - Programme dates and slaughter schedule.
     - Meat packet collection guidelines and safety protocols.
     - High-level transparency counter: `140/140 Shares Completed`, `4,780 kg Total Yield Distributed`, `20 Beneficiary Families Supported`.
     - FAQ section explaining Qurbani rules and share distribution.
- **Audience Sees:** A beautiful, responsive community page that builds public trust and donor confidence.
- **Fallback Contingency:** Show static projection in `docs/PROJECT.md` or local HTML preview.

---

## 3. Demo Data Checklist

All synthetic data for this walkthrough is generated via `enhancements/demo/seed-demo.ts` and stored in `enhancements/demo/seed-data.json`:

| Entity | Quantity | Key Characteristics |
|---|---|---|
| **Households** | 50 families | Distributed across Wards 1 to 7; realistic synthetic names and phone numbers |
| **Participants** | 140 registrations | 126 pre-allocated + 14 unassigned (for Step 3 live demo) |
| **Livestock** | 30 animals | 20 cattle (285–415 kg, 7 shares each) + 10 sheep/goats (36–54 kg) |
| **Allocations** | 126 pre-allocated | Exactly 18 cattle × 7 shares (0 fractional shares) |
| **Payments** | 139 transactions | 120 verified, 10 pending, 4 seeded anomaly cases |
| **Expenses** | 19 items | ₹2,42,000 total across all 8 operational expense categories |
| **Volunteers** | 12 volunteers | Assigned to Slaughter, Dressing, Packaging, Distribution, Finance, and Token Desk |
| **Beneficiaries**| 20 packets | Meat packages weighed (4.5–5.5 kg) with collection tracking |

---

## 4. Judges Q&A Cheat Sheet

| Question | Winning Answer |
|---|---|
| **Why enforce exactly 7 shares per cattle?** | Classical Shariah jurisprudence mandates that large cattle/buffalo can accommodate up to 7 distinct sacrifice intentions, while sheep/goats accommodate exactly 1. QurbaniOS enforces this invariant in the domain model and database constraints, preventing invalid partial allocations. |
| **How does Smart Allocation prevent orphan shares?** | The Smart Allocation Engine uses a greedy knapsack constraint solver that groups participants by household affinity and preferred day. If an animal cannot be completely filled to 7 shares, the engine flags it during preview rather than committing fractional unassigned slots. |
| **How do extension features merge without breaking the MVP?** | Extensions merge dark behind feature flags (`FEATURE_EF_01`, `FEATURE_EF_02`, `FEATURE_EF_03`). When flags are `off`, the controller and views are completely inert and return standard HTTP 403 / render `null`, ensuring zero risk to the core MVP. |
| **How is participant privacy protected?** | Public portal projections explicitly strip out private household names, phone numbers, and addresses. Private admin routes enforce scoped organization membership and strict `ExtensionAdminGuard` role checks. |
| **What happens if local internet drops on Eid morning?** | QurbaniOS is designed for resilient local deployment. The backend runs as a standalone Fastify server on local Wi-Fi, allowing token scanning and status updates to proceed without active external cloud internet. |
