import { Pool, PoolConfig, QueryResult } from 'pg';
import { config } from '../config';

const poolConfig: PoolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

if (config.db.url) {
  poolConfig.connectionString = config.db.url;
  if (config.db.ssl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else {
  poolConfig.host = config.db.host;
  poolConfig.port = config.db.port;
  poolConfig.database = config.db.name;
  poolConfig.user = config.db.user;
  poolConfig.password = config.db.password;
  if (config.db.ssl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    console.log('[DB]', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
  }
  return result;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully');
    return true;
  } catch (error: any) {
    console.error('✗ Database connection failed:', error.message || error);
    return false;
  }
}

export default pool;
