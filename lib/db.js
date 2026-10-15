// PostgreSQL connection pool and query helpers
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let _pool = null;

export function getPool() {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[DB] DATABASE_URL is not set. Database operations will fail.');
    return null;
  }

  _pool = new Pool({
    connectionString,
    max: Number(process.env.PG_MAX_CONNECTIONS || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  _pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle PostgreSQL client:', err.message);
  });

  return _pool;
}

export async function query(text, params = [], client = null) {
  const pool = getPool();
  if (!pool && !client) {
    throw new Error('Database pool not initialized. Check DATABASE_URL in environment.');
  }
  const executor = client || pool;
  const start = Date.now();
  try {
    const res = await executor.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 200) {
      console.log(`[DB] Slow query (${duration}ms):`, text.slice(0, 100));
    }
    return res;
  } catch (err) {
    console.error('[DB Query Error]:', err.message, 'SQL:', text);
    throw err;
  }
}

}

/**
 * Run all callback queries on one checked-out PostgreSQL connection.
 * This is required for transactions and row-level locks; pool.query() can
 * dispatch each statement to a different connection.
 */
export async function withTransaction(fn) {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not initialized. Check DATABASE_URL in environment.');
  }
  const client = await pool.connect();
  let began = false;
  try {
    await client.query('BEGIN');
    began = true;
    const result = await fn(client);
    await client.query('COMMIT');
    began = false;
    return result;
  } catch (err) {
    if (began) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[DB] Transaction rollback failed:', rollbackError.message);
      }
    }
    throw err;
  } finally {
    client.release();
  }
}


/**
 * Append-only audit logger for pricing changes
 */
export async function logAudit({ adminEmail, tableName, recordId, action, oldValues = null, newValues = null, client = null }) {
  const sql = `
    INSERT INTO pricing_audit_history (admin_email, table_name, record_id, action, old_values, new_values)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, changed_at
  `;
  const params = [
    adminEmail || 'system@stb',
    tableName,
    String(recordId),
    action,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null
  ];

  if (client) {
    return await client.query(sql, params);
  }
  return await query(sql, params);
}

export async function testConnection() {
  try {
    const res = await query('SELECT NOW() AS current_time');
    return { ok: true, time: res.rows[0].current_time };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
