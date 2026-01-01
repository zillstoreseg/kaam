import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeviceInfo {
  deviceName: string;
  osName: string;
  browserName: string;
  isMobile: boolean;
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

function getClientIP(req: Request): string | null {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
  }

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  const trueClientIp = req.headers.get('true-client-ip');
  if (trueClientIp) return trueClientIp;

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  return null;
}

function maskIP(ipAddress: string | null): string | null {
  if (!ipAddress) return null;

  if (ipAddress.includes('.')) {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.*.*`;
  } else if (ipAddress.includes(':')) {
    const parts = ipAddress.split(':');
    return `${parts[0]}:${parts[1]}:*`;
  }

  return 'masked';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, branch_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      action,
      entityType,
      entityId,
      summaryKey,
      summaryParams,
      beforeData,
      afterData,
      metadata,
      branchId,
    } = body;

    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const deviceInfo = parseUserAgent(userAgent);
    const ipAddress = getClientIP(req);
    const ipMasked = maskIP(ipAddress);

    const { data: logData, error: insertError } = await supabase
      .from('audit_logs')
      .insert([{
        actor_user_id: user.id,
        actor_role: profile.role,
        branch_id: branchId || profile.branch_id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        summary_key: summaryKey,
        summary_params: summaryParams,
        before_data: beforeData,
        after_data: afterData,
        metadata,
        ip_address: ipAddress,
        ip_masked: ipMasked,
        user_agent: userAgent,
        device_name: deviceInfo.deviceName,
        os_name: deviceInfo.osName,
        browser_name: deviceInfo.browserName,
        is_mobile: deviceInfo.isMobile,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting audit log:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, log_id: logData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Audit log error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});