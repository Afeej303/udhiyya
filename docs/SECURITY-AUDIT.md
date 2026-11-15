# Security Audit — IDLE-03 (Security & Isolation Audit Pass)

- **Tested commit:** `b57ae9f` (working tree audited; EF-04/EF-05 are untracked WIP — see Limitations)
- **Date:** 2026-11-15
- **Auditor:** Tester agent (5e43bebf)
- **Overall result:** **PASS — no Critical or High vulnerabilities found**

## Methodology
Static inspection + repo-wide secret scanning + reuse of V0/V1 evidence from `docs/VERIFICATION/`. No live deployment available in this worktree; authz/flag behavior verified via test suites and code, not live HTTP. No destructive tests, no production data.

## 1. Credentials & secrets — PASS
- Deep regex scan (AWS `AKIA…`, `sk-…`, `ghp_…`, `xox…`, `AIza…`, PEM private-key blocks, `password=`, `secret=` assignments) across `backend/`, `enhancements/`, `frontend/`, `shared/`, `docs/`: **0 hits**.
- `.env.example` files (root, `backend/`, `frontend/`): placeholders only (`replace_with_*`, `change-this-development-*`, `your-project.supabase.co`). No tracked `.env` files.
- Passwords only as schema fields (`passwordHash`) and argon2 hashing in `backend/scripts/bootstrap-admin.ts` (strength-validated); `seed.ts` explicitly creates no default admin password.

## 2. Fail-closed authorization — PASS
- Global guard chain in `backend/src/app.module.ts:107-112`: Throttler → Csrf → JwtAuth → Organization → Roles → Permissions. Guards consult `IS_PUBLIC_KEY`; everything not marked `@Public` requires auth.
- `@Public` limited to health, auth flows, and 3 GET projections (`public/programmes`, `public/distribution`, `public/communications`).
- Extensions: `ExtensionAdminGuard` + `@UseGuards` on EF-01/02/03/05 controllers and EF-04 (`enhancements/EF-04-operational-intelligence/backend/…controller.ts:32,56`); flag checks `process.env.FEATURE_EF_XX === 'on'` (default off). V1 tests assert 401 missing user, 403 non-admin, 403 flag-off.

## 3. Input validation & sanitization — PASS
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` in `backend/src/main.ts:56-58`.
- Public routes use `ParseUUIDPipe` / `ParseIntPipe` on all params; EF-01/02/03 controllers reject non-numeric/missing `programmeId` with 400 and non-array payloads with 400 (V1 evidence).
- EF-02 commit ignores client-supplied allocations — server decodes the signed token payload only.

## 4. EF-02 HMAC preview-token binding — PASS
- Secret from `EF02_PREVIEW_SECRET` env; service throws `CONFIG_ERROR` and refuses to operate when unset (fail-closed, no hardcoded fallback).
- Token = `<base64url(payload)>.<HMAC-SHA256 sig>`; verified with `crypto.timingSafeEqual` (length-checked); `expiresAt` TTL enforced; payload includes nonce; commit replay rejected 410; share cap enforced under `FOR UPDATE` row lock (`liveCount + 1 <= 7`).

## 5. Rate limiting — PASS (with Low finding)
- `ThrottlerModule.forRootAsync` + global `ThrottlerGuard`; default 60 req/min; auth endpoints `@Throttle` 5–20/min; `@SkipThrottle` only on health. Public GET projections inherit the global throttle.

## Findings
| ID | Severity | Description | Status |
|---|---|---|---|
| SEC-01 | Low | Public projection endpoints inherit the generic 60/min global limit; consider tighter per-route limits for auth-adjacent public GETs. | Recommendation |
| SEC-02 | Low | `frontend/.env.example` ships `VITE_FEATURE_EF_01=true` (client build-flag default on). Backend stays authoritative (403 when `FEATURE_EF_01` off), so impact is cosmetic/demo-only, but it contradicts merge-dark default-off policy. Recommend template default `false`. | Recommendation |
| SEC-03 | Info | Untracked root `package.json` / `package-lock.json` (tsx only). Repo hygiene — do not commit accidentally. | Noted |
| SEC-04 | Info | `.env.example` templates contain localhost `postgres:postgres` DSNs and `change-this-*` placeholders. Acceptable for dev; never replace with real values. | Noted |
| SEC-05 | Info | EF-04/EF-05 are untracked WIP. EF-04 was mid-restructure during this audit (flat dirs removed; proper module now present with guard + flag + tests). Re-run this audit slice on their final merge commits. | Follow-up |

## Commands executed
- `grep -rniE "(sk-…|ghp_…|AKIA…|-----BEGIN … PRIVATE KEY-----|xox…|AIza…)"` over repo (excl. node_modules/lockfiles) — clean.
- `cat .env.example backend/.env.example frontend/.env.example`
- `grep -rn "@Controller|@UseGuards|@Public|APP_GUARD" backend/src`
- `grep -n "SECRET|secret" enhancements/EF-02-smart-allocation/backend/smart-allocation.service.ts`
- `grep -rn "UseGuards|ExtensionAdminGuard|FEATURE_EF_0…|process.env" enhancements/EF-04-operational-intelligence/ backend/ enhancements/EF-05-household-intelligence/`
- `awk '/getPublic|publicDistribution/,/^}/' backend/src/programmes/programmes.service.ts backend/src/distribution/distribution.service.ts`

## Limitations
- No live shared deployment in this worktree; authz/flag/rate-limit behavior verified via V1 suites + code inspection, not live HTTP. No DAST/fuzzing performed.
- EF-04/EF-05 audited at current tree only; see SEC-05.

## Verdict
**IDLE-03: PASS.** No Critical/High findings. Two Low recommendations (SEC-01, SEC-02) and three Info notes for owners. Ready for task closure; SEC-05 follow-up required when EF-04/EF-05 merge.
