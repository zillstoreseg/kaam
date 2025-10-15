import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Student, Attendance as AttendanceType, Package as PackageType } from '../lib/supabase';
import { Search, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function Attendance() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceType>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [profile, selectedDate]);

  async function loadData() {
    try {
      let studentsQuery = supabase.from('students').select('*').eq('is_active', true).order('full_name');

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
      }

      let attendanceQuery = supabase
        .from('attendance')
        .select('*')
        .eq('attendance_date', selectedDate);

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        attendanceQuery = attendanceQuery.eq('branch_id', profile.branch_id);
      }

      const [studentsRes, attendanceRes] = await Promise.all([
        studentsQuery,
        attendanceQuery,
      ]);

      if (studentsRes.data) setStudents(studentsRes.data as Student[]);

      const attendanceMap: Record<string, AttendanceType> = {};
      if (attendanceRes.data) {
        (attendanceRes.data as AttendanceType[]).forEach((att) => {
          attendanceMap[att.student_id] = att;
        });
      }
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter((student) =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function markAttendance(studentId: string, status: 'present' | 'absent' | 'late') {
    setSaving(studentId);
    try {
      const existingAttendance = attendance[studentId];
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      // Check weekly attendance limit before marking present
      if (status === 'present' && !existingAttendance) {
        await checkAttendanceLimit(student, studentId);
      }

      if (existingAttendance) {
        const { error } = await supabase
          .from('attendance')
          .update({ status, attendance_time: new Date().toISOString() })
          .eq('id', existingAttendance.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('attendance')
          .insert([
            {
              student_id: studentId,
              branch_id: student.branch_id,
              attendance_date: selectedDate,
              attendance_time: new Date().toISOString(),
              status,
              marked_by: profile?.id,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setAttendance({ ...attendance, [studentId]: data as AttendanceType });
        }
      }

      await loadData();
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Error marking attendance');
    } finally {
      setSaving(null);
    }
  }

  async function checkAttendanceLimit(student: Student, studentId: string) {
    try {
      // Get student's package
      const { data: packageData } = await supabase
        .from('packages')
        .select('sessions_per_week')
        .eq('id', student.package_id)
        .single();

      if (!packageData) return;

      const sessionsPerWeek = (packageData as PackageType).sessions_per_week;

      // Get start of current week (Monday)
      const selectedDateObj = new Date(selectedDate);
      const dayOfWeek = selectedDateObj.getDay();
      const diff = selectedDateObj.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(selectedDateObj.setDate(diff));
      const weekStartStr = weekStart.toISOString().split('T')[0];

      // Get end of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Count attendance for this week
      const { data: weekAttendance, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'present')
        .gte('attendance_date', weekStartStr)
        .lte('attendance_date', weekEndStr);

      if (error) throw error;

      const weeklyCount = (weekAttendance?.length || 0) + 1; // +1 for current attendance

      // If limit exceeded, create alert
      if (weeklyCount > sessionsPerWeek) {
        const alertMessage = `${student.full_name} has attended ${weeklyCount} sessions this week, exceeding the limit of ${sessionsPerWeek} sessions per week.`;

        alert(`⚠️ ATTENDANCE LIMIT EXCEEDED!\n\n${alertMessage}\n\nAttendance will still be marked with a note.`);

        // Create alert in database
        await supabase.from('attendance_alerts').insert({
          student_id: studentId,
          attendance_id: null, // Will be set after attendance is created
          alert_type: 'limit_exceeded',
          alert_message: alertMessage,
          week_start_date: weekStartStr,
          session_count: weeklyCount,
          session_limit: sessionsPerWeek,
          is_resolved: false,
        });
      }
    } catch (error) {
      console.error('Error checking attendance limit:', error);
    }
  }

  if (loading) return <div className="text-center py-12">{t('common.loading')}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('attendance.title')}</h1>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('students.search')}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            />
          </div>
          <div className="relative sm:w-64">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('students.name')}</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('attendance.status')}</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('students.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.map((student) => {
                const att = attendance[student.id];
                const isSaving = saving === student.id;
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{student.full_name}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {att ? (
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            att.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : att.status === 'late'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t(`attendance.${att.status}`)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Not marked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => markAttendance(student.id, 'present')}
                          disabled={isSaving}
                          className={`p-2 rounded-lg transition ${
                            att?.status === 'present'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                          } disabled:opacity-50`}
                          title={t('attendance.present')}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'late')}
                          disabled={isSaving}
                          className={`p-2 rounded-lg transition ${
                            att?.status === 'late'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-700'
                          } disabled:opacity-50`}
                          title={t('attendance.late')}
                        >
                          <Clock className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'absent')}
                          disabled={isSaving}
                          className={`p-2 rounded-lg transition ${
                            att?.status === 'absent'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
                          } disabled:opacity-50`}
                          title={t('attendance.absent')}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-gray-500">No students found</div>
        )}
      </div>
    </div>
  );
}
