import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateToDefaultAcademy() {
  console.log('🚀 Starting data migration to Default Academy...\n');

  try {
    // Step 1: Create Default Academy with 14-day trial
    console.log('1️⃣ Creating Default Academy...');
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { data: academy, error: academyError } = await supabase
      .from('academies')
      .insert({
        name: 'Default Academy',
        owner_name: 'Academy Owner',
        email: 'admin@defaultacademy.com',
        phone: '',
        country: '',
        city: '',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (academyError) {
      // Check if academy already exists
      const { data: existingAcademy } = await supabase
        .from('academies')
        .select()
        .eq('name', 'Default Academy')
        .single();

      if (existingAcademy) {
        console.log('   ✅ Default Academy already exists');
        console.log(`   Academy ID: ${existingAcademy.id}`);
        console.log(`   Trial ends: ${new Date(existingAcademy.trial_ends_at).toLocaleDateString()}\n`);

        // Use existing academy
        academy = existingAcademy;
      } else {
        throw academyError;
      }
    } else {
      console.log('   ✅ Default Academy created');
      console.log(`   Academy ID: ${academy.id}`);
      console.log(`   Trial ends: ${trialEndsAt.toLocaleDateString()}\n`);
    }

    const academyId = academy.id;

    // Step 2: Update all profiles
    console.log('2️⃣ Migrating profiles...');
    const { error: profilesError } = await supabase
      .from('profiles')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (profilesError) throw profilesError;
    console.log('   ✅ Profiles updated\n');

    // Step 3: Update all branches
    console.log('3️⃣ Migrating branches...');
    const { error: branchesError } = await supabase
      .from('branches')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (branchesError) throw branchesError;
    console.log('   ✅ Branches updated\n');

    // Step 4: Update all students
    console.log('4️⃣ Migrating students...');
    const { error: studentsError } = await supabase
      .from('students')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (studentsError) throw studentsError;
    console.log('   ✅ Students updated\n');

    // Step 5: Update all packages
    console.log('5️⃣ Migrating packages...');
    const { error: packagesError } = await supabase
      .from('packages')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (packagesError) throw packagesError;
    console.log('   ✅ Packages updated\n');

    // Step 6: Update all schemes
    console.log('6️⃣ Migrating schemes...');
    const { error: schemesError } = await supabase
      .from('schemes')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (schemesError) throw schemesError;
    console.log('   ✅ Schemes updated\n');

    // Step 7: Update all attendance records
    console.log('7️⃣ Migrating attendance records...');
    const { error: attendanceError } = await supabase
      .from('attendance')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (attendanceError) throw attendanceError;
    console.log('   ✅ Attendance records updated\n');

    // Step 8: Update all expenses
    console.log('8️⃣ Migrating expenses...');
    const { error: expensesError } = await supabase
      .from('expenses')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (expensesError && expensesError.code !== 'PGRST116') throw expensesError;
    console.log('   ✅ Expenses updated\n');

    // Step 9: Update all stock items
    console.log('9️⃣ Migrating stock items...');
    const { error: stockItemsError } = await supabase
      .from('stock_items')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (stockItemsError && stockItemsError.code !== 'PGRST116') throw stockItemsError;
    console.log('   ✅ Stock items updated\n');

    // Step 10: Update all stock transactions
    console.log('🔟 Migrating stock transactions...');
    const { error: stockTransError } = await supabase
      .from('stock_transactions')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (stockTransError && stockTransError.code !== 'PGRST116') throw stockTransError;
    console.log('   ✅ Stock transactions updated\n');

    // Step 11: Update all belts
    console.log('1️⃣1️⃣ Migrating belts...');
    const { error: beltsError } = await supabase
      .from('belts')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (beltsError && beltsError.code !== 'PGRST116') throw beltsError;
    console.log('   ✅ Belts updated\n');

    // Step 12: Update all belt promotions
    console.log('1️⃣2️⃣ Migrating belt promotions...');
    const { error: promotionsError } = await supabase
      .from('belt_promotions')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (promotionsError && promotionsError.code !== 'PGRST116') throw promotionsError;
    console.log('   ✅ Belt promotions updated\n');

    // Step 13: Update all exams
    console.log('1️⃣3️⃣ Migrating exams...');
    const { error: examsError } = await supabase
      .from('exams')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (examsError && examsError.code !== 'PGRST116') throw examsError;
    console.log('   ✅ Exams updated\n');

    // Step 14: Update all exam participants
    console.log('1️⃣4️⃣ Migrating exam participants...');
    const { error: participantsError } = await supabase
      .from('exam_participants')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (participantsError && participantsError.code !== 'PGRST116') throw participantsError;
    console.log('   ✅ Exam participants updated\n');

    // Step 15: Update all settings
    console.log('1️⃣5️⃣ Migrating settings...');
    const { error: settingsError } = await supabase
      .from('settings')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
    console.log('   ✅ Settings updated\n');

    // Step 16: Update all role permissions
    console.log('1️⃣6️⃣ Migrating role permissions...');
    const { error: permissionsError } = await supabase
      .from('role_permissions')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (permissionsError && permissionsError.code !== 'PGRST116') throw permissionsError;
    console.log('   ✅ Role permissions updated\n');

    // Step 17: Update all audit logs
    console.log('1️⃣7️⃣ Migrating audit logs...');
    const { error: auditError } = await supabase
      .from('audit_logs')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (auditError && auditError.code !== 'PGRST116') throw auditError;
    console.log('   ✅ Audit logs updated\n');

    // Step 18: Update all security alerts
    console.log('1️⃣8️⃣ Migrating security alerts...');
    const { error: alertsError } = await supabase
      .from('security_alerts')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (alertsError && alertsError.code !== 'PGRST116') throw alertsError;
    console.log('   ✅ Security alerts updated\n');

    // Step 19: Update all login history
    console.log('1️⃣9️⃣ Migrating login history...');
    const { error: loginError } = await supabase
      .from('login_history')
      .update({ academy_id: academyId })
      .is('academy_id', null);

    if (loginError && loginError.code !== 'PGRST116') throw loginError;
    console.log('   ✅ Login history updated\n');

    console.log('═══════════════════════════════════════════');
    console.log('✨ Migration completed successfully!');
    console.log('═══════════════════════════════════════════');
    console.log('All existing data has been assigned to Default Academy');
    console.log(`Academy ID: ${academyId}`);
    console.log(`Trial Status: Active until ${trialEndsAt.toLocaleDateString()}`);
    console.log('\nNext steps:');
    console.log('1. Update RLS policies for multi-tenant isolation');
    console.log('2. Create platform owner account');
    console.log('3. Test academy dashboard access');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateToDefaultAcademy();
