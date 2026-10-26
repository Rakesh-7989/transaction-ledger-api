-- ============================================================================
-- Site: transaction-ledger-api
-- Schema: accounts + transactions with database-enforced integrity.
-- Run once against the target database (e.g. Supabase PostgreSQL).
-- ============================================================================

-- pgcrypto is required for gen_random_uuid(). Enabled by default on Supabase,
-- but added explicitly for portability.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- accounts: one row per ledger account. balance is system-owned.
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- transactions: immutable append-only ledger.
-- UNIQUE (account_id, reference_id) enforces per-account duplicate reference
-- protection even when requests overlap.
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, reference_id)
);

-- Deterministic latest-first history lookups.
CREATE INDEX IF NOT EXISTS idx_transactions_account_created
  ON transactions (account_id, created_at DESC, id DESC);

-- Immutability guard: reject any UPDATE or DELETE on transaction rows at the
-- database layer. The API exposes no write endpoints for transactions; this
-- trigger is defense-in-depth.
CREATE OR REPLACE FUNCTION guard_transactions_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'transactions are immutable; UPDATE and DELETE are not allowed';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transactions_immutable ON transactions;
CREATE TRIGGER trg_transactions_immutable
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION guard_transactions_immutable();
