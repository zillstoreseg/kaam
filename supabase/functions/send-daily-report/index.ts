import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StudentRegistration {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  nationality: string;
  address: string | null;
  gender: string;
  birthdate: string | null;
  branch_name: string;
  scheme_name: string;
  package_name: string;
  package_start_date: string;
  package_end_date: string;
  amount_paid: number;
  payment_method: string;
  registration_date: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.json().catch(() => ({}));

    if (body.action === 'run_migration') {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const ddlStatements = [
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academy_id uuid REFERENCES academies(id) ON DELETE SET NULL`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_role text DEFAULT NULL`,
        `CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id)`,
      ];

      const policyStatements = [
        {
          check: `SELECT 1 FROM pg_policies WHERE tablename = 'academies' AND policyname = 'Academy admins can insert their academy'`,
          sql: `CREATE POLICY "Academy admins can insert their academy" ON academies FOR INSERT TO authenticated WITH CHECK (true)`,
        },
        {
          check: `SELECT 1 FROM pg_policies WHERE tablename = 'academies' AND policyname = 'Academy admins can view own academy'`,
          sql: `CREATE POLICY "Academy admins can view own academy" ON academies FOR SELECT TO authenticated USING (id IN (SELECT academy_id FROM profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM platform_roles WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')))`,
        },
        {
          check: `SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'`,
          sql: `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid())`,
        },
        {
          check: `SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'`,
          sql: `CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())`,
        },
      ];

      const results: any[] = [];

      for (const ddl of ddlStatements) {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_execute`, {
          method: 'POST',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ stmt: ddl }),
        });
        const resBody = await res.json().catch(() => ({}));
        if (res.ok || resBody.message?.includes('already exists')) {
          results.push({ sql: ddl.substring(0, 60), status: 'ok' });
        } else {
          results.push({ sql: ddl.substring(0, 60), status: 'error', detail: resBody.message });
        }
      }

      for (const p of policyStatements) {
        const wrapped = `DO $$ BEGIN IF NOT EXISTS (${p.check}) THEN ${p.sql}; END IF; END $$`;
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_execute`, {
          method: 'POST',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ stmt: wrapped }),
        });
        const resBody = await res.json().catch(() => ({}));
        results.push({ sql: p.sql.substring(0, 60), status: res.ok ? 'ok' : 'error', detail: resBody.message });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
    };

    const settingsResponse = await fetch(`${supabaseUrl}/rest/v1/settings?select=*`, { headers });
    const settings = await settingsResponse.json();
    const systemSettings = settings[0];

    if (!systemSettings?.enable_daily_reports || !systemSettings?.admin_email) {
      return new Response(
        JSON.stringify({ message: 'Daily reports are not enabled or admin email not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const studentsResponse = await fetch(
      `${supabaseUrl}/rest/v1/students?select=*,branch:branches(name),scheme:schemes(name),package:packages(name,price)&created_at=gte.${todayISO}`,
      { headers }
    );
    const students = await studentsResponse.json();

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No students registered today' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invoicesResponse = await fetch(
      `${supabaseUrl}/rest/v1/invoices?select=*&created_at=gte.${todayISO}`,
      { headers }
    );
    const invoices = await invoicesResponse.json();

    const registrations: StudentRegistration[] = students.map((student: any) => {
      const invoice = invoices?.find((inv: any) => inv.student_id === student.id);
      return {
        id: student.id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        nationality: student.nationality,
        address: student.address,
        gender: student.gender,
        birthdate: student.birthdate,
        branch_name: student.branch?.name || 'N/A',
        scheme_name: student.scheme?.name || 'N/A',
        package_name: student.package?.name || 'N/A',
        package_start_date: student.package_start_date || 'N/A',
        package_end_date: student.package_end_date || 'N/A',
        amount_paid: invoice?.total_amount || student.package?.price || 0,
        payment_method: invoice?.payment_method || 'N/A',
        registration_date: student.created_at,
      };
    });

    const emailHTML = generateEmailHTML(registrations, systemSettings);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily report generated successfully`,
        registrations_count: registrations.length,
        admin_email: systemSettings.admin_email,
        note: 'Email sending requires SMTP/Email service integration (SendGrid, AWS SES, etc.)'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-daily-report:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmailHTML(registrations: StudentRegistration[], settings: any): string {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-AE', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: settings.currency_symbol || 'AED' }).format(amount);
  };
  const totalRevenue = registrations.reduce((sum, reg) => sum + reg.amount_paid, 0);
  const studentRows = registrations.map(reg => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px; font-size: 14px;">${reg.name}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${reg.phone}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${reg.email || '-'}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${reg.branch_name}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${reg.scheme_name}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${reg.package_name}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${formatCurrency(reg.amount_paid)}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${reg.payment_method}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${reg.gender}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${reg.nationality}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${formatDate(reg.package_start_date)}</td>
      <td style="padding: 12px 8px; font-size: 14px;">${formatDate(reg.package_end_date)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Daily Registration Report - ${settings.academy_name}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">${settings.academy_name}</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Daily Registration Report</p>
    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">${formatDate(new Date().toISOString())}</p>
  </div>
  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px; text-transform: uppercase;">Total Registrations</h3>
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #b91c1c;">${registrations.length}</p>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px; text-transform: uppercase;">Total Revenue</h3>
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #059669;">${formatCurrency(totalRevenue)}</p>
      </div>
    </div>
  </div>
  <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
    <div style="background: #1f2937; color: white; padding: 15px 20px;">
      <h2 style="margin: 0; font-size: 18px;">Registration Details</h2>
    </div>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Name</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Phone</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Email</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Branch</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Scheme</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Package</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Amount</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Payment</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Gender</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Nationality</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Start Date</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">End Date</th>
          </tr>
        </thead>
        <tbody>${studentRows}</tbody>
      </table>
    </div>
  </div>
  <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
    <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Note:</strong> This is an automated daily report generated by ${settings.academy_name} management system. For questions, please contact ${settings.company_email || settings.company_phone}.</p>
  </div>
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${settings.academy_name}. All rights reserved.</p>
    <p style="margin: 5px 0 0 0;">${settings.company_address || ''}</p>
  </div>
</body></html>`;
}
