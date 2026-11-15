# Data Model

Status: DRAFT v0 · Owner: M2

Proposed baseline is the root starter's PostgreSQL and Prisma schema and migration workflow. Confirm runtime and direct migration connections in the destination environment. This describes the first delivery slice.

| Entity | Fields and constraints |
|---|---|
| User / external identity | Reuse starter profile and unique provider identity mapping. Platform privileges are server-assigned. |
| Organisation | Opaque ID, name, locality, private contact, access status, timestamps. Reuse the organisation model with explicit lifecycle fields as needed. |
| Organisation membership | Organisation ID and user ID, unique as a pair. Store role and active access using the starter's membership model. Invitation acceptance grants only the role recorded by the server. |
| Organisation invitation | Organisation ID, recipient name and normalized email, proposed role, expiry, status, issuer and acceptance time. Verify the starter token handling before reuse. Store a digest if adding token storage. Redeem once in the same transaction as membership creation. |
| Programme | Opaque ID and required organisation ID. Unique organisation/year pair. Title, publication status, description, guidelines, public contact, registration opening and closing instants, positive registration limit and integer amount/currency. Draft configuration can be incomplete. |
| Audit event | Organisation ID where applicable, actor, action, resource ID and timestamp. Audit lifecycle, invitation and publish writes without storing invitation secrets. Reuse the starter audit model if compatible. |

## Lifecycle

- Proposed organisation transitions are `onboarding → active`, `active → suspended`, `suspended → active`, and closure from any non-closed state. Invitation acceptance may provision membership before activation. Suspension and closure stop workspace access and public reads. They preserve annual records.
- Proposed programme publication starts at `draft` and moves to `published` only after validation. Publication and registration dates describe separate states. Agree unpublish, archive and post-publication edits with M1 before wiring those actions.
- Scope private resource lookups by both organisation and resource ID. Use the organisation/year unique constraint for concurrent programme creation. Enforce cross-tenant consistency in future child relations and write transactions.
- Public reads select approved fields explicitly. Organisation contacts, membership data and invitations belong to private responses.

Use synthetic seed data with two organisations, separate admins, and draft and published programmes to check isolation and public visibility. Household ownership, separate participant and beneficiary records, finance verification, capacity allocation and distribution inventory will be specified with their respective workflow slices.
