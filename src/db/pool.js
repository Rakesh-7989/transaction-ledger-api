import { Pool } from 'pg';
import { config } from '../config/env.js';

/**
 * PostgreSQL connection pool.
 *
 * For Vercel serverless + Supabase, DATABASE_URL should point to Supabase's
 * connection pooler (port 6543, ?pgbouncer=true) so each function invocation
 * reuses connections instead of opening a fresh direct Postgres connection.
 *
 * node-pg returns NUMERIC values as strings by default, which we rely on to
 * avoid JavaScript floating-point rounding for monetary values.
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Keep idle connections for reuse across invocations in serverless.
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
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
