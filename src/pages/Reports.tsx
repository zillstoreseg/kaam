import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Student, Payment, Branch } from '../lib/supabase';
import {
  Users,
  UserPlus,
  UserCheck,
  DollarSign,
  TrendingUp,
  Calendar,
  Award,
  Package as PackageIcon,
  Clock,
  Download
} from 'lucide-react';

interface BranchStats {
  totalStudents: number;
  activeStudents: number;
  trialStudents: number;
  joinedToday: number;
  joinedThisWeek: number;
  joinedThisMonth: number;
  monthlyRevenue: number;
  totalRevenue: number;
  todayAttendance: number;
  thisWeekAttendance: number;
  averageAttendanceRate: number;
  expiringPackages: number;
  expiredPackages: number;
  schemeBreakdown: { scheme: string; count: number }[];
}

export default function Reports() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [stats, setStats] = useState<BranchStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  useEffect(() => {
    loadBranches();
  }, [profile]);

  useEffect(() => {
    if (selectedBranchId) {
      loadBranchStats(selectedBranchId);
    }
  }, [selectedBranchId]);

  async function loadBranches() {
    try {
      let query = supabase.from('branches').select('*').order('name');

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        query = query.eq('id', profile.branch_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setBranches(data as Branch[]);

        if (profile?.role !== 'super_admin' && profile?.branch_id) {
          setSelectedBranchId(profile.branch_id);
        } else {
          setSelectedBranchId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }

  async function loadBranchStats(branchId: string) {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      const [
        studentsRes,
        paymentsRes,
        allPaymentsRes,
        attendanceTodayRes,
        attendanceWeekRes,
        schemesRes,
        studentSchemesRes,
      ] = await Promise.all([
        supabase.from('students').select('*').eq('branch_id', branchId),
        supabase.from('payments').select('amount').eq('branch_id', branchId).gte('payment_date', firstDayStr).lte('payment_date', today),
        supabase.from('payments').select('amount').eq('branch_id', branchId),
        supabase.from('attendance').select('*', { count: 'exact' }).eq('branch_id', branchId).eq('attendance_date', today),
        supabase.from('attendance').select('*', { count: 'exact' }).eq('branch_id', branchId).gte('attendance_date', weekAgoStr).lte('attendance_date', today),
        supabase.from('schemes').select('*'),
        supabase.from('student_schemes').select('student_id, scheme_id'),
      ]);

      const students = (studentsRes.data as Student[]) || [];
      const branch = branches.find(b => b.id === branchId);
      setSelectedBranch(branch || null);

      const activeStudents = students.filter(s => s.is_active).length;
      const trialStudents = students.filter(s => s.trial_student).length;
      const joinedToday = students.filter(s => s.joined_date === today).length;
      const joinedThisWeek = students.filter(s => s.joined_date >= weekAgoStr).length;
      const joinedThisMonth = students.filter(s => s.joined_date >= firstDayStr).length;

      const monthlyRevenue = (paymentsRes.data as Payment[])?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalRevenue = (allPaymentsRes.data as Payment[])?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const expiringPackages = students.filter(
        s => s.is_active && s.package_end && s.package_end <= nextMonthStr && s.package_end >= today
      ).length;

      const expiredPackages = students.filter(
        s => s.is_active && s.package_end && s.package_end < today
      ).length;

      const totalWorkingDays = 7;
      const totalPossibleAttendances = activeStudents * totalWorkingDays;
      const actualAttendances = attendanceWeekRes.count || 0;
      const averageAttendanceRate = totalPossibleAttendances > 0
        ? Math.round((actualAttendances / totalPossibleAttendances) * 100)
        : 0;

      const studentIds = students.map(s => s.id);
      const studentSchemesData = (studentSchemesRes.data as any[]) || [];
      const branchStudentSchemes = studentSchemesData.filter(ss => studentIds.includes(ss.student_id));

      const schemeCounts: Record<string, number> = {};
      branchStudentSchemes.forEach(ss => {
        schemeCounts[ss.scheme_id] = (schemeCounts[ss.scheme_id] || 0) + 1;
      });

      const schemes = (schemesRes.data as any[]) || [];
      const schemeBreakdown = Object.entries(schemeCounts).map(([schemeId, count]) => {
        const scheme = schemes.find(s => s.id === schemeId);
        return {
          scheme: scheme?.name || 'Unknown',
          count,
        };
      });

      setStats({
        totalStudents: students.length,
        activeStudents,
        trialStudents,
        joinedToday,
        joinedThisWeek,
        joinedThisMonth,
        monthlyRevenue,
        totalRevenue,
        todayAttendance: attendanceTodayRes.count || 0,
        thisWeekAttendance: attendanceWeekRes.count || 0,
        averageAttendanceRate,
        expiringPackages,
        expiredPackages,
        schemeBreakdown,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportReport() {
    if (!stats || !selectedBranch) return;

    const reportText = `
BRANCH REPORT - ${selectedBranch.name}
Generated: ${new Date().toLocaleString()}
======================================

STUDENT STATISTICS
------------------
Total Students: ${stats.totalStudents}
Active Students: ${stats.activeStudents}
Trial Students: ${stats.trialStudents}
Joined Today: ${stats.joinedToday}
Joined This Week: ${stats.joinedThisWeek}
Joined This Month: ${stats.joinedThisMonth}

ATTENDANCE STATISTICS
--------------------
Today's Attendance: ${stats.todayAttendance}
This Week's Attendance: ${stats.thisWeekAttendance}
Average Attendance Rate: ${stats.averageAttendanceRate}%

REVENUE STATISTICS
------------------
Monthly Revenue: ${stats.monthlyRevenue.toFixed(2)} AED
Total Revenue: ${stats.totalRevenue.toFixed(2)} AED

PACKAGE STATUS
--------------
Expiring Soon (30 days): ${stats.expiringPackages}
Expired: ${stats.expiredPackages}

PROGRAMS ENROLLMENT
-------------------
${stats.schemeBreakdown.map(s => `${s.scheme}: ${s.count} students`).join('\n')}
    `;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBranch.name}-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!branches.length) {
    return <div className="text-center py-12 text-gray-500">No branches available</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branch Reports</h1>
          <p className="text-gray-600 mt-1">Detailed statistics and analytics</p>
        </div>
        {stats && (
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Branch</label>
        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name} - {branch.location}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading statistics...</div>
      ) : stats ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Student Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <StatCard
                title="Total Students"
                value={stats.totalStudents}
                icon={Users}
                color="bg-blue-500"
              />
              <StatCard
                title="Active Students"
                value={stats.activeStudents}
                icon={Users}
                color="bg-green-500"
              />
              <StatCard
                title="Trial Students"
                value={stats.trialStudents}
                icon={UserCheck}
                color="bg-yellow-500"
              />
              <StatCard
                title="Joined Today"
                value={stats.joinedToday}
                icon={UserPlus}
                color="bg-emerald-500"
              />
              <StatCard
                title="Joined This Week"
                value={stats.joinedThisWeek}
                icon={TrendingUp}
                color="bg-teal-500"
              />
              <StatCard
                title="Joined This Month"
                value={stats.joinedThisMonth}
                icon={Calendar}
                color="bg-cyan-500"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Today's Attendance"
                value={stats.todayAttendance}
                icon={Calendar}
                color="bg-orange-500"
              />
              <StatCard
                title="This Week's Attendance"
                value={stats.thisWeekAttendance}
                icon={TrendingUp}
                color="bg-indigo-500"
              />
              <StatCard
                title="Avg Attendance Rate"
                value={`${stats.averageAttendanceRate}%`}
                icon={TrendingUp}
                color="bg-purple-500"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Monthly Revenue (AED)"
                value={stats.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                icon={DollarSign}
                color="bg-teal-500"
              />
              <StatCard
                title="Total Revenue (AED)"
                value={stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                icon={DollarSign}
                color="bg-green-500"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Package Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Expiring Soon (30 days)"
                value={stats.expiringPackages}
                icon={Clock}
                color="bg-yellow-500"
              />
              <StatCard
                title="Expired Packages"
                value={stats.expiredPackages}
                icon={PackageIcon}
                color="bg-red-500"
              />
            </div>
          </div>

          {stats.schemeBreakdown.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Programs Enrollment</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.schemeBreakdown.map((item, index) => (
                  <StatCard
                    key={index}
                    title={item.scheme}
                    value={item.count}
                    icon={Award}
                    color="bg-red-500"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">Select a branch to view statistics</div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${color} rounded-full p-3`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
