import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Student, Payment, Settings as SettingsType, Package as PackageType, AttendanceAlert } from '../lib/supabase';
import { Users, Building2, ClipboardCheck, Package, Clock, DollarSign, UserPlus, UserCheck, TrendingUp, X, AlertTriangle, Snowflake, Play, Calendar, RefreshCw } from 'lucide-react';

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

interface StudentWithPackage extends Student {
  package?: PackageType;
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
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [expiringStudents, setExpiringStudents] = useState<StudentWithPackage[]>([]);
  const [alerts, setAlerts] = useState<(AttendanceAlert & { student?: Student })[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithPackage | null>(null);
  const [freezeData, setFreezeData] = useState({ start: '', end: '', reason: '' });
  const [packages, setPackages] = useState<PackageType[]>([]);

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

      let studentsQuery = supabase.from('students').select('*', { count: 'exact' });
      let branchesQuery = supabase.from('branches').select('*', { count: 'exact' });
      let attendanceQuery = supabase.from('attendance').select('*', { count: 'exact' }).eq('attendance_date', today);
      let paymentsQuery = supabase.from('payments').select('amount, currency');

      if (profile?.role !== 'super_admin' && profile?.role !== 'accountant' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
        attendanceQuery = attendanceQuery.eq('branch_id', profile.branch_id);
        paymentsQuery = paymentsQuery.eq('branch_id', profile.branch_id);
      }

      const [studentsRes, branchesRes, attendanceRes, paymentsRes, activeStudentsRes, expiringRes, monthlyPaymentsRes, joinedTodayRes, trialRes, settingsRes] = await Promise.all([
        studentsQuery,
        branchesQuery,
        attendanceQuery,
        paymentsQuery,
        studentsQuery.eq('is_active', true),
        studentsQuery.eq('is_active', true).lte('package_end', nextMonthStr).gte('package_end', today),
        paymentsQuery.gte('created_at', firstDayStr),
        studentsQuery.eq('joined_date', today),
        studentsQuery.eq('trial_student', true).eq('is_active', true),
        supabase.from('settings').select('*').maybeSingle(),
      ]);

      const monthlyRev = monthlyPaymentsRes.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalRev = paymentsRes.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

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

  async function loadExpiringStudents() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      let query = supabase
        .from('students')
        .select('*, package:packages(*)')
        .eq('is_active', true)
        .lte('package_end', nextMonthStr)
        .gte('package_end', today)
        .order('package_end');

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        query = query.eq('branch_id', profile.branch_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setExpiringStudents(data || []);
      setShowExpiringModal(true);
    } catch (error) {
      console.error('Error loading expiring students:', error);
    }
  }

  async function loadPackages() {
    try {
      const { data, error } = await supabase.from('packages').select('*').order('name');
      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  }

  async function renewPackage(student: StudentWithPackage, newPackageId: string) {
    try {
      const selectedPackage = packages.find(p => p.id === newPackageId);
      if (!selectedPackage) return;

      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);

      const { error } = await supabase
        .from('students')
        .update({
          package_id: newPackageId,
          package_start: today.toISOString().split('T')[0],
          package_end: endDate.toISOString().split('T')[0],
        })
        .eq('id', student.id);

      if (error) throw error;
      alert('Package renewed successfully!');
      loadStats();
      loadExpiringStudents();
    } catch (error) {
      console.error('Error renewing package:', error);
      alert('Error renewing package');
    }
  }

