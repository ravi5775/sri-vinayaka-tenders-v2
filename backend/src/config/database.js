const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sri_vinayaka',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // #8 Fix: Kill queries that run longer than 30 seconds
  statement_timeout: 30000,
});

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
      console.log('✅ PostgreSQL connected:', result.rows[0].now);
      client.release();
      return;
    } catch (err) {
      console.error(`❌ PostgreSQL connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) {
        console.error('   All connection attempts exhausted. Exiting.');
        process.exit(1);
      }
      console.log(`   Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

module.exports = { pool, testConnection };
