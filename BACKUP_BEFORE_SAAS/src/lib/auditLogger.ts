import { supabase } from './supabase';

interface AuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  summaryKey: string;
  summaryParams?: Record<string, any>;
  beforeData?: any;
  afterData?: any;
  metadata?: Record<string, any>;
  branchId?: string | null;
}

export async function logAudit(
  actorRole: string,
  params: AuditLogParams
): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('No session available for audit logging');
      return null;
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-audit`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        summaryKey: params.summaryKey,
        summaryParams: params.summaryParams || null,
        beforeData: params.beforeData || null,
        afterData: params.afterData || null,
        metadata: params.metadata || null,
        branchId: params.branchId || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Audit log error:', errorData);
      return null;
    }

    const result = await response.json();
    return result.log_id || null;
  } catch (error) {
    console.error('Failed to log audit:', error);
    return null;
  }
}

export function getChangedFields(before: any, after: any): string[] {
  if (!before || !after) return [];

  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  allKeys.forEach(key => {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key);
    }
  });

  return changed;
}

export const AuditActions = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  PROMOTE: 'promote',
  CONFIRM: 'confirm',
  RESET: 'reset',
  LOGIN: 'login',
  LOGOUT: 'logout',
  FAILED_LOGIN: 'failed_login',
} as const;

export const AuditEntityTypes = {
  STUDENT: 'student',
  ATTENDANCE: 'attendance',
  EXAM: 'exam',
  EXPENSE: 'expense',
  SETTINGS: 'settings',
  AUTH: 'auth',
  BRANCH: 'branch',
  PACKAGE: 'package',
  INVOICE: 'invoice',
  STOCK: 'stock',
} as const;