  async function freezeMembership() {
    if (!selectedStudent || !freezeData.start || !freezeData.end) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const { error: studentError } = await supabase
        .from('students')
        .update({
          is_frozen: true,
          freeze_start_date: freezeData.start,
          freeze_end_date: freezeData.end,
          freeze_reason: freezeData.reason,
        })
        .eq('id', selectedStudent.id);

      if (studentError) throw studentError;

      const { error: historyError } = await supabase
        .from('membership_freeze_history')
        .insert({
          student_id: selectedStudent.id,
          freeze_start: freezeData.start,
          freeze_end: freezeData.end,
          freeze_reason: freezeData.reason,
          frozen_by: profile?.id,
        });

      if (historyError) throw historyError;

      alert('Membership frozen successfully!');
      setShowFreezeModal(false);
      setSelectedStudent(null);
      setFreezeData({ start: '', end: '', reason: '' });
      loadExpiringStudents();
    } catch (error) {
      console.error('Error freezing membership:', error);
      alert('Error freezing membership');
    }
  }

  async function unfreezeMembership(student: StudentWithPackage) {
    try {
      const { error: studentError } = await supabase
        .from('students')
        .update({
          is_frozen: false,
          freeze_start_date: null,
          freeze_end_date: null,
          freeze_reason: null,
        })
        .eq('id', student.id);

      if (studentError) throw studentError;

      const { error: historyError } = await supabase
        .from('membership_freeze_history')
        .update({
          unfrozen_at: new Date().toISOString(),
          unfrozen_by: profile?.id,
        })
        .eq('student_id', student.id)
        .is('unfrozen_at', null);

      if (historyError) throw historyError;

      alert('Membership unfrozen successfully!');
      loadExpiringStudents();
    } catch (error) {
      console.error('Error unfreezing membership:', error);
      alert('Error unfreezing membership');
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
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.totalStudents')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
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

        <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => { loadExpiringStudents(); loadPackages(); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.expiringPackages')}</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.expiringPackages}</p>
              <p className="text-xs text-gray-500 mt-1">Click to view details</p>
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

      {showExpiringModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Expiring Packages</h2>
                <p className="text-sm text-gray-600 mt-1">{expiringStudents.length} student{expiringStudents.length > 1 ? 's' : ''} with packages expiring soon</p>
              </div>
              <button onClick={() => setShowExpiringModal(false)}>
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {expiringStudents.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No students with expiring packages</p>
              ) : (
                <div className="space-y-4">
                  {expiringStudents.map((student) => {
                    const daysUntilExpiry = Math.ceil((new Date(student.package_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isExpired = daysUntilExpiry < 0;
                    const isFrozen = student.is_frozen;

                    return (
                      <div key={student.id} className={`border rounded-lg p-4 ${isExpired ? 'border-red-300 bg-red-50' : isFrozen ? 'border-blue-300 bg-blue-50' : 'border-yellow-300 bg-yellow-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-gray-900">{student.full_name}</h3>
                              {isFrozen && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                  <Snowflake className="w-3 h-3" />
                                  Frozen
                                </span>
                              )}
                              {isExpired && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                  EXPIRED
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-gray-700 space-y-1">
                              <p><strong>Phone:</strong> {student.phone1}</p>
                              <p><strong>Package:</strong> {student.package?.name || 'N/A'}</p>
                              <p><strong>Package End:</strong> {new Date(student.package_end).toLocaleDateString()}</p>
                              {!isExpired && <p className="text-yellow-700 font-semibold">{daysUntilExpiry} days remaining</p>}
                              {isExpired && <p className="text-red-700 font-semibold">Expired {Math.abs(daysUntilExpiry)} days ago</p>}
                              {isFrozen && student.freeze_start_date && student.freeze_end_date && (
                                <p className="text-blue-700">
                                  <strong>Frozen:</strong> {new Date(student.freeze_start_date).toLocaleDateString()} - {new Date(student.freeze_end_date).toLocaleDateString()}
                                  {student.freeze_reason && <span className="block text-xs mt-1">Reason: {student.freeze_reason}</span>}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            {isFrozen ? (
                              <button
                                onClick={() => unfreezeMembership(student)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition"
                              >
                                <Play className="w-4 h-4" />
                                Unfreeze
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setShowFreezeModal(true);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition"
                                >
                                  <Snowflake className="w-4 h-4" />
                                  Freeze
                                </button>
                                <select
                                  onChange={(e) => e.target.value && renewPackage(student, e.target.value)}
                                  defaultValue=""
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition cursor-pointer"
                                >
                                  <option value="">Renew Package</option>
                                  {packages.map(pkg => (
                                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                                  ))}
                                </select>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showFreezeModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Freeze Membership</h2>
              <button onClick={() => { setShowFreezeModal(false); setSelectedStudent(null); }}>
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="font-semibold text-gray-900">{selectedStudent.full_name}</p>
                <p className="text-sm text-gray-600">Current package ends: {new Date(selectedStudent.package_end).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Freeze Start Date *
                </label>
                <input
                  type="date"
                  value={freezeData.start}
                  onChange={(e) => setFreezeData({ ...freezeData, start: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Freeze End Date *
                </label>
                <input
                  type="date"
                  value={freezeData.end}
                  onChange={(e) => setFreezeData({ ...freezeData, end: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={freezeData.reason}
                  onChange={(e) => setFreezeData({ ...freezeData, reason: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  rows={3}
                  placeholder="Reason for freezing membership..."
                />
              </div>

              <button
                onClick={freezeMembership}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
              >
                <Snowflake className="w-5 h-5" />
                Freeze Membership
              </button>
            </div>
          </div>
        </div>
      )}

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
