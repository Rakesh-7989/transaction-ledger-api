# Transaction Ledger API

Zero-cost, local-first CRUD API for financial transaction ledgering. Built with
Node.js + Express + PostgreSQL. Designed for the Walnut Folks Group assignment.

## Scope

- Account creation with a system-generated UUID and timestamp.
- Credit/debit transactions with reliable, atomic balance updates.
- Per-account duplicate reference protection.
- Balance and paginated transaction-history endpoints.
- Immutable transaction records and database-enforced integrity.
- Automated tests and API documentation.

No paid APIs, hosted database, or deployment is required — everything runs
locally on your machine.

## Tech stack

- **Node.js** (ES modules) + **Express.js** — REST API, middleware, structured
  error responses.
- **PostgreSQL** — relational storage, constraints, transactions, row locking.
- **pg** — PostgreSQL client for Node.js.
- **zod** — input validation.
- **dotenv** — local configuration.
- **supertest** + **node:test** — automated API tests (no extra test framework).

## Prerequisites

- Node.js >= 20 (tested with v24.11.0) and npm (tested with 11.6.1)
- PostgreSQL (tested with PostgreSQL 16)

## Database setup (one time)

This project runs a local PostgreSQL instance. If you already have a local
PostgreSQL, create the database and user, then skip to "Apply the schema".

### Option A: use the scripts below (PostgreSQL 16 on Windows)

Start a local instance on port 5433 (avoids conflicting with any existing
PostgreSQL service):

```powershell
# Create a fresh data directory and initialise it (trust auth, local only)
C:\"Program Files"\PostgreSQL\16\bin\initdb.exe -D .\ledger-pgdata -U postgres --auth=trust --locale=C

# Start it on port 5433
C:\"Program Files"\PostgreSQL\16\bin\pg_ctl.exe -D .\ledger-pgdata -l .\ledger-pgdata\server.log -o "-p 5433" start
```

Create the application user and database:

```powershell
C:\"Program Files"\PostgreSQL\16\bin\psql.exe -U postgres -h 127.0.0.1 -p 5433 -c "CREATE USER ledger_user WITH PASSWORD 'ledger_pass' LOGIN;"
C:\"Program Files"\PostgreSQL\16\bin\psql.exe -U postgres -h 127.0.0.1 -p 5433 -c "CREATE DATABASE transaction_ledger OWNER ledger_user;"
C:\"Program Files"\PostgreSQL\16\bin\psql.exe -U postgres -h 127.0.0.1 -p 5433 -c "GRANT ALL PRIVILEGES ON DATABASE transaction_ledger TO ledger_user;"
```

Apply the schema:

```powershell
C:\"Program Files"\PostgreSQL\16\bin\psql.exe -U ledger_user -h 127.0.0.1 -p 5433 -d transaction_ledger -f src/db/schema.sql
```

Verify the connection:

```powershell
C:\"Program Files"\PostgreSQL\16\bin\psql.exe -U ledger_user -h 127.0.0.1 -p 5433 -d transaction_ledger -c "SELECT current_user, current_database();"
```

### Option B: use an existing local PostgreSQL

Create a user and database, then point `DATABASE_URL` at them (port 5432 by
default). The schema is in `src/db/schema.sql`.

## Configuration

Copy `.env.example` to `.env` and fill in your local credentials:

```powershell
copy .env.example .env
```

`.env` (never committed):

```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://ledger_user:ledger_pass@127.0.0.1:5433/transaction_ledger
```

> Note: this repo runs its local PostgreSQL on port **5433** (not the default
> 5432) so it can coexist with any system PostgreSQL service. Update
> `DATABASE_URL` if you use a different port.

## Install and run

```powershell
npm install
npm start          # production-mode server
npm run dev        # watch mode for development
```

The API listens on `http://localhost:3000`.

## Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/accounts` | Create account |
| POST | `/accounts/:accountId/transactions` | Add credit or debit |
| GET | `/accounts/:accountId/balance` | Retrieve balance |
| GET | `/accounts/:accountId/transactions?type=&page=&limit=` | Transaction history |

See `docs/api-examples.md` for sample requests and responses.

## Running the tests

```powershell
npm test
```

This runs `node --test`, which executes `tests/*.test.js` using Node's built-in
test runner with Supertest for HTTP assertions.

## Key engineering decisions

- **Row locking**: `SELECT ... FOR UPDATE` serialises balance changes for the
  same account, so concurrent debits cannot overdraw (only one succeeds).
- **Duplicate prevention**: `UNIQUE (account_id, reference_id)` plus an
  application-level check before any mutation. The same reference may be reused
  by different accounts.
- **Rollback**: credit/debit insert + balance update happen in a single
  `BEGIN`/`COMMIT`. Any failure issues `ROLLBACK` before responding — a failed
  debit leaves no transaction record behind.
- **Immutability**: no update/delete endpoints exist for transactions, and a
  PostgreSQL trigger rejects `UPDATE`/`DELETE` on transaction rows at the
  database layer.
- **Monetary precision**: PostgreSQL `NUMERIC(12,2)` is used for all money;
  JavaScript floating-point is never used for arithmetic. Values are returned
  as decimal strings (e.g. `"70.00"`).
- **Consistent errors**: a single JSON error shape (`{ error: { code, message } }`)
  with HTTP statuses 400/404/409/422/500. Nothing internal is leaked.

## Known limitations

- Single-node local PostgreSQL; no replication or connection pooling tuning.
- The local instance is started manually (scripts above); not auto-managed by
  the app.
- Tested on Windows with Node.js v24.11.0 / npm 11.6.1 / PostgreSQL 16.
