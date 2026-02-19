-- Audit log table: records critical admin actions for security monitoring
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,           -- e.g. 'LOAN_CREATED', 'PAYMENT_LOGGED', 'LOAN_DELETED'
  entity_type TEXT,               -- e.g. 'loan', 'transaction', 'investor'
  entity_id TEXT,                 -- ID of the affected record
  details JSONB,                  -- Additional context (amounts, names, etc.)
  ip_hint TEXT,                   -- Best-effort from client (not trusted for auth)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only INSERT their own audit logs (they cannot update or delete)
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only VIEW their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);
