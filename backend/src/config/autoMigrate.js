const { pool } = require('./database');

/**
 * Auto-migration: Runs idempotent SQL on startup to ensure schema is up-to-date.
 * Safe to run multiple times — only makes changes if needed.
 */
async function autoMigrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running auto-migration...');

    await client.query(`
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- ============================================================
      -- USERS TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        active_token_hash TEXT,
        device_id TEXT,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Add columns that may be missing from older schemas
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active_token_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- ============================================================
      -- PROFILES TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        display_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- ============================================================
      -- PASSWORD RESET TOKENS TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

      -- ============================================================
      -- LOANS TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS loans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        customer_name TEXT NOT NULL,
        phone TEXT,
        loan_type TEXT NOT NULL,
        loan_amount NUMERIC NOT NULL DEFAULT 0,
        given_amount NUMERIC NOT NULL DEFAULT 0,
        interest_rate NUMERIC,
        duration_value NUMERIC,
        duration_unit TEXT,
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
      CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

      -- ============================================================
      -- TRANSACTIONS TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL DEFAULT 0,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(loan_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

      -- ============================================================
      -- INVESTORS TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS investors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        investment_amount NUMERIC NOT NULL DEFAULT 0,
        investment_type TEXT NOT NULL,
        profit_rate NUMERIC NOT NULL DEFAULT 0,
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status TEXT NOT NULL DEFAULT 'On Track',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_investors_user_id ON investors(user_id);

      -- ============================================================
      -- INVESTOR PAYMENTS TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS investor_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL DEFAULT 0,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_type TEXT NOT NULL,
        remarks TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_investor_payments_investor_id ON investor_payments(investor_id);

      -- ============================================================
      -- LOGIN HISTORY TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS login_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        ip_address TEXT DEFAULT 'unknown',
        user_agent TEXT DEFAULT 'unknown',
        device_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Add device_id column if missing from older schemas
      ALTER TABLE login_history ADD COLUMN IF NOT EXISTS device_id TEXT;

      CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);

      -- ============================================================
      -- NOTIFICATIONS TABLE
      -- ============================================================
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
    `);

    // Create triggers separately (CREATE OR REPLACE handles idempotency)
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers (drop first to avoid "already exists" errors)
    const triggers = [
      { name: 'update_users_updated_at', table: 'users' },
      { name: 'update_loans_updated_at', table: 'loans' },
      { name: 'update_investors_updated_at', table: 'investors' },
      { name: 'update_profiles_updated_at', table: 'profiles' },
    ];

    for (const t of triggers) {
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${t.name}') THEN
            CREATE TRIGGER ${t.name}
              BEFORE UPDATE ON ${t.table}
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
        END $$;
      `);
    }

    console.log('✅ Auto-migration complete — schema is up-to-date.');
  } catch (err) {
    console.error('❌ Auto-migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { autoMigrate };
