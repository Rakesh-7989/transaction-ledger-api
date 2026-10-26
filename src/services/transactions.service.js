import { pool, getClient } from '../db/pool.js';
import { createTransactionSchema } from '../validators/transactions.validator.js';
import { historyQuerySchema } from '../validators/transactions.validator.js';
import { AppError } from '../middleware/error-handler.js';

/**
 * Create one immutable transaction and update the account balance in a single
 * database transaction with the account row locked (SELECT ... FOR UPDATE).
 *
 * Algorithm:
 *   1. BEGIN; lock account row FOR UPDATE (serialises per-account concurrency).
 *   2. 404 if account missing.
 *   3. 409 if reference_id already used for this account (no mutation).
 *   4. 422 if debit would make balance negative (no mutation).
 *   5. INSERT transaction row.
 *   6. UPDATE account balance.
 *   7. COMMIT (or ROLLBACK on any failure).
 */
export async function createTransaction({
  accountId,
  type,
  amount,
  description,
  reference_id,
}) {
  const parsed = createTransactionSchema.parse({
    type,
    amount,
    description,
    reference_id,
  });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Lock the requested account row.
    const { rows: accounts } = await client.query(
      `SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE`,
      [accountId]
    );

    // 2. Account must exist.
    if (accounts.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
    }
    const currentBalance = Number(accounts[0].balance);

    // 3. Duplicate reference protection (before any mutation).
    const { rows: existing } = await client.query(
      `SELECT 1 FROM transactions
       WHERE account_id = $1 AND reference_id = $2`,
      [accountId, parsed.reference_id]
    );
    if (existing.length > 0) {
      await client.query('ROLLBACK');
      throw new AppError(
        'Duplicate reference for this account',
        409,
        'DUPLICATE_TRANSACTION'
      );
    }

    // 4. Sufficient funds for a debit.
    let newBalance;
    if (parsed.type === 'debit') {
      if (currentBalance < parsed.amount) {
        await client.query('ROLLBACK');
        throw new AppError('Insufficient balance', 422, 'INSUFFICIENT_BALANCE');
      }
      newBalance = currentBalance - parsed.amount;
    } else {
      newBalance = currentBalance + parsed.amount;
    }

    // 5. Insert the immutable transaction record.
    const { rows: txRows } = await client.query(
      `INSERT INTO transactions (account_id, type, amount, description, reference_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, account_id, type, amount, description, reference_id, created_at`,
      [accountId, parsed.type, parsed.amount, parsed.description, parsed.reference_id]
    );

    // 6. Update the account balance (same transaction).
    await client.query(
      `UPDATE accounts SET balance = $1 WHERE id = $2`,
      [newBalance.toFixed(2), accountId]
    );

    await client.query('COMMIT');

    const tx = txRows[0];
    return {
      transaction: {
        id: tx.id,
        account_id: tx.account_id,
        type: tx.type,
        amount: Number(tx.amount).toFixed(2),
        description: tx.description,
        reference_id: tx.reference_id,
        created_at: tx.created_at,
      },
      balance: newBalance.toFixed(2),
    };
  } catch (err) {
    // Roll back before surfacing the failure.
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* ignore rollback errors */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Paginated transaction history for an account.
 * Deterministic ordering: created_at DESC, id DESC.
 */
export async function getHistory(accountId, query) {
  const parsed = historyQuerySchema.parse(query);
  const { type, page, limit } = parsed;
  const offset = (page - 1) * limit;

  // The account must exist (mirrors the balance endpoint).
  const { rows: acctRows } = await pool.query(
    `SELECT 1 FROM accounts WHERE id = $1`,
    [accountId]
  );
  if (acctRows.length === 0) {
    throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
  }

  // total count
  const countValues = [accountId];
  let countTypeFilter = '';
  let cIdx = 2;
  if (type) {
    countTypeFilter = `AND type = $${cIdx++}`;
    countValues.push(type);
  }
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM transactions
     WHERE account_id = $1 ${countTypeFilter}`,
    countValues
  );
  const totalRecords = countRows[0].total;
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

  // data page
  const values = [accountId];
  let typeFilter = '';
  let vIdx = 2;
  if (type) {
    typeFilter = `AND type = $${vIdx++}`;
    values.push(type);
  }
  values.push(limit, offset);

  const { rows: data } = await pool.query(
    `SELECT id, account_id, type, amount, description, reference_id, created_at
     FROM transactions
     WHERE account_id = $1 ${typeFilter}
     ORDER BY created_at DESC, id DESC
     LIMIT $${vIdx++} OFFSET $${vIdx++}`,
    values
  );

  return {
    account_id: accountId,
    data: data.map((tx) => ({
      id: tx.id,
      account_id: tx.account_id,
      type: tx.type,
      amount: Number(tx.amount).toFixed(2),
      description: tx.description,
      reference_id: tx.reference_id,
      created_at: tx.created_at,
    })),
    pagination: {
      page,
      limit,
      total_records: totalRecords,
      total_pages: totalPages,
    },
  };
}
