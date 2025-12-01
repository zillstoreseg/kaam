import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Branch, Student } from '../lib/supabase';
import { Calendar, Users, TrendingUp, Download } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';

interface DailyAttendance {
  id: string;
  student_name: string;
  attendance_time: string;
  status: string;
  branch_name: string;
}

interface StudentMonthlyStats {
  student_id: string;
  student_name: string;
  total_classes: number;
  branch_name: string;
  package_name: string;
}

export default function AttendanceReports() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [monthlyStats, setMonthlyStats] = useState<StudentMonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBranches();
    loadStudents();
  }, [profile]);

  useEffect(() => {
    if (selectedBranchId && selectedDate) {
      loadDailyAttendance();
    }
  }, [selectedBranchId, selectedDate]);

  useEffect(() => {
    if (selectedStudentId && selectedMonth) {
      loadStudentMonthlyStats();
    }
  }, [selectedStudentId, selectedMonth]);

  async function loadBranches() {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      if (error) throw error;
      setBranches((data as Branch[]) || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }

  async function loadStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, branch_id')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setStudents((data as Student[]) || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }

  async function loadDailyAttendance() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          attendance_time,
          status,
          student_id,
          students!inner(full_name),
          branches!inner(name)
        `)
        .eq('branch_id', selectedBranchId)
        .eq('attendance_date', selectedDate)
        .order('attendance_time', { ascending: false });

      if (error) throw error;

      const attendance = (data || []).map((record: any) => ({
        id: record.id,
        student_name: record.students.full_name,
        attendance_time: new Date(record.attendance_time).toLocaleTimeString(),
        status: record.status,
        branch_name: record.branches.name,
      }));

      setDailyAttendance(attendance);
    } catch (error) {
      console.error('Error loading daily attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentMonthlyStats() {
    setLoading(true);
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          student_id,
          students!inner(full_name, branch_id, package_id),
          branches!inner(name),
          packages(name)
        `)
        .eq('student_id', selectedStudentId)
        .eq('status', 'present')
        .gte('attendance_date', startDate)
        .lt('attendance_date', endDateStr);

      if (error) throw error;

      if (data && data.length > 0) {
        const firstRecord: any = data[0];
        setMonthlyStats({
          student_id: selectedStudentId,
          student_name: firstRecord.students.full_name,
          total_classes: data.length,
          branch_name: firstRecord.branches.name,
          package_name: firstRecord.packages?.name || 'N/A',
        });
      } else {
        const { data: studentData } = await supabase
          .from('students')
          .select(`
            full_name,
            branches!inner(name),
            packages(name)
          `)
          .eq('id', selectedStudentId)
          .single();

        if (studentData) {
          setMonthlyStats({
            student_id: selectedStudentId,
            student_name: (studentData as any).full_name,
            total_classes: 0,
            branch_name: (studentData as any).branches.name,
            package_name: (studentData as any).packages?.name || 'N/A',
          });
        }
      }
    } catch (error) {
      console.error('Error loading student monthly stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportDailyAttendance() {
    const csv = [
      ['Student Name', 'Time', 'Status', 'Branch'],
      ...dailyAttendance.map(a => [a.student_name, a.attendance_time, a.status, a.branch_name])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Reports</h1>
          <p className="text-gray-600 mt-1">View daily attendance by branch and student monthly statistics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Daily Attendance by Branch</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedBranchId && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">
                      Total: {dailyAttendance.length} students
                    </span>
                  </div>
                  {dailyAttendance.length > 0 && (
                    <button
                      onClick={exportDailyAttendance}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : dailyAttendance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No attendance records for this date
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dailyAttendance.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{record.student_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{record.attendance_time}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  record.status === 'present'
                                    ? 'bg-green-100 text-green-800'
                                    : record.status === 'late'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Student Monthly Attendance</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student
              </label>
              <SearchableSelect
                options={students.map(s => ({ value: s.id, label: s.full_name }))}
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                placeholder="Search student..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            {selectedStudentId && monthlyStats && (
              <div className="mt-6 space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-200">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-green-600 mb-2">
                          {monthlyStats.total_classes}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          Classes Attended
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Student Name:</span>
                        <span className="text-sm font-semibold text-gray-900">{monthlyStats.student_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Branch:</span>
                        <span className="text-sm font-semibold text-gray-900">{monthlyStats.branch_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Package:</span>
                        <span className="text-sm font-semibold text-gray-900">{monthlyStats.package_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Month:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
