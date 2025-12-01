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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function PieChart({ data }: { data: any[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sourceNames: Record<string, string> = {
    friend: 'Friend Referral',
    google: 'Google',
    facebook: 'Facebook',
    instagram: 'Instagram',
    walk_in: 'Walk-in',
    other: 'Other',
  };

  const sourceColors: Record<string, string> = {
    friend: '#3B82F6',
    google: '#EF4444',
    facebook: '#6366F1',
    instagram: '#EC4899',
    walk_in: '#10B981',
    other: '#6B7280',
  };

  const total = data.reduce((sum, item) => sum + (item.count as number), 0);
  let currentAngle = -90;

  const slices = data.map((item, index) => {
    const percentage = (item.count as number) / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (currentAngle * Math.PI) / 180;
    const midAngle = (startAngle + angle / 2) * Math.PI / 180;

    const largeArc = angle > 180 ? 1 : 0;
    const radius = hoveredIndex === index ? 105 : 100;
    const innerRadius = 0;

    const x1 = 150 + radius * Math.cos(startRad);
    const y1 = 150 + radius * Math.sin(startRad);
    const x2 = 150 + radius * Math.cos(endRad);
    const y2 = 150 + radius * Math.sin(endRad);

    const path = angle === 360
      ? `M 150,150 m -${radius},0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`
      : `M 150 150 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const labelX = 150 + (radius - 30) * Math.cos(midAngle);
    const labelY = 150 + (radius - 30) * Math.sin(midAngle);

    return {
      path,
      color: sourceColors[item.source] || sourceColors.other,
      percentage: (percentage * 100).toFixed(1),
      count: item.count,
      source: sourceNames[item.source] || item.source,
      labelX,
      labelY,
    };
  });

  return (
    <div className="relative">
      <svg width="300" height="300" viewBox="0 0 300 300">
        {slices.map((slice, index) => (
          <g key={index}>
            <path
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="transition-all duration-200 cursor-pointer"
              style={{
                filter: hoveredIndex === index ? 'brightness(1.1)' : 'none',
              }}
            />
            {parseFloat(slice.percentage) > 5 && (
              <text
                x={slice.labelX}
                y={slice.labelY}
                fill="white"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
              >
                {slice.percentage}%
              </text>
            )}
          </g>
        ))}
      </svg>
      {hoveredIndex !== null && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-3 pointer-events-none">
          <p className="text-sm font-semibold text-gray-900">{slices[hoveredIndex].source}</p>
          <p className="text-lg font-bold" style={{ color: slices[hoveredIndex].color }}>
            {slices[hoveredIndex].count} students
          </p>
          <p className="text-xs text-gray-600">{slices[hoveredIndex].percentage}%</p>
        </div>
      )}
    </div>
  );
}

function TopReferrers({ students }: { students: any[] }) {
  const referrerCounts = students.reduce((acc: any, student: any) => {
    if (student.referral_source === 'friend' && student.referred_by_student_id) {
      const referrerName = student.students?.full_name || 'Unknown';
      const referrerId = student.referred_by_student_id;
      if (!acc[referrerId]) {
        acc[referrerId] = { name: referrerName, count: 0, students: [] };
      }
      acc[referrerId].count++;
      acc[referrerId].students.push(student.full_name);
    }
    return acc;
  }, {});

  const topReferrers = Object.values(referrerCounts)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  if (topReferrers.length === 0) {
    return <p className="text-gray-500 text-sm">No referrals from existing students yet.</p>;
  }

  return (
    <div className="space-y-3">
      {topReferrers.map((referrer: any, index: number) => (
        <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{referrer.name}</p>
                <p className="text-sm text-gray-600">{referrer.count} referral{referrer.count > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                {referrer.count} 🏆
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-2">
            <span className="font-medium">Referred:</span> {referrer.students.join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
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
  const [showTodayAttendance, setShowTodayAttendance] = useState(false);
  const [todayAttendanceList, setTodayAttendanceList] = useState<any[]>([]);
  const [referralData, setReferralData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadAlerts();
    loadReferralData();
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
      let invoicesQuery = supabase.from('invoices').select('total_amount');

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
        attendanceQuery = attendanceQuery.eq('branch_id', profile.branch_id);
        invoicesQuery = invoicesQuery.eq('branch_id', profile.branch_id);
      }

      const studentsRes = await studentsQuery;
      const branchesRes = await branchesQuery;
      const attendanceRes = await attendanceQuery;
      const invoicesRes = await invoicesQuery;

      let activeQuery = supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true);
      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        activeQuery = activeQuery.eq('branch_id', profile.branch_id);
      }
      const activeStudentsRes = await activeQuery;

      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

      let expiringQuery = supabase.from('students').select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .lte('package_end', threeDaysLaterStr)
        .gte('package_end', today);
      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        expiringQuery = expiringQuery.eq('branch_id', profile.branch_id);
      }
      const expiringRes = await expiringQuery;

      let monthlyInvoicesQuery = supabase.from('invoices').select('total_amount').gte('created_at', firstDayStr);

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        monthlyInvoicesQuery = monthlyInvoicesQuery.eq('branch_id', profile.branch_id);
      }
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

      const totalRev = invoicesRes.data?.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0;
      const monthlyRev = monthlyInvoicesRes.data?.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0;

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

  async function loadTodayAttendance() {
    try {
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('attendance')
        .select(`
          *,
          student:students(full_name, phone1)
        `)
        .eq('attendance_date', today)
        .eq('status', 'present')
        .order('attendance_time', { ascending: false });

      if (profile?.role === 'branch_manager') {
        query = query.eq('branch_id', profile.branch_id);
      }

      const { data } = await query;
      if (data) {
        setTodayAttendanceList(data);
      }
    } catch (error) {
      console.error('Error loading today attendance:', error);
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

  async function loadReferralData() {
    try {
      let query = supabase
        .from('students')
        .select('referral_source, id, full_name, referred_by_student_id, students!students_referred_by_student_id_fkey(full_name)');

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        query = query.eq('branch_id', profile.branch_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const referralCounts = data?.reduce((acc: any, student: any) => {
        const source = student.referral_source || 'other';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      const referralArray = Object.entries(referralCounts || {}).map(([source, count]) => ({
        source,
        count,
      }));

      setReferralData({ sources: referralArray, details: data || [] } as any);
    } catch (error) {
      console.error('Error loading referral data:', error);
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

        <div
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
          onClick={() => {
            loadTodayAttendance();
            setShowTodayAttendance(true);
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.todayAttendance')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayAttendance}</p>
              <p className="text-xs text-green-600 mt-1">Click to view details</p>
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

      {referralData?.sources?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Student Acquisition Sources</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex items-center justify-center">
              <PieChart data={referralData.sources} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Source Breakdown</h3>
              {referralData.sources
                .sort((a: any, b: any) => (b.count as number) - (a.count as number))
                .map((item: any) => {
                  const sourceNames: Record<string, string> = {
                    friend: 'Friend Referral',
                    google: 'Google',
                    facebook: 'Facebook',
                    instagram: 'Instagram',
                    walk_in: 'Walk-in',
                    other: 'Other',
                  };
                  const sourceColors: Record<string, string> = {
                    friend: '#3B82F6',
                    google: '#EF4444',
                    facebook: '#6366F1',
                    instagram: '#EC4899',
                    walk_in: '#10B981',
                    other: '#6B7280',
                  };
                  const totalStudents = referralData.sources.reduce((sum: number, d: any) => sum + (d.count as number), 0);
                  const percentage = ((item.count as number / totalStudents) * 100).toFixed(1);

                  return (
                    <div key={item.source} className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: sourceColors[item.source] || sourceColors.other }}
                      ></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{sourceNames[item.source] || item.source}</span>
                          <span className="text-gray-600">{item.count} students</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: sourceColors[item.source] || sourceColors.other
                            }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{percentage}%</span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Referrers</h3>
            <TopReferrers students={referralData.details} />
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
                            Week of {formatDate(alert.week_start_date)} • {alert.session_count}/{alert.session_limit} sessions
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

      {showTodayAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Today's Attendance</h2>
              <button onClick={() => setShowTodayAttendance(false)}>
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6">
              {todayAttendanceList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Student Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {todayAttendanceList.map((record: any) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {record.student?.full_name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {record.student?.phone1 || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {record.attendance_time ? new Date(record.attendance_time).toLocaleTimeString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Present
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {record.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No attendance records for today</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
