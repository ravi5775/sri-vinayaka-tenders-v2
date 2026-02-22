const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sri_vinayaka',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Increased pool for better concurrency — uses more RAM but faster
  max: 50,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 3000,
  statement_timeout: 30000,
  // Keep connections warm — avoids cold-start latency
  min: 10,
  allowExitOnIdle: false,
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
