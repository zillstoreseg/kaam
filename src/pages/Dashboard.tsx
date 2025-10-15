import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Student, Payment, Settings as SettingsType } from '../lib/supabase';
import { Users, Building2, ClipboardCheck, Package, Clock, DollarSign, UserPlus, UserCheck, TrendingUp } from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalBranches: number;
  todayAttendance: number;
  activePackages: number;
  expiringPackages: number;
  monthlyRevenue: number;
  totalRevenue: number;
  joinedToday: number;
  trialStudents: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalBranches: 0,
    todayAttendance: 0,
    activePackages: 0,
    expiringPackages: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    joinedToday: 0,
    trialStudents: 0,
  });
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [profile]);

  async function loadStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      const firstDayStr = firstDayOfMonth.toISOString();

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const endOfTodayStr = endOfToday.toISOString();

      let studentsQuery = supabase.from('students').select('*', { count: 'exact' });
      let attendanceQuery = supabase.from('attendance').select('*', { count: 'exact' }).eq('attendance_date', today);
      let paymentsQuery = supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', firstDayStr.substring(0, 10))
        .lte('payment_date', today);
      let invoicesQuery = supabase
        .from('invoices')
        .select('amount_paid')
        .gte('invoice_date', firstDayStr)
        .lte('invoice_date', endOfTodayStr);
      let allPaymentsQuery = supabase.from('payments').select('amount');
      let allInvoicesQuery = supabase.from('invoices').select('amount_paid');

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
        attendanceQuery = attendanceQuery.eq('branch_id', profile.branch_id);
        paymentsQuery = paymentsQuery.eq('branch_id', profile.branch_id);
        invoicesQuery = invoicesQuery.eq('branch_id', profile.branch_id);
        allPaymentsQuery = allPaymentsQuery.eq('branch_id', profile.branch_id);
        allInvoicesQuery = allInvoicesQuery.eq('branch_id', profile.branch_id);
      }

      const [studentsRes, attendanceRes, branchesRes, paymentsRes, invoicesRes, allPaymentsRes, allInvoicesRes, settingsRes] = await Promise.all([
        studentsQuery,
        attendanceQuery,
        profile?.role === 'super_admin'
          ? supabase.from('branches').select('*', { count: 'exact' })
          : Promise.resolve({ count: 0 }),
        paymentsQuery,
        invoicesQuery,
        allPaymentsQuery,
        allInvoicesQuery,
        supabase.from('settings').select('*').limit(1).maybeSingle(),
      ]);

      const students = (studentsRes.data as Student[]) || [];
      const activePackages = students.filter((s) => s.is_active && s.package_end).length;
      const expiringPackages = students.filter(
        (s) => s.is_active && s.package_end && s.package_end <= nextMonthStr && s.package_end >= today
      ).length;
      const joinedToday = students.filter((s) => s.joined_date === today).length;
      const trialStudents = students.filter((s) => s.trial_student).length;

      const paymentsRevenue = (paymentsRes.data as Payment[])?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const invoicesRevenue = (invoicesRes.data as any[])?.reduce((sum, inv) => sum + Number(inv.amount_paid), 0) || 0;
      const monthlyRevenue = paymentsRevenue + invoicesRevenue;

      const allPaymentsRevenue = (allPaymentsRes.data as Payment[])?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      const allInvoicesRevenue = (allInvoicesRes.data as any[])?.reduce((sum, inv) => sum + Number(inv.amount_paid), 0) || 0;
      const totalRevenue = allPaymentsRevenue + allInvoicesRevenue;

      if (settingsRes.data) {
        setSettings(settingsRes.data as SettingsType);
      }

      setStats({
        totalStudents: studentsRes.count || 0,
        totalBranches: branchesRes.count || 0,
        todayAttendance: attendanceRes.count || 0,
        activePackages,
        expiringPackages,
        monthlyRevenue,
        totalRevenue,
        joinedToday,
        trialStudents,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: t('dashboard.totalStudents'),
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-blue-500',
      show: true,
    },
    {
      title: 'Joined Today',
      value: stats.joinedToday,
      icon: UserPlus,
      color: 'bg-emerald-500',
      show: true,
    },
    {
      title: 'Trial Students',
      value: stats.trialStudents,
      icon: UserCheck,
      color: 'bg-yellow-500',
      show: true,
    },
    {
      title: t('dashboard.totalBranches'),
      value: stats.totalBranches,
      icon: Building2,
      color: 'bg-green-500',
      show: profile?.role === 'super_admin',
    },
    {
      title: t('dashboard.todayAttendance'),
      value: stats.todayAttendance,
      icon: ClipboardCheck,
      color: 'bg-orange-500',
      show: true,
    },
    {
      title: t('dashboard.activePackages'),
      value: stats.activePackages,
      icon: Package,
      color: 'bg-purple-500',
      show: true,
    },
    {
      title: t('dashboard.expiringPackages'),
      value: stats.expiringPackages,
      icon: Clock,
      color: 'bg-red-500',
      show: true,
    },
    {
      title: `Monthly Revenue (${settings?.currency_symbol || 'AED'})`,
      value: stats.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      icon: DollarSign,
      color: 'bg-teal-500',
      show: profile?.role === 'super_admin' || profile?.role === 'branch_manager' || profile?.role === 'accountant',
    },
    {
      title: `Total Revenue (${settings?.currency_symbol || 'AED'})`,
      value: stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      show: profile?.role === 'super_admin' || profile?.role === 'accountant',
    },
  ].filter((card) => card.show);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.welcome')}, {profile?.full_name}!
        </h1>
        <p className="text-gray-600 mt-2">{profile?.role && t(`role.${profile.role}`)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.color} rounded-full p-3`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/attendance"
              className="block w-full px-4 py-3 bg-red-700 text-white rounded-lg hover:bg-red-800 transition text-center font-semibold"
            >
              {t('attendance.mark')}
            </a>
            {(profile?.role === 'super_admin' || profile?.role === 'branch_manager') && (
              <>
                <a
                  href="/students"
                  className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-semibold"
                >
                  {t('students.add')}
                </a>
                <a
                  href="/reports"
                  className="block w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center font-semibold"
                >
                  View Reports
                </a>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Role</span>
              <span className="font-semibold text-gray-900">
                {profile?.role && t(`role.${profile.role}`)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Active Students</span>
              <span className="font-semibold text-gray-900">{stats.totalStudents}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Students Joined Today</span>
              <span className="font-semibold text-green-600">{stats.joinedToday}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Trial Students</span>
              <span className="font-semibold text-yellow-600">{stats.trialStudents}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Today's Date</span>
              <span className="font-semibold text-gray-900">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
