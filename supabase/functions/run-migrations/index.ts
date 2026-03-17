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
      `ALTER TABLE academies ADD COLUMN IF NOT EXISTS owner_name text`,
      `ALTER TABLE academies ADD COLUMN IF NOT EXISTS owner_email text`,
      `ALTER TABLE academies ADD COLUMN IF NOT EXISTS phone text`,
      `ALTER TABLE academies ADD COLUMN IF NOT EXISTS country text`,
      `ALTER TABLE academies ADD COLUMN IF NOT EXISTS city text`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_students integer NOT NULL DEFAULT 0`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_branches integer NOT NULL DEFAULT 0`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_yearly numeric(10,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'`,
    ];

    for (const m of migrations) {
      try {
        await sql.unsafe(m);
        results.push({ ok: true, sql: m.substring(0, 80) });
      } catch (e: any) {
        results.push({ ok: false, sql: m.substring(0, 80), error: e.message });
      }
    }

    await sql.end();

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
