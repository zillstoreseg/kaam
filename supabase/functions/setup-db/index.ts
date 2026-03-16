import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const migrations = [
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academy_id uuid REFERENCES academies(id) ON DELETE SET NULL`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_role text DEFAULT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id)`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'academies' AND policyname = 'Authenticated users can insert academies') THEN CREATE POLICY "Authenticated users can insert academies" ON academies FOR INSERT TO authenticated WITH CHECK (true); END IF; END $$`,
    ];

    const results = [];
    for (const sql of migrations) {
      const { error } = await supabase.rpc("pg_execute", { sql_text: sql }).maybeSingle();
      results.push({ sql: sql.substring(0, 60) + "...", error: error?.message || null });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
