-- Migration: Add single-session auth support and password reset tokens
-- Run: psql -U postgres -d sri_vinayaka -f backend/database/migration_single_session.sql

-- Add active session tracking columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add device_id to login_history
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
