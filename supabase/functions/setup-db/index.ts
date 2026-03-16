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
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_students integer NOT NULL DEFAULT 0`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_branches integer NOT NULL DEFAULT 0`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_yearly numeric(10,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true`,
      `ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'`,
      `UPDATE plans SET display_order = 1, max_students = 50, max_branches = 1, price_yearly = 290, is_popular = false, currency = 'USD' WHERE name = 'Basic' AND max_students = 0 AND display_order = 0`,
      `UPDATE plans SET display_order = 2, max_students = 200, max_branches = 3, price_yearly = 799, is_popular = true, currency = 'USD' WHERE name = 'Pro' AND max_students = 0 AND display_order = 0`,
      `UPDATE plans SET display_order = 3, max_students = 0, max_branches = 0, price_yearly = 1499, is_popular = false, currency = 'USD' WHERE name = 'Elite' AND max_students = 0 AND display_order = 0`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Anyone can view visible plans') THEN CREATE POLICY "Anyone can view visible plans" ON plans FOR SELECT TO anon USING (is_visible = true); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'Authenticated can view all plans') THEN CREATE POLICY "Authenticated can view all plans" ON plans FOR SELECT TO authenticated USING (true); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'academies' AND policyname = 'Authenticated users can insert academies') THEN CREATE POLICY "Authenticated users can insert academies" ON academies FOR INSERT TO authenticated WITH CHECK (true); END IF; END $$`,
    ];

    const results = [];
    for (const sql of migrations) {
      const { error } = await supabase.rpc("pg_execute", { sql_text: sql }).maybeSingle();
      results.push({ sql: sql.substring(0, 80) + "...", error: error?.message || null });
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
