const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const createPool = () => {
  if (connectionString) {
    return new Pool({
      connectionString,
      ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '3000', 10),
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
      allowExitOnIdle: true,
    });
  }

  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'sri_vinayaka',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX || '15', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '3000', 10),
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    allowExitOnIdle: false,
  });
};

const globalForPg = globalThis;
const pool = globalForPg.__svtPgPool || createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForPg.__svtPgPool = pool;
}

// #4 Fix: Connection retry/reconnect — log but don't crash on transient errors
pool.on('error', (err) => {
  console.error('⚠️ Unexpected database pool error (connection will be retried):', err.message);
  // Pool automatically removes dead connections and creates new ones on next query
});

const testConnection = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('PostgreSQL connected:', result.rows[0].now);
      client.release();
      return;
    } catch (err) {
      console.error(`PostgreSQL connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) {
        throw err;
      }
      console.log(`   Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

module.exports = { pool, testConnection };
