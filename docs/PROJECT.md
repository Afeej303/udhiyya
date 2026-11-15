# Project Brief

Status: DRAFT v0 · Owner: M3

## Review before push (humans confirm)

- Assumptions made:
  - Stack: React + Vite (Frontend), NestJS + Fastify (Backend), PostgreSQL + Prisma (Database).
  - Qurbani programme workflow covers annual setup, household CSV import, participant registration, animal groups & allocation, payments, volunteer slaughter/processing/distribution tasks, public statistics/FAQ page, and PDF/CSV reports.
  - Enhancement features: EF-01 (Analytics Dashboard), EF-02 (Smart Allocation Engine) selected; EF-03, EF-04, EF-05 optional.
- Open TBDs:
  - Exact repository URL / remote tracking.
  - Final deadline / cut line timestamps.
  - Third-party email and payment provider credentials for production.

## 1. Identity
- **Project name:** QurbaniOS
- **Topic / problem statement:** Streamline and automate the Aḍḥiyah (Qurbani) programme management from registration to meat distribution, improving transparency, efficiency, and user experience.
- **Event / deadline (T):** TBD (coordinate with stakeholder timeline)
- **Repository:** https://github.com/Afeej303/udhiyya.git
- **Stack:** see `docs/ARCHITECTURE.md`

## 2. Problem, users, solution
- **Problem:** Manual coordination of registration, animal allocation, slaughter, processing, and distribution leads to errors, opacity, and inefficiency.
- **Primary users:** Committee (Mahallu administration), Volunteers (slaughter, processing, distribution, finance departments), Participants (households), and the General Public.
- **Current workaround and why it falls short:** Paper forms, spreadsheets, and ad-hoc communication cause data loss, duplicate allocations, and lack of real-time visibility.
- **Proposed solution (one paragraph):** QurbaniOS provides a web-based platform that digitises the entire Qurbani workflow, offering dashboards, configurable policies, automated allocation, payment tracking, and transparent public reporting, while allowing incremental roll-out of advanced intelligence features.

## 3. MVP scope (M1 and M2 deliver this)

| ID | Must-have feature | Acceptance criterion (observable) | Owner |
|---|---|---|---|
| AC-01 | Committee Dashboard & Programme Setup | Dashboard shows overall statistics, registration progress, payment summary; admin can create an annual programme with dates, limits, pricing. | M2 |
| AC-02 | Household & Participant Management | Ability to import household CSV, register participants, approve/reject, edit details, and view status. | M2 |
| AC-03 | Animal Group & Allocation | Create animal groups, register animals, assign participants, enforce allocation policies without duplicates. | M2 |
| AC-04 | Finance Tracking | Record payments, view outstanding balances, generate financial summary reports. | M2 |
| AC-05 | Volunteer & Operations Management | Add volunteers, assign to departments, track slaughter/processing schedules, update status. | M2 |
| AC-06 | Distribution Management | Register recipient households, allocate meat per configurable policies, track collection status. | M2 |
| AC-07 | Communication & Notifications | Send email/in-app announcements; participants receive status updates. | M2 |
| AC-08 | Public Programme Information | Public page shows programme dates, guidelines, FAQs, and high-level statistics. | M1/M2 |
| AC-09 | Basic Reporting | Exportable CSV/PDF reports for registration, allocation, and finance. | M2 |

Out of scope: Native mobile apps, real-time live video streaming of slaughter, multi-tenant global federation across unrelated mahallas.

M3's extra features are listed in `docs/EXTRA-FEATURE-PLAN.md`. The MVP must work without them.

## 4. Demo script (M3 maintains)

| Step | What the audience sees | Feature (MVP or EF-ID) | Fallback if it fails |
|---|---|---|---|
| 1 | Login as committee admin, view dashboard with live stats | AC-01 | Show static screenshot of dashboard |
| 2 | Register a household via CSV import, add a participant | AC-02 | Show mock data table |
| 3 | Create animal group, allocate participant, enforce policy | AC-03 | Show allocation summary |
| 4 | Record a payment, view financial summary | AC-04 | Show summary chart |
| 5 | Volunteer updates slaughter status, participant sees progress | AC-05/06 | Show static status page |
| 6 | Public page displays programme overview | AC-08 | Show placeholder page |

Demo data: Synthetic Mahallu households, pre-populated animals, test participants. Fallback recording: Pre-recorded demo walkthrough.

## 5. Pitch outline (5 slides)
1. Problem: Chaos in manual Qurbani operations (paper slips, duplicate shares, delayed distribution).
2. Solution: QurbaniOS — an end-to-end digital programme management platform.
3. Architecture: Fastify + NestJS + PostgreSQL + React with dark-merging enhancements.
4. Live Demo: From programme setup, participant allocation, to slaughter tracking and distribution.
5. Scalability & Next Steps: Multi-mahallu scaling, intelligent yield prediction, automated SMS updates.

## 6. Submission checklist (judging scope)
- [ ] Working prototype deployed at a shared URL, plus local run instructions that work on a clean clone
- [ ] Tests exist for the main journeys and pass
- [ ] Security: no secrets in repo, hashed passwords, auth on protected routes, input validation
- [ ] Database and API design explained in the presentation
- [ ] Scalability explained: what changes at 100x users (pagination, caching, stateless services, indexes)
- [ ] Each member can explain the whole system in one minute

## 7. Cut line log

| Time | Decision | Features cut or flagged off |
|---|---|---|
| T-90 | TBD | TBD |

## 8. Open questions

| Question | Owner | Resolution |
|---|---|---|
| Production cloud hosting environment choice | M2 | Open |
| SMS gateway integration scope for notifications | M2 | Use email/in-app first; SMS stretch |
| Final deadline and cut-line schedule | M3 | TBD |
