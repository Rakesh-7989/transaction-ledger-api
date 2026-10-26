# Transaction Ledger API

Production-quality transaction ledger API built with Node.js 24, Express,
PostgreSQL (Supabase), and deployed on Vercel. Zero authentication, zero
frontend — just the four REST endpoints required by the assignment.

## Live API

Deployed on Vercel: **[LIVE_URL_PLACEHOLDER]**

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
