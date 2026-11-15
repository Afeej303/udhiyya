# Decision Log

Append only. Add one entry at the end for each decision about scope, architecture, contracts, process or dependencies. If two entries conflict in git, keep both.

### D-000: Team process
- **Date:** TBD · **Status:** Proposed (Accepted once all three confirm on the planning call)
- **Decision:** Use this template's protocol: files are truth, WhatsApp pings with commit hashes, one writer per file, M3's features merge dark behind flags with V0/V1/V2 verification, shared `main` branch, contract freeze, cut line at T-90.
- **Reason:** Removes waiting for M3, prevents merge conflicts, keeps M1/M2 attention on the MVP.
- **Consequences:** Flag-off code must be inert. M3 must produce verification evidence.

### D-001: QurbaniOS Technology Stack & Domain Model
- **Date:** 2026-11-15 · **Status:** Accepted · **Decided by:** Team (M1, M2, M3)
- **Decision:** Use React + Vite + Tailwind CSS for frontend, NestJS + Fastify + Prisma + PostgreSQL for backend. Models represent Programmes, Households, Participants, Animals, Allocations, Volunteers, Tasks, Payments, and Distributions.
- **Reason and trade-offs:** Provides rapid development, strong type safety end-to-end, and high performance via Fastify adapter.
- **Affected files:** `docs/ARCHITECTURE.md`, `docs/DATABASE-SCHEMA.md`, `docs/API-CONTRACT.md`, `docs/FRONTEND-NEEDS.md`

### D-002: Git Manager & Upstream Features Workflow Integration
- **Date:** 2026-11-15 · **Status:** Accepted · **Decided by:** Git Manager
- **Decision:** Incorporate `docs/Features_workflow.md` from `origin/main` into the project baseline and rebase setup documentation commits directly on top of `origin/main`.
- **Reason and trade-offs:** Keeps repo history clean and ensures all team members have immediate access to the full SaaS and role specification document.
- **Affected files:** `docs/Features_workflow.md`, `docs/DECISIONS.md`, Git branch history
