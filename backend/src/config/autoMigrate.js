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
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- USERS
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        active_token_hash TEXT,
        device_id TEXT,
        last_login_at TIMESTAMPTZ,
        is_locked BOOLEAN NOT NULL DEFAULT false,
        locked_until TIMESTAMPTZ,
        failed_attempts INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active_token_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- PROFILES
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        display_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- PASSWORD RESET TOKENS
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

      -- LOANS
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

      -- TRANSACTIONS
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL DEFAULT 0,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_type TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_type TEXT;
      CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(loan_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

      -- INVESTORS
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

      -- INVESTOR PAYMENTS
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
      CREATE INDEX IF NOT EXISTS idx_investor_payments_user_id ON investor_payments(user_id);

      -- LOGIN HISTORY
      CREATE TABLE IF NOT EXISTS login_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        ip_address TEXT DEFAULT 'unknown',
        user_agent TEXT DEFAULT 'unknown',
        device_id TEXT,
        success BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE login_history ADD COLUMN IF NOT EXISTS device_id TEXT;
      ALTER TABLE login_history ADD COLUMN IF NOT EXISTS success BOOLEAN NOT NULL DEFAULT true;
      CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);

      -- NOTIFICATIONS
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_loans_customer_name ON loans(customer_name);

      -- AUDIT LOGS
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details JSONB,
        ip_hint TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

      -- LOGIN ATTEMPTS (Brute Force Protection)
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identifier TEXT NOT NULL,
        attempt_type TEXT NOT NULL DEFAULT 'email',
        failed_count INT NOT NULL DEFAULT 1,
        locked_until TIMESTAMPTZ,
        last_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(identifier, attempt_type)
      );
      CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier);

      -- ADMIN ALERT EMAILS
      CREATE TABLE IF NOT EXISTS admin_alert_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT 'Admin',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_admin_alert_emails_active ON admin_alert_emails(is_active);

      -- HIGH PAYMENT ALERT LOG
      CREATE TABLE IF NOT EXISTS high_payment_alert_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL,
        loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        payment_date DATE NOT NULL,
        recipients TEXT[] NOT NULL DEFAULT '{}',
        sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_high_payment_alert_log_txn ON high_payment_alert_log(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_high_payment_alert_log_loan ON high_payment_alert_log(loan_id);
      CREATE INDEX IF NOT EXISTS idx_high_payment_alert_log_sent ON high_payment_alert_log(sent_at DESC);
    `);

    // Fix existing notifications FK constraint (existing DB may have ON DELETE SET NULL or no action)
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'notifications_loan_id_fkey'
          AND table_name = 'notifications'
        ) THEN
          ALTER TABLE notifications DROP CONSTRAINT notifications_loan_id_fkey;
          ALTER TABLE notifications ADD CONSTRAINT notifications_loan_id_fkey
            FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Triggers
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    const triggers = [
      { name: 'update_users_updated_at', table: 'users' },
      { name: 'update_loans_updated_at', table: 'loans' },
      { name: 'update_investors_updated_at', table: 'investors' },
      { name: 'update_profiles_updated_at', table: 'profiles' },
      { name: 'update_admin_alert_emails_updated_at', table: 'admin_alert_emails' },
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

    // Brute force protection functions
    await client.query(`
      CREATE OR REPLACE FUNCTION record_failed_login(p_email TEXT, p_ip TEXT)
      RETURNS VOID LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO login_attempts (identifier, attempt_type, failed_count, last_attempt)
        VALUES (lower(p_email), 'email', 1, now())
        ON CONFLICT (identifier, attempt_type)
        DO UPDATE SET
          failed_count = login_attempts.failed_count + 1,
          last_attempt = now(),
          locked_until = CASE
            WHEN login_attempts.failed_count + 1 >= 5 THEN now() + INTERVAL '15 minutes'
            ELSE NULL
          END;

        INSERT INTO login_attempts (identifier, attempt_type, failed_count, last_attempt)
        VALUES (p_ip, 'ip', 1, now())
        ON CONFLICT (identifier, attempt_type)
        DO UPDATE SET
          failed_count = login_attempts.failed_count + 1,
          last_attempt = now(),
          locked_until = CASE
            WHEN login_attempts.failed_count + 1 >= 20 THEN now() + INTERVAL '1 hour'
            ELSE NULL
          END;
      END;
      $$;

      CREATE OR REPLACE FUNCTION is_login_allowed(p_email TEXT, p_ip TEXT)
      RETURNS BOOLEAN LANGUAGE plpgsql AS $$
      DECLARE
        v_email_locked BOOLEAN;
        v_ip_locked BOOLEAN;
      BEGIN
        SELECT (locked_until IS NOT NULL AND locked_until > now())
        INTO v_email_locked FROM login_attempts
        WHERE identifier = lower(p_email) AND attempt_type = 'email';

        SELECT (locked_until IS NOT NULL AND locked_until > now())
        INTO v_ip_locked FROM login_attempts
        WHERE identifier = p_ip AND attempt_type = 'ip';

        RETURN NOT COALESCE(v_email_locked, false) AND NOT COALESCE(v_ip_locked, false);
      END;
      $$;

      CREATE OR REPLACE FUNCTION clear_login_attempts(p_email TEXT, p_ip TEXT)
      RETURNS VOID LANGUAGE plpgsql AS $$
      BEGIN
        DELETE FROM login_attempts
        WHERE (identifier = lower(p_email) AND attempt_type = 'email')
           OR (identifier = p_ip AND attempt_type = 'ip');
      END;
      $$;
    `);

    console.log('✅ Auto-migration complete — schema is up-to-date.');
  } catch (err) {
    console.error('❌ Auto-migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { autoMigrate };
