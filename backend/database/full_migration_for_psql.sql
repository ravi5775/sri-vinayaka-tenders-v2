-- ============================================================
-- Sri Vinayaka Tenders - FULL POSTGRESQL MIGRATION
-- Compatible with: PostgreSQL 13+
-- 
-- HOW TO RUN:
--   psql -U postgres -d sri_vinayaka -f backend/database/full_migration_for_psql.sql
--
-- Or create the DB first:
--   createdb -U postgres sri_vinayaka
--   psql -U postgres -d sri_vinayaka -f backend/database/full_migration_for_psql.sql
--
-- This file is idempotent — safe to run multiple times.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE (replaces Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  password_hash TEXT      NOT NULL,
  display_name  TEXT,
  role          TEXT      NOT NULL DEFAULT 'admin',  -- 'admin' | 'staff' | 'viewer'
  active_token_hash TEXT,
  device_id   TEXT,
  last_login_at TIMESTAMPTZ,
  is_locked   BOOLEAN     NOT NULL DEFAULT false,
  locked_until TIMESTAMPTZ,
  failed_attempts INT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- ============================================================
-- LOANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loans (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name  TEXT        NOT NULL,
  phone          TEXT,
  loan_type      TEXT        NOT NULL CHECK (loan_type IN ('Finance', 'Tender', 'InterestRate')),
  loan_amount    NUMERIC     NOT NULL DEFAULT 0 CHECK (loan_amount >= 0),
  given_amount   NUMERIC     NOT NULL DEFAULT 0 CHECK (given_amount >= 0),
  interest_rate  NUMERIC     CHECK (interest_rate IS NULL OR (interest_rate >= 0 AND interest_rate <= 100)),
  duration_value NUMERIC     CHECK (duration_value IS NULL OR duration_value > 0),
  duration_unit  TEXT        CHECK (duration_unit IN ('Months', 'Weeks', 'Days')),
  start_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT        NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Overdue')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status  ON public.loans(status);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id      UUID        NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount       NUMERIC     NOT NULL DEFAULT 0 CHECK (amount > 0),
  payment_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON public.transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- ============================================================
-- INVESTORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investors (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  investment_amount NUMERIC     NOT NULL DEFAULT 0 CHECK (investment_amount >= 0),
  investment_type   TEXT        NOT NULL CHECK (investment_type IN ('Finance', 'Tender', 'InterestRatePlan')),
  profit_rate       NUMERIC     NOT NULL DEFAULT 0 CHECK (profit_rate >= 0 AND profit_rate <= 100),
  start_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  status            TEXT        NOT NULL DEFAULT 'On Track' CHECK (status IN ('On Track', 'Delayed', 'Closed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investors_user_id ON public.investors(user_id);

-- ============================================================
-- INVESTOR PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investor_payments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id  UUID        NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount       NUMERIC     NOT NULL DEFAULT 0 CHECK (amount > 0),
  payment_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  payment_type TEXT        NOT NULL CHECK (payment_type IN ('Principal', 'Profit', 'Interest')),
  remarks      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_payments_investor_id ON public.investor_payments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_payments_user_id     ON public.investor_payments(user_id);

-- ============================================================
-- LOGIN HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  ip_address TEXT        DEFAULT 'unknown',
  user_agent TEXT        DEFAULT 'unknown',
  device_id  TEXT,
  success    BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id    ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history(created_at DESC);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  loan_id    UUID        REFERENCES public.loans(id) ON DELETE SET NULL,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);

-- ============================================================
-- AUDIT LOGS TABLE (Security monitoring)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,   -- e.g. 'LOAN_CREATED', 'LOGIN_SUCCESS', 'LOAN_DELETED'
  entity_type TEXT,                   -- e.g. 'loan', 'transaction', 'investor'
  entity_id   TEXT,                   -- ID of the affected record
  details     JSONB,                  -- Additional context (amounts, names, etc.)
  ip_hint     TEXT,                   -- Client IP (best-effort, not trusted for auth)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id, created_at DESC);

-- ============================================================
-- BRUTE FORCE PROTECTION TABLE
-- Tracks failed login attempts per IP/email
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   TEXT        NOT NULL,   -- email or IP address
  attempt_type TEXT        NOT NULL DEFAULT 'email',  -- 'email' | 'ip'
  failed_count INT         NOT NULL DEFAULT 1,
  locked_until TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(identifier, attempt_type)
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON public.login_attempts(identifier);

-- ============================================================
-- TRIGGERS: Auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_loans_updated_at') THEN
    CREATE TRIGGER update_loans_updated_at
      BEFORE UPDATE ON public.loans
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_investors_updated_at') THEN
    CREATE TRIGGER update_investors_updated_at
      BEFORE UPDATE ON public.investors
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- FUNCTION: Lock user after too many failed attempts
-- Call this from your backend after each failed login
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT, p_ip TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempts INT;
BEGIN
  -- Track by email
  INSERT INTO public.login_attempts (identifier, attempt_type, failed_count, last_attempt)
  VALUES (lower(p_email), 'email', 1, now())
  ON CONFLICT (identifier, attempt_type)
  DO UPDATE SET
    failed_count = login_attempts.failed_count + 1,
    last_attempt = now(),
    locked_until = CASE
      WHEN login_attempts.failed_count + 1 >= 5
      THEN now() + INTERVAL '15 minutes'
      ELSE NULL
    END;

  -- Track by IP
  INSERT INTO public.login_attempts (identifier, attempt_type, failed_count, last_attempt)
  VALUES (p_ip, 'ip', 1, now())
  ON CONFLICT (identifier, attempt_type)
  DO UPDATE SET
    failed_count = login_attempts.failed_count + 1,
    last_attempt = now(),
    locked_until = CASE
      WHEN login_attempts.failed_count + 1 >= 20
      THEN now() + INTERVAL '1 hour'
      ELSE NULL
    END;
END;
$$;

-- ============================================================
-- FUNCTION: Check if login is allowed (not locked)
-- Returns TRUE if login is allowed, FALSE if locked
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_login_allowed(p_email TEXT, p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_email_locked  BOOLEAN;
  v_ip_locked     BOOLEAN;
BEGIN
  SELECT (locked_until IS NOT NULL AND locked_until > now())
  INTO v_email_locked
  FROM public.login_attempts
  WHERE identifier = lower(p_email) AND attempt_type = 'email';

  SELECT (locked_until IS NOT NULL AND locked_until > now())
  INTO v_ip_locked
  FROM public.login_attempts
  WHERE identifier = p_ip AND attempt_type = 'ip';

  RETURN NOT COALESCE(v_email_locked, false) AND NOT COALESCE(v_ip_locked, false);
END;
$$;

-- ============================================================
-- FUNCTION: Reset attempts after successful login
-- ============================================================
CREATE OR REPLACE FUNCTION public.clear_login_attempts(p_email TEXT, p_ip TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE (identifier = lower(p_email) AND attempt_type = 'email')
     OR (identifier = p_ip          AND attempt_type = 'ip');
END;
$$;

-- ============================================================
-- SEED: Default admin user
-- Password: 'password123' hashed with bcrypt 12 rounds
-- ⚠️  CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN!
-- 
-- To generate your own hash in Node.js:
--   const bcrypt = require('bcryptjs');
--   console.log(await bcrypt.hash('YourPassword', 12));
--
-- Then replace the hash below.
-- ============================================================
INSERT INTO public.users (id, email, password_hash, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@svt.com',
  '$2a$12$LJ3v8Fq6CK7d5Z0q1x5r6uBz7LhVHQK6D9x8Fq6CK7d5Z0q1x5r6u',
  'Admin',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DONE ✅
-- 
-- Run seed separately to set a real hashed password:
--   node backend/database/seed.js
-- ============================================================
