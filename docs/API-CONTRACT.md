# API Contract (MVP)

Status: DRAFT v0 · Owner: M2 · Consumers: M1

> Planner: propose only endpoints implied by the MVP features and mark them `Proposed`. M2 corrects, then M2 pings `CONTRACT FREEZE v1`.

If the team adopts OpenAPI, store it at `shared/openapi.yaml` and treat it as the source of truth; this file then points to it.

## 1. Conventions
- **Base URL / transport:** TBD
- **Authentication:** TBD
- **Content type:** TBD
- **Common error format:** TBD
- **Versioning:** TBD

M3's extension endpoints are not listed here. They live in the extension namespace and are documented in `docs/EXTRA-FEATURE-PLAN.md`.

## 2. Endpoint inventory

| ID | Method and path | Purpose | Auth | Status |
|---|---|---|---|---|
| API-001 | TBD | TBD | TBD | Proposed |

Status values: `Proposed`, `Agreed`, `Implemented`, `Deprecated`.

## 3. Endpoint detail

### API-001: [Name]
- **Request:**
```json
{ "example": "TBD" }
```
- **Success response:**
```json
{ "example": "TBD" }
```
- **Errors:** TBD
- **Validation:** TBD
- **Mock location:** TBD

## 4. Shared data types

| Type | Fields | Source of truth |
|---|---|---|
| TBD | TBD | `docs/DATABASE-SCHEMA.md` |

## 5. Change rules
- **Additive** (new endpoint, new optional field): update this file in the same commit as the code, send `CONTRACT additive`.
- **Breaking** (rename, remove, type or error-format change): send `CONTRACT breaking` first, wait for every consumer's `ok`, then merge.
- After `CONTRACT FREEZE v1`, only additive changes without agreement.

## 6. Open contract questions

| Question | Owner | Status |
|---|---|---|
| TBD | M2 | Open |
