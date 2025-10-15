import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Settings as SettingsType, AttendanceAlert, Student } from '../lib/supabase';
import { Users, Building2, ClipboardCheck, Package, Clock, DollarSign, UserPlus, UserCheck, TrendingUp, X, AlertTriangle } from 'lucide-react';

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
  const navigate = useNavigate();
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
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alerts, setAlerts] = useState<(AttendanceAlert & { student?: Student })[]>([]);

  useEffect(() => {
    loadStats();
    loadAlerts();
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

      let studentsQuery = supabase.from('students').select('*', { count: 'exact', head: false });
      let branchesQuery = supabase.from('branches').select('*', { count: 'exact', head: false });
      let attendanceQuery = supabase.from('attendance').select('*', { count: 'exact', head: false }).eq('attendance_date', today);
      let paymentsQuery = supabase.from('payments').select('amount');
      let invoicesQuery = supabase.from('invoices').select('total_amount');

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
        attendanceQuery = attendanceQuery.eq('branch_id', profile.branch_id);
        paymentsQuery = paymentsQuery.eq('branch_id', profile.branch_id);
        invoicesQuery = invoicesQuery.eq('branch_id', profile.branch_id);
      }

      const studentsRes = await studentsQuery;
      const branchesRes = await branchesQuery;
      const attendanceRes = await attendanceQuery;
      const paymentsRes = await paymentsQuery;
      const invoicesRes = await invoicesQuery;

      let activeQuery = supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true);
      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        activeQuery = activeQuery.eq('branch_id', profile.branch_id);
      }
      const activeStudentsRes = await activeQuery;

      let expiringQuery = supabase.from('students').select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .lte('package_end', nextMonthStr)
        .gte('package_end', today);
      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        expiringQuery = expiringQuery.eq('branch_id', profile.branch_id);
      }
      const expiringRes = await expiringQuery;

      let monthlyPaymentsQuery = supabase.from('payments').select('amount').gte('created_at', firstDayStr);
      let monthlyInvoicesQuery = supabase.from('invoices').select('total_amount').gte('created_at', firstDayStr);

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        monthlyPaymentsQuery = monthlyPaymentsQuery.eq('branch_id', profile.branch_id);
        monthlyInvoicesQuery = monthlyInvoicesQuery.eq('branch_id', profile.branch_id);
      }
      const monthlyPaymentsRes = await monthlyPaymentsQuery;
      const monthlyInvoicesRes = await monthlyInvoicesQuery;

      let joinedTodayQuery = supabase.from('students').select('*', { count: 'exact', head: true }).eq('joined_date', today);
      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        joinedTodayQuery = joinedTodayQuery.eq('branch_id', profile.branch_id);
      }
      const joinedTodayRes = await joinedTodayQuery;

      let trialQuery = supabase.from('students').select('*', { count: 'exact', head: true })
        .eq('trial_student', true)
        .eq('is_active', true);
      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        trialQuery = trialQuery.eq('branch_id', profile.branch_id);
      }
      const trialRes = await trialQuery;

      const settingsRes = await supabase.from('settings').select('*').maybeSingle();

      const paymentsTotal = paymentsRes.data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      const invoicesTotal = invoicesRes.data?.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0;
      const totalRev = paymentsTotal + invoicesTotal;

      const monthlyPaymentsTotal = monthlyPaymentsRes.data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      const monthlyInvoicesTotal = monthlyInvoicesRes.data?.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0;
      const monthlyRev = monthlyPaymentsTotal + monthlyInvoicesTotal;

      setStats({
        totalStudents: studentsRes.count || 0,
        totalBranches: branchesRes.count || 0,
        todayAttendance: attendanceRes.count || 0,
        activePackages: activeStudentsRes.count || 0,
        expiringPackages: expiringRes.count || 0,
        monthlyRevenue: monthlyRev,
        totalRevenue: totalRev,
        joinedToday: joinedTodayRes.count || 0,
        trialStudents: trialRes.count || 0,
      });

      if (settingsRes.data) setSettings(settingsRes.data as SettingsType);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAlerts() {
    try {
      const { data, error } = await supabase
        .from('attendance_alerts')
        .select('*, student:students(*)')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }

  async function resolveAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('attendance_alerts')
        .update({ is_resolved: true })
        .eq('id', alertId);

      if (error) throw error;
      loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }

  const currencySymbol = settings?.currency_symbol || 'AED';

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('nav.dashboard')}</h1>
        <p className="text-gray-600 mt-1">{t('dashboard.welcome')}, {profile?.full_name}</p>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg cursor-pointer hover:bg-yellow-100 transition" onClick={() => setShowAlertsModal(true)}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">You have {alerts.length} unresolved alert{alerts.length > 1 ? 's' : ''}</p>
              <p className="text-sm text-yellow-700">Click to view details</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/students')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.totalStudents')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
              <p className="text-xs text-gray-500 mt-1">Click to view all</p>
            </div>
            <Users className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.todayAttendance')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayAttendance}</p>
            </div>
            <ClipboardCheck className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.activePackages')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activePackages}</p>
            </div>
            <Package className="w-12 h-12 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => navigate('/students')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.expiringPackages')}</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.expiringPackages}</p>
              <p className="text-xs text-gray-500 mt-1">Go to Students page</p>
            </div>
            <Clock className="w-12 h-12 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.monthlyRevenue.toFixed(0)} {currencySymbol}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRevenue.toFixed(0)} {currencySymbol}</p>
            </div>
            <DollarSign className="w-12 h-12 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Joined Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.joinedToday}</p>
            </div>
            <UserPlus className="w-12 h-12 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trial Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.trialStudents}</p>
            </div>
            <UserCheck className="w-12 h-12 text-pink-600" />
          </div>
        </div>

        {profile?.role === 'super_admin' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('dashboard.totalBranches')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalBranches}</p>
              </div>
              <Building2 className="w-12 h-12 text-red-600" />
            </div>
          </div>
        )}
      </div>

      {showAlertsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b bg-yellow-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">System Alerts</h2>
                <p className="text-sm text-gray-600 mt-1">{alerts.length} unresolved alert{alerts.length > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowAlertsModal(false)}>
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {alerts.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No unresolved alerts</p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border border-yellow-300 rounded-lg p-4 bg-yellow-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <span className="font-semibold text-gray-900">{alert.student?.full_name}</span>
                            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded">
                              {alert.alert_type.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{alert.alert_message}</p>
                          <p className="text-xs text-gray-600">
                            Week of {new Date(alert.week_start_date).toLocaleDateString()} • {alert.session_count}/{alert.session_limit} sessions
                          </p>
                        </div>
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
