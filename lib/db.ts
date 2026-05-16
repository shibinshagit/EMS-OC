import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (process.env.NODE_ENV !== 'production') {
      const duration = Date.now() - start;
      console.log('[v0] Executed query', { duration_ms: duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('[v0] Database error:', error);
    throw error;
  }
}

export async function getClient() {
  return pool.connect();
}

export default pool;
