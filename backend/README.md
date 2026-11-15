# QurbaniOS backend (M2)

This is the imported authentication starter for local verification. See
[architecture](../docs/ARCHITECTURE.md) for the Fastify port and
[API contract](../docs/API-CONTRACT.md) for the proposed frontend interface.

Use Node.js 24. From this directory:

```sh
npm ci
npm run build
npm run typecheck
npm test
```

For a local smoke test, copy this directory's `.env.example` to `.env`.
Use a dedicated development database and Supabase project. Set
`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
and `ALLOWED_ORIGINS` for that environment. Then run:

```sh
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

The starter's health check is `GET /health` with the default empty API prefix.
Its routes and Swagger are for baseline verification. Use the draft API
contract and agreed mocks for frontend development until M2 announces route readiness.
