# Transaction Ledger API

Production-quality transaction ledger API built with Node.js 24, Express,
PostgreSQL (Supabase), and deployed on Vercel. Zero authentication, zero
frontend — just the four REST endpoints required by the assignment.

## Live API

Deployed on Vercel: **[https://transaction-ledger-api.vercel.app](https://transaction-ledger-api.vercel.app)**

Database: Supabase PostgreSQL (managed).

## Scope

- `POST /accounts` — Create account with server-generated UUID + timestamp, initial balance `0.00`.
- `POST /accounts/:accountId/transactions` — Credit or debit a transaction.
- `GET /accounts/:accountId/balance` — Get current balance.
- `GET /accounts/:accountId/transactions` — Filtered, paginated transaction history.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 (ES modules) |
| API framework | Express.js |
| Database | PostgreSQL on Supabase |
| DB client | `pg` (node-postgres) |
| Validation | Zod |
| Testing | Node `node:test` + Supertest |
| Deployment | Vercel (serverless) |

## Prerequisites

- Node.js >= 20 and npm
- A Supabase project with PostgreSQL provisioned
- A Vercel account (for deployment)

## Database setup (Supabase)

1. Create a new Supabase project (e.g. `transaction-ledger-api`).
2. In the Supabase Dashboard → SQL Editor, run `src/db/schema.sql`.
3. In the Supabase Dashboard → Settings → Database, copy the **connection string** (use the pooled connection string with `?pgbouncer=true&connection_limit=1` for serverless compatibility).
4. Create a `.env` file from `.env.example` and set `DATABASE_URL` to your Supabase pooled connection string.

Never commit `.env` or real credentials to Git.

## Install and run locally

```bash
npm install
cp .env.example .env   # then edit .env with your Supabase DATABASE_URL
npm start              # local server on http://localhost:3000
npm run dev            # watch mode
```

## Deploy on Vercel

1. Push this repository to GitHub.
2. In Vercel, import the repository `Rakesh-7989/transaction-ledger-api`.
3. Add the environment variable `DATABASE_URL` (Supabase pooled connection string) under **Project Settings → Environment Variables**.
4. Deploy. The API will be available at your Vercel project URL.

## Run tests

```bash
npm test
```

Tests run against the database configured in `DATABASE_URL`. Use a dedicated test database or ensure the target database can be truncated safely.

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/accounts` | Create account |
| POST | `/accounts/:accountId/transactions` | Add credit/debit transaction |
| GET | `/accounts/:accountId/balance` | Get balance |
| GET | `/accounts/:accountId/transactions` | Transaction history (filter + paginate) |

See `docs/api-examples.md` for sample requests and responses.

## Key engineering decisions

- **Row locking**: `SELECT ... FOR UPDATE` serializes balance changes per account, preventing overdrafts under concurrency.
- **Duplicate prevention**: `UNIQUE(account_id, reference_id)` at the database level, plus an application check before mutation. Same reference may be reused by different accounts.
- **Atomicity**: Transaction insert + balance update happen in one `BEGIN`/`COMMIT`. Failures issue `ROLLBACK` before responding — no orphan transaction records.
- **Immutability**: No update/delete endpoints for transactions. A PostgreSQL trigger rejects `UPDATE`/`DELETE` on transaction rows.
- **Monetary precision**: PostgreSQL `NUMERIC(12,2)` for all money; values returned as decimal strings (e.g. `"70.00"`).
- **Serverless-friendly DB**: Uses Supabase connection pooler (`?pgbouncer=true`) so Vercel functions reuse connections.

## Known limitations

- Supabase Free plan projects may pause after inactivity; the first request after a pause may be slow.
- No authentication layer (out of scope for this assignment).
- Single database environment; tests run against the configured `DATABASE_URL`.

## Assumptions

1. **Single database environment**: All tests run against the configured `DATABASE_URL`. A dedicated test database is recommended for CI/CD.
2. **No authentication**: Authentication and authorization are out of scope for this assignment. The API is open without auth tokens.
3. **Monetary precision**: All monetary values use PostgreSQL `NUMERIC(12,2)`. JavaScript floating-point arithmetic is never used for balance calculations. All arithmetic happens in the database.
4. **Immutability**: Transaction records cannot be updated or deleted. No PUT/DELETE endpoints exist for transactions, and a PostgreSQL trigger enforces this at the database layer.
5. **Duplicate reference prevention**: `reference_id` must be unique per account. The same `reference_id` can be reused across different accounts.
6. **Concurrent request safety**: `SELECT ... FOR UPDATE` row locking serializes balance changes per account, preventing overdrafts under concurrency.
7. **Failed transactions leave no trace**: Failed debits (insufficient funds) and duplicate references are rejected with HTTP 422/409 and leave no transaction record or balance change.
8. **Pagination defaults**: `page` defaults to 1, `limit` defaults to 10, `limit` maximum is 100.
9. **Deterministic ordering**: Transaction history is ordered by `created_at DESC, id DESC` for stable results when timestamps are identical.
10. **Error format**: All errors use a consistent JSON shape: `{ "error": { "code": "...", "message": "..." } }`.
