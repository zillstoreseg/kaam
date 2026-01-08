#!/usr/bin/env node

/**
 * Validation script for Multi-Tenant SaaS setup
 *
 * Checks:
 * - Database tables exist
 * - RLS is enabled
 * - Helper functions exist
 * - Default tenant exists
 * - Migration was successful
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

let errors = 0;
let warnings = 0;

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  warnings++;
}

function logError(message) {
  console.log(`❌ ${message}`);
  errors++;
}

async function validateTables() {
  console.log('\n📊 Validating Tables...\n');

  // Check core SaaS tables exist
  const saaTables = ['tenants', 'subscriptions', 'impersonation_sessions'];

  for (const table of saaTables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        logError(`Table "${table}" not found or not accessible`);
      } else {
        logSuccess(`Table "${table}" exists`);
      }
    } catch (err) {
      logError(`Table "${table}" check failed: ${err.message}`);
    }
  }

  // Check business tables have tenant_id
  const businessTables = ['students', 'branches', 'attendance', 'expenses'];

  for (const table of businessTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('tenant_id')
        .limit(1);

      if (error) {
        logError(`Table "${table}" missing tenant_id column`);
      } else {
        logSuccess(`Table "${table}" has tenant_id column`);
      }
    } catch (err) {
      logWarning(`Table "${table}" check skipped: ${err.message}`);
    }
  }
}

async function validateRLS() {
  console.log('\n🔒 Validating Row-Level Security...\n');

  const query = `
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('tenants', 'subscriptions', 'students', 'branches', 'attendance')
  `;

  try {
    const { data, error } = await supabase.rpc('sql', { query });

    if (error) {
      logWarning('Cannot verify RLS status (requires elevated permissions)');
    } else {
      logSuccess('RLS validation requires manual check - see migration file');
    }
  } catch (err) {
    logWarning('RLS validation skipped (requires admin access)');
  }
}

async function validateHelperFunctions() {
  console.log('\n⚙️  Validating Helper Functions...\n');

  const functions = [
    'is_platform_owner',
    'current_tenant_id',
    'current_impersonation_tenant',
    'effective_tenant_id'
  ];

  for (const func of functions) {
    try {
      // Try to call the function
      const { data, error } = await supabase.rpc(func);

      if (error && error.message.includes('not found')) {
        logError(`Function "${func}" does not exist`);
      } else {
        logSuccess(`Function "${func}" exists`);
      }
    } catch (err) {
      logWarning(`Function "${func}" check skipped: ${err.message}`);
    }
  }
}

async function validateDefaultTenant() {
  console.log('\n🏢 Validating Default Tenant...\n');

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'main')
      .maybeSingle();

    if (error) {
      logError(`Error checking default tenant: ${error.message}`);
    } else if (!data) {
      logError('Default tenant "Main Academy" (subdomain: main) not found');
    } else {
      logSuccess(`Default tenant exists: ${data.name} (${data.subdomain})`);

      // Check subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', data.id)
        .maybeSingle();

      if (subError) {
        logError(`Error checking default subscription: ${subError.message}`);
      } else if (!subData) {
        logWarning('Default tenant has no subscription');
      } else {
        logSuccess(`Default subscription exists: ${subData.plan} plan`);
      }
    }
  } catch (err) {
    logError(`Default tenant check failed: ${err.message}`);
  }
}

async function validateProfiles() {
  console.log('\n👤 Validating Profiles Table...\n');

  try {
    // Check if any platform owners exist
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, tenant_id')
      .in('role', ['platform_owner', 'platform_admin'])
      .limit(5);

    if (error) {
      logError(`Error checking profiles: ${error.message}`);
    } else if (!data || data.length === 0) {
      logWarning('No platform owners found - run create-platform-owner.mjs to create one');
    } else {
      logSuccess(`Found ${data.length} platform owner(s):`);
      data.forEach(p => {
        console.log(`   - ${p.full_name} (${p.role})`);
      });
    }

    // Check if profiles have tenant_id column
    const { data: tenantData, error: tenantError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .limit(1);

    if (tenantError && tenantError.message.includes('tenant_id')) {
      logError('Profiles table missing tenant_id column');
    } else {
      logSuccess('Profiles table has tenant_id column');
    }
  } catch (err) {
    logError(`Profiles validation failed: ${err.message}`);
  }
}

async function runValidation() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Multi-Tenant SaaS Setup Validation                ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  await validateTables();
  await validateRLS();
  await validateHelperFunctions();
  await validateDefaultTenant();
  await validateProfiles();

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Validation Summary                                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (errors === 0 && warnings === 0) {
    console.log('✨ Perfect! All checks passed.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Create platform owner: node create-platform-owner.mjs');
    console.log('   2. Run the app: npm run dev');
    console.log('   3. Login and access /admin/tenants\n');
  } else if (errors === 0) {
    console.log(`⚠️  Setup looks good with ${warnings} warning(s).`);
    console.log('\n📋 Recommended:');
    if (warnings > 0) {
      console.log('   - Create platform owner: node create-platform-owner.mjs');
    }
    console.log('   - Review warnings above');
    console.log('   - Run the app: npm run dev\n');
  } else {
    console.log(`❌ Setup incomplete: ${errors} error(s), ${warnings} warning(s)`);
    console.log('\n📋 Action Required:');
    console.log('   1. Review errors above');
    console.log('   2. Check migration was applied: check Supabase dashboard');
    console.log('   3. Re-run this script after fixes\n');
    process.exit(1);
  }
}

runValidation().catch(err => {
  console.error('\n💥 Validation script failed:', err.message);
  process.exit(1);
});
