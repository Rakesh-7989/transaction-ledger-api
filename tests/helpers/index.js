import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';
import { readFileSync } from 'node:fs';

export { app, pool };

/**
 * Apply the SQL schema (idempotent: CREATE TABLE IF NOT EXISTS).
 */
export async function applySchema() {
  // Serialize schema application across concurrently loaded test files so
  // CREATE TABLE / CREATE FUNCTION do not deadlock on pg_proc.
  await pool.query('SELECT pg_advisory_lock(12345)');
  try {
    const sql = readFileSync('src/db/schema.sql', 'utf8');
    await pool.query(sql);
  } finally {
    await pool.query('SELECT pg_advisory_unlock(12345)');
  }
}

/**
 * Remove all rows so each test starts from a clean slate.
 */
export async function truncateTables() {
  await pool.query(
    'TRUNCATE TABLE transactions, accounts RESTART IDENTITY CASCADE'
  );
}
