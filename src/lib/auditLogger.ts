import { supabase } from './supabase';

interface DeviceInfo {
  deviceName: string;
  osName: string;
  browserName: string;
  isMobile: boolean;
}

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

function parseUserAgent(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  let deviceName = 'Unknown Device';
  let osName = 'Unknown OS';
  let browserName = 'Unknown Browser';
  let isMobile = false;

  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    isMobile = true;
  }

  if (ua.includes('iphone')) {
    deviceName = 'iPhone';
    const match = ua.match(/iphone os (\d+)_(\d+)/);
    if (match) {
      osName = `iOS ${match[1]}.${match[2]}`;
    } else {
      osName = 'iOS';
    }
  } else if (ua.includes('ipad')) {
    deviceName = 'iPad';
    const match = ua.match(/cpu os (\d+)_(\d+)/);
    if (match) {
      osName = `iOS ${match[1]}.${match[2]}`;
    } else {
      osName = 'iPadOS';
    }
  } else if (ua.includes('android')) {
    deviceName = 'Android Device';
    const match = ua.match(/android (\d+)\.?(\d+)?/);
    if (match) {
      osName = `Android ${match[1]}${match[2] ? '.' + match[2] : ''}`;
    } else {
      osName = 'Android';
    }
  } else if (ua.includes('windows phone')) {
    deviceName = 'Windows Phone';
    osName = 'Windows Phone';
  } else if (ua.includes('windows')) {
    deviceName = 'Windows PC';
    if (ua.includes('windows nt 10.0')) {
      osName = 'Windows 10/11';
    } else if (ua.includes('windows nt 6.3')) {
      osName = 'Windows 8.1';
    } else if (ua.includes('windows nt 6.2')) {
      osName = 'Windows 8';
    } else if (ua.includes('windows nt 6.1')) {
      osName = 'Windows 7';
    } else {
      osName = 'Windows';
    }
  } else if (ua.includes('mac os x')) {
    deviceName = 'Mac';
    const match = ua.match(/mac os x (\d+)[_.](\d+)/);
    if (match) {
      osName = `macOS ${match[1]}.${match[2]}`;
    } else {
      osName = 'macOS';
    }
  } else if (ua.includes('linux')) {
    deviceName = 'Linux PC';
    osName = 'Linux';
  }

  if (ua.includes('edg/') || ua.includes('edge/')) {
    browserName = 'Edge';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browserName = 'Chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browserName = 'Safari';
  } else if (ua.includes('firefox/')) {
    browserName = 'Firefox';
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browserName = 'Opera';
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browserName = 'Internet Explorer';
  }

  return { deviceName, osName, browserName, isMobile };
}

async function getClientInfo() {
  const userAgent = navigator.userAgent;
  const deviceInfo = parseUserAgent(userAgent);

  let ipAddress = null;
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    ipAddress = data.ip;
  } catch (error) {
    console.warn('Could not fetch IP address:', error);
  }

  return {
    userAgent,
    ipAddress,
    ...deviceInfo,
  };
}

export async function logAudit(
  actorRole: string,
  params: AuditLogParams
): Promise<string | null> {
  try {
    const clientInfo = await getClientInfo();

    const { data, error } = await supabase.rpc('insert_audit_log', {
      p_actor_role: actorRole,
      p_branch_id: params.branchId || null,
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId || null,
      p_summary_key: params.summaryKey,
      p_summary_params: params.summaryParams || null,
      p_before_data: params.beforeData || null,
      p_after_data: params.afterData || null,
      p_metadata: params.metadata || null,
      p_ip_address: clientInfo.ipAddress,
      p_user_agent: clientInfo.userAgent,
      p_device_name: clientInfo.deviceName,
      p_os_name: clientInfo.osName,
      p_browser_name: clientInfo.browserName,
      p_is_mobile: clientInfo.isMobile,
    });

    if (error) {
      console.error('Audit log error:', error);
      return null;
    }

    return data;
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
