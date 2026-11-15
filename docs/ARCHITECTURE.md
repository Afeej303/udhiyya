# Architecture

Status: DRAFT v0 · Owner: M2

## Proposed baseline

Use the parent authentication starter for the NestJS REST API, ESM, Prisma/PostgreSQL and Vitest. Use its Supabase Auth mode and [frontend auth contract](../../docs/frontend-auth.md). Source and lockfile from starter commit `db7a191` are imported into `backend/` for local verification. The imported harness uses Express. The team selected Fastify in D-001, so deployment and contract-facing route work must use the Fastify port. Review starter routes and permissions before exposing them, especially organisation creation, invitation and platform admin access.

| Path | Responsibility |
|---|---|
| `frontend/` | M1 React + Vite + TypeScript client-rendered SPA with Tailwind. Calls the separate NestJS REST API. |
| `backend/` | M2 API, data access, migrations and tests. |
| `enhancements/` | M3 feature modules behind flags. |
| `shared/` | Shared assets if agreed by the team. |

## Request flow

The browser signs in through Supabase Auth. Nest verifies the bearer token and maps the external identity to the starter profile. Platform routes check server-assigned platform permissions. Committee routes resolve the requested organisation, current membership and workspace state, then constrain Prisma queries to that organisation. Platform admin access covers platform operations. Exceptional support access requires scoped authorization and audit.

Anonymous programme routes look up the organisation and year and serve an explicit public projection for active organisations and published programmes. App data flows through Nest. Follow the [reuse guide](../../docs/reuse.md) for keeping app tables outside the Supabase Data API.

Reuse the starter's auth, identity mapping, organisation membership, validation, error filter and health infrastructure. Adapt the competition starter's notification and payment integrations at the service boundary. M2 records and verifies core payment activity. Razorpay checkout depends on the optional scope decision in the workflow. Provider-specific order identifiers must map to programme records before checkout is adopted.

## Integration and rollout

Use a fresh destination Supabase project. The starter uses `AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `DIRECT_URL` and `ALLOWED_ORIGINS`. Deployment URL, email sender, delivery limits and fallback are TBD. Confirm local run and migration commands against the copied backend before publishing run instructions.

M2 will provide one extension mount in the backend with feature flags defaulting off. Proposed namespace is `/ext/<feature-id>` relative to the API base. Confirm the mount interface with M3 before implementation. Frontend slots are owned by M1.

Use bounded pagination for organisation and programme lists. Index tenant-scoped lookups and keep publication, invitation acceptance and audit writes consistent under retry. Before deployment, verify onboarding through publication in two organisations, including suspended access, draft visibility and cross-tenant denial.
