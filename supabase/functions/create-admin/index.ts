import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: any = {};
    try { body = await req.json(); } catch {}

    if (body.action === 'run_plan_migrations') {
      const dbUrl = Deno.env.get('SUPABASE_DB_URL');
      if (!dbUrl) {
        return new Response(JSON.stringify({ error: 'SUPABASE_DB_URL not available' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { default: postgres } = await import('npm:postgres@3.4.4');
      const sql = postgres(dbUrl, { max: 1, ssl: 'require' });
      const results: any[] = [];

      const migrations = [
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_students integer NOT NULL DEFAULT 0`,
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_branches integer NOT NULL DEFAULT 0`,
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_yearly numeric(10,2) NOT NULL DEFAULT 0`,
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false`,
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14`,
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false`,
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0`,
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true`,
        `ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'`,
        `UPDATE plans SET display_order=1, max_students=50, max_branches=1, price_yearly=290, is_popular=false WHERE name='Basic' AND display_order=0`,
        `UPDATE plans SET display_order=2, max_students=200, max_branches=3, price_yearly=799, is_popular=true WHERE name='Pro' AND display_order=0`,
        `UPDATE plans SET display_order=3, max_students=0, max_branches=0, price_yearly=1499, is_popular=false WHERE name='Elite' AND display_order=0`,
      ];

      for (const m of migrations) {
        try {
          await sql.unsafe(m);
          results.push({ ok: true, sql: m.substring(0, 60) });
        } catch (e: any) {
          results.push({ ok: false, sql: m.substring(0, 60), error: e.message });
        }
      }

      await sql.end();
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = 'admin@kaam.com';
    const password = 'Admin123!@#';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: profileError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      full_name: 'Super Admin',
      role: 'super_admin',
      branch_id: null,
    }]);

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message, userId: authData.user.id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Super Admin created successfully!', credentials: { email, password } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
