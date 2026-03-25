-- Migration: High Payment Alert Tables
-- Idempotent — safe to run multiple times
-- Run: psql -U postgres -d sri_vinayaka -f backend/database/migration_high_payment_alerts.sql

-- ============================================================
-- Ensure update_updated_at_column() function exists
-- (already created in full_migration_for_psql.sql, kept here
--  as a safety net in case this is run standalone)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Ensure payment_type column exists in transactions
-- (used by backend but may be absent from older schemas)
-- ============================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_type TEXT;

-- ============================================================
-- ADMIN ALERT EMAILS TABLE
-- Stores admin email addresses that receive high-payment alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_alert_emails (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL DEFAULT 'Admin',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_alert_emails_active
  ON admin_alert_emails(is_active);

-- Trigger for auto updated_at (idempotent check)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_admin_alert_emails_updated_at'
  ) THEN
    CREATE TRIGGER update_admin_alert_emails_updated_at
      BEFORE UPDATE ON admin_alert_emails
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- HIGH PAYMENT ALERT LOG TABLE
-- Audit trail of every alert email that was sent
-- ============================================================
CREATE TABLE IF NOT EXISTS high_payment_alert_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID        NOT NULL,
  loan_id        UUID        NOT NULL REFERENCES loans(id)  ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  amount         NUMERIC     NOT NULL,
  payment_date   DATE        NOT NULL,
  recipients     TEXT[]      NOT NULL DEFAULT '{}',
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_high_payment_alert_log_txn
  ON high_payment_alert_log(transaction_id);

CREATE INDEX IF NOT EXISTS idx_high_payment_alert_log_loan
  ON high_payment_alert_log(loan_id);

CREATE INDEX IF NOT EXISTS idx_high_payment_alert_log_sent
  ON high_payment_alert_log(sent_at DESC);

-- ============================================================
-- SEED: Add your admin alert email addresses here.
-- Replace the example values before running.
-- ============================================================
-- INSERT INTO admin_alert_emails (email, name) VALUES
--   ('admin@yourcompany.com',   'Super Admin'),
--   ('manager@yourcompany.com', 'Manager')
-- ON CONFLICT (email) DO NOTHING;
