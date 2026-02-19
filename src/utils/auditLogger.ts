/**
 * auditLogger.ts — Client-side audit logging
 *
 * Writes security-relevant events to the audit_logs table.
 * RLS ensures only the authenticated user can insert/view their own logs.
 *
 * Logged events:
 *  LOAN_CREATED | LOAN_UPDATED | LOAN_DELETED
 *  PAYMENT_LOGGED | PAYMENT_DELETED
 *  INVESTOR_CREATED | INVESTOR_UPDATED | INVESTOR_DELETED
 *  INVESTOR_PAYMENT_LOGGED
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'LOAN_CREATED'
  | 'LOAN_UPDATED'
  | 'LOAN_DELETED'
  | 'PAYMENT_LOGGED'
  | 'PAYMENT_DELETED'
  | 'INVESTOR_CREATED'
  | 'INVESTOR_UPDATED'
  | 'INVESTOR_DELETED'
  | 'INVESTOR_PAYMENT_LOGGED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT';

interface AuditPayload {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log write.
 * Never throws — security logging must not break the main flow.
 */
export const auditLog = async (payload: AuditPayload): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use 'as any' to bypass generated-types mismatch for the new table
    // until types are regenerated. The insert is safe — RLS enforces user_id.
    await (supabase.from('audit_logs') as any).insert({
      user_id: user.id,
      action: payload.action,
      entity_type: payload.entityType ?? null,
      entity_id: payload.entityId ?? null,
      details: payload.details ?? null,
    });
  } catch {
    // Silent fail
  }
};
