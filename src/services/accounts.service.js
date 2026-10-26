import { pool } from '../db/pool.js';
import { createAccountSchema } from '../validators/accounts.validator.js';
import { AppError } from '../middleware/error-handler.js';

/**
 * Create a new account with a system-generated UUID and zero balance.
 * The client cannot supply `balance` (schema is strict).
 */
export async function createAccount(data) {
  const parsed = createAccountSchema.parse(data);

  const { rows } = await pool.query(
    `INSERT INTO accounts (name)
     VALUES ($1)
     RETURNING id, name, balance, created_at`,
    [parsed.name]
  );

  const account = rows[0];
  return {
    id: account.id,
    name: account.name,
    balance: Number(account.balance).toFixed(2),
    created_at: account.created_at,
  };
}

/**
 * Return the current balance for an account (404 if missing).
 */
export async function getBalance(accountId) {
  const { rows } = await pool.query(
    `SELECT balance FROM accounts WHERE id = $1`,
    [accountId]
  );
  if (rows.length === 0) {
    throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
  }
  return Number(rows[0].balance).toFixed(2);
}
