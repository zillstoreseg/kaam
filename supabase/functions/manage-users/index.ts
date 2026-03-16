import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...data } = await req.json();

    switch (action) {
      case 'create': {
        const { email, password, full_name, role, branch_id } = data;

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          full_name,
          role,
          branch_id: role === 'super_admin' ? null : branch_id || null,
        }]);

        if (profileError) throw profileError;

        return new Response(
          JSON.stringify({ success: true, user: authData.user }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { user_id, full_name, email, role, branch_id, password } = data;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name,
            role,
            branch_id: role === 'super_admin' ? null : branch_id || null,
          })
          .eq('id', user_id);

        if (profileError) throw profileError;

        const updateData: any = {};
        if (email) {
          updateData.email = email;
          updateData.email_confirm = true;
        }
        if (password) updateData.password = password;

        if (Object.keys(updateData).length > 0) {
          const { error: authError } = await supabase.auth.admin.updateUserById(
            user_id,
            updateData
          );
          if (authError) throw authError;
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { user_id } = data;

        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user_id);

        if (profileError) throw profileError;

        const { error: authError } = await supabase.auth.admin.deleteUser(user_id);
        if (authError) throw authError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'list': {
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select(`
            *,
            branch:branches!profiles_branch_id_fkey(id, name)
          `)
          .order('created_at', { ascending: false });

        if (usersError) throw usersError;

        const usersWithEmails = await Promise.all(
          (users || []).map(async (user: any) => {
            const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
            return {
              ...user,
              email: authUser?.user?.email || 'N/A',
            };
          })
        );

        return new Response(
          JSON.stringify({ success: true, users: usersWithEmails }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset_password': {
        const { user_id, new_password } = data;

        if (!new_password || new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'Password must be at least 6 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          user_id,
          { password: new_password }
        );

        if (passwordError) throw passwordError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'run_migration': {
        const migrations = [
          `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academy_id uuid REFERENCES academies(id) ON DELETE SET NULL`,
          `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_role text DEFAULT NULL`,
          `CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id)`,
          `DO $body$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'academies' AND policyname = 'Academy admins can insert their academy') THEN EXECUTE 'CREATE POLICY "Academy admins can insert their academy" ON academies FOR INSERT TO authenticated WITH CHECK (true)'; END IF; END $body$`,
          `DO $body$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'academies' AND policyname = 'Academy admins can view own academy') THEN EXECUTE 'CREATE POLICY "Academy admins can view own academy" ON academies FOR SELECT TO authenticated USING (id IN (SELECT academy_id FROM profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM platform_roles WHERE user_id = auth.uid() AND role IN (''owner'', ''super_owner'')))'; END IF; END $body$`,
          `DO $body$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN EXECUTE 'CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid())'; END IF; END $body$`,
          `DO $body$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN EXECUTE 'CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())'; END IF; END $body$`,
        ];

        const results = [];
        for (const sql of migrations) {
          try {
            const { error } = await supabase.rpc('exec_ddl', { ddl: sql });
            if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
              results.push({ sql: sql.substring(0, 50), status: 'error', error: error.message });
            } else {
              results.push({ sql: sql.substring(0, 50), status: 'ok' });
            }
          } catch (e: any) {
            results.push({ sql: sql.substring(0, 50), status: 'error', error: e.message });
          }
        }

        return new Response(
          JSON.stringify({ success: true, results }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});