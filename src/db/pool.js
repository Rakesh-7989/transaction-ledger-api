import { Pool } from 'pg';
import { config } from '../config/env.js';

/**
 * PostgreSQL connection pool.
 *
 * node-pg returns NUMERIC values as strings by default, which we rely on to
 * avoid JavaScript floating-point rounding for monetary values.
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
});

/**
 * Run a query with a pooled client.
 */
export async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Borrow a pooled client (caller must release it).
 */
export async function getClient() {
  return pool.connect();
}

export default pool;
