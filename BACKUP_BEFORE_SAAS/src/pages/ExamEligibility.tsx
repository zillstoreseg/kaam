import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, BeltRank } from '../lib/supabase';
import { Search, CheckCircle, XCircle, Calendar, Award, Send, Printer, RotateCcw, ClipboardCheck, Save } from 'lucide-react';

interface EligibilityRecord {
  student_id: string;
  full_name: string;
  branch_id: string;
  joined_date: string;
  months_with_us: number;
  classes_this_month: number;
  total_classes_attended: number;
  is_eligible: boolean;
  invitation_sent: boolean;
  last_invitation_date: string;
}

interface InvitedStudent {
  student_id: string;
  full_name: string;
  branch_id: string;
  belt_key: string;
  belt_order: number;
  belt_name: string;
  belt_color: string;
  invitation_date: string;
}

interface ParticipationData {
  student_id: string;
  attended: boolean;
  result: 'pass' | 'fail' | null;
  next_belt_key: string | null;
  next_belt_order: number | null;
  notes: string;
}

export default function ExamEligibility() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'eligibility' | 'confirmation'>('eligibility');
  const [records, setRecords] = useState<EligibilityRecord[]>([]);
  const [invitedStudents, setInvitedStudents] = useState<InvitedStudent[]>([]);
  const [beltRanks, setBeltRanks] = useState<BeltRank[]>([]);
  const [participationData, setParticipationData] = useState<Record<string, ParticipationData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'eligible' | 'not_eligible' | 'invited'>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEligibilityData();
    loadBeltRanks();
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'confirmation') {
      loadInvitedStudents();
    }
  }, [activeTab, profile]);

  async function loadBeltRanks() {
    try {
      const { data } = await supabase.from('belt_ranks').select('*').order('belt_order');
      if (data) setBeltRanks(data as BeltRank[]);
    } catch (error) {
      console.error('Error loading belt ranks:', error);
    }
  }

  async function loadEligibilityData() {
    try {
      setLoading(true);

      let query = supabase.from('exam_eligibility').select('*');

      if (profile?.role === 'branch_manager') {
        query = query.eq('branch_id', profile.branch_id);
      }

      const { data } = await query;

      if (data) {
        setRecords(data as EligibilityRecord[]);
      }
    } catch (error) {
      console.error('Error loading eligibility data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvitedStudents() {
    try {
      setLoading(true);

      let query = supabase
        .from('students')
        .select(`
          id,
          full_name,
          branch_id,
          belt_key,
          belt_order,
          exam_invitations!inner(invitation_date)
        `)
        .eq('exam_invitations.invitation_sent', true)
        .order('full_name');

      if (profile?.role === 'branch_manager') {
        query = query.eq('branch_id', profile.branch_id);
      }

      const { data } = await query;

      if (data) {
        const studentsWithBelts = data.map((student: any) => {
          const belt = beltRanks.find(b => b.belt_key === student.belt_key);
          return {
            student_id: student.id,
            full_name: student.full_name,
            branch_id: student.branch_id,
            belt_key: student.belt_key || '10th_kyu_white',
            belt_order: student.belt_order || 1,
            belt_name: belt?.belt_name || 'Unknown',
            belt_color: belt?.color || '#ccc',
            invitation_date: student.exam_invitations[0]?.invitation_date || new Date().toISOString(),
          };
        });

        setInvitedStudents(studentsWithBelts);

        const initialData: Record<string, ParticipationData> = {};
        studentsWithBelts.forEach((student: InvitedStudent) => {
          initialData[student.student_id] = {
            student_id: student.student_id,
            attended: false,
            result: null,
            next_belt_key: null,
            next_belt_order: null,
            notes: '',
          };
        });
        setParticipationData(initialData);
      }
    } catch (error) {
      console.error('Error loading invited students:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markInvitationSent(studentId: string, branchId: string) {
    try {
      const { error } = await supabase.from('exam_invitations').insert({
        student_id: studentId,
        branch_id: branchId,
        invitation_sent: true,
        created_by: profile?.id,
      });

      if (error) throw error;

      alert('Invitation marked as sent!');
      loadEligibilityData();
    } catch (error) {
      console.error('Error marking invitation:', error);
      alert('Failed to mark invitation as sent');
    }
  }

  async function markInvitationUnsent(studentId: string) {
    try {
      const { data: invitations } = await supabase
        .from('exam_invitations')
        .select('id')
        .eq('student_id', studentId)
        .eq('invitation_sent', true)
        .order('invitation_date', { ascending: false })
        .limit(1);

      if (invitations && invitations.length > 0) {
        const { error } = await supabase
          .from('exam_invitations')
          .update({ invitation_sent: false })
          .eq('id', invitations[0].id);

        if (error) throw error;

        alert('Invitation marked as unsent!');
        loadEligibilityData();
      }
    } catch (error) {
      console.error('Error unmarking invitation:', error);
      alert('Failed to mark invitation as unsent');
    }
  }

  function updateParticipation(studentId: string, field: keyof ParticipationData, value: any) {
    setParticipationData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        ...(field === 'attended' && !value ? { result: null, next_belt_key: null, next_belt_order: null } : {}),
        ...(field === 'result' && value !== 'pass' ? { next_belt_key: null, next_belt_order: null } : {}),
      }
    }));
  }

  async function saveExamResults() {
    if (!confirm('Save exam results? This will update student belts for all PASS results.')) return;

    try {
      setSaving(true);

      const examDate = new Date().toISOString().split('T')[0];

      for (const student of invitedStudents) {
        const data = participationData[student.student_id];
        if (!data || !data.attended) continue;

        await supabase.from('exam_participation').insert({
          student_id: student.student_id,
          branch_id: student.branch_id,
          exam_date: examDate,
          attended: data.attended,
          result: data.result,
          previous_belt_key: student.belt_key,
          previous_belt_order: student.belt_order,
          new_belt_key: data.result === 'pass' ? (data.next_belt_key || student.belt_key) : student.belt_key,
          new_belt_order: data.result === 'pass' ? (data.next_belt_order || student.belt_order) : student.belt_order,
          notes: data.notes,
          recorded_by: profile?.id,
        });

        if (data.result === 'pass' && data.next_belt_key && data.next_belt_order) {
          await supabase
            .from('students')
            .update({
              belt_key: data.next_belt_key,
              belt_order: data.next_belt_order,
            })
            .eq('id', student.student_id);

          await supabase.from('promotion_log').insert({
            student_id: student.student_id,
            branch_id: student.branch_id,
            from_belt_key: student.belt_key,
            from_belt_order: student.belt_order,
            to_belt_key: data.next_belt_key,
            to_belt_order: data.next_belt_order,
            promotion_date: examDate,
            promoted_by: profile?.id,
            notes: data.notes,
          });
        }
      }

      alert('Exam results saved successfully!');
      loadInvitedStudents();
    } catch (error: any) {
      console.error('Error saving exam results:', error);
      alert(`Error saving results: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const eligibleStudents = filteredRecords.filter(r => r.is_eligible && !r.invitation_sent);
    const invitedStudentsForPrint = filteredRecords.filter(r => r.invitation_sent);

    printWindow.document.write('<html><head><title>Exam Eligibility Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }');
    printWindow.document.write('h1 { color: #333; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }');
    printWindow.document.write('h2 { color: #555; margin-top: 30px; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin: 20px 0; }');
    printWindow.document.write('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
    printWindow.document.write('th { background-color: #dc2626; color: white; }');
    printWindow.document.write('.date { text-align: right; color: #666; margin-bottom: 20px; }');
    printWindow.document.write('</style></head><body>');

    printWindow.document.write('<h1>Exam Eligibility Report</h1>');
    printWindow.document.write(`<div class="date">Date: ${new Date().toLocaleDateString()}</div>`);

    printWindow.document.write('<h2>Eligible Students (Ready for Invitation)</h2>');
    if (eligibleStudents.length > 0) {
      printWindow.document.write('<table>');
      printWindow.document.write('<tr><th>Student Name</th><th>Joined Date</th><th>Months</th><th>Classes This Month</th><th>Total Classes</th></tr>');
      eligibleStudents.forEach(record => {
        printWindow.document.write(`<tr>
          <td>${record.full_name}</td>
          <td>${new Date(record.joined_date).toLocaleDateString()}</td>
          <td>${Math.floor(record.months_with_us)}</td>
          <td>${record.classes_this_month} / 8</td>
          <td>${record.total_classes_attended}</td>
        </tr>`);
      });
      printWindow.document.write('</table>');
    } else {
      printWindow.document.write('<p>No eligible students at this time.</p>');
    }

    printWindow.document.write('<h2>Students with Sent Invitations</h2>');
    if (invitedStudentsForPrint.length > 0) {
      printWindow.document.write('<table>');
      printWindow.document.write('<tr><th>Student Name</th><th>Invitation Date</th><th>Months</th><th>Classes This Month</th></tr>');
      invitedStudentsForPrint.forEach(record => {
        printWindow.document.write(`<tr>
          <td>${record.full_name}</td>
          <td>${record.last_invitation_date ? new Date(record.last_invitation_date).toLocaleDateString() : 'N/A'}</td>
          <td>${Math.floor(record.months_with_us)}</td>
          <td>${record.classes_this_month} / 8</td>
        </tr>`);
      });
      printWindow.document.write('</table>');
    } else {
      printWindow.document.write('<p>No invitations sent yet.</p>');
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }

  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'eligible' && record.is_eligible && !record.invitation_sent) ||
      (filterType === 'not_eligible' && !record.is_eligible) ||
      (filterType === 'invited' && record.invitation_sent);
    return matchesSearch && matchesFilter;
  });

  const eligibleCount = records.filter((r) => r.is_eligible && !r.invitation_sent).length;
  const notEligibleCount = records.filter(r => !r.is_eligible).length;
  const invitedCount = records.filter(r => r.invitation_sent).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading exam eligibility...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-600 mt-1">
            Manage exam eligibility and confirm results
          </p>
        </div>
        {activeTab === 'eligibility' && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        )}
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('eligibility')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'eligibility'
                ? 'border-red-700 text-red-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Eligibility
            </div>
          </button>
          <button
            onClick={() => setActiveTab('confirmation')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'confirmation'
                ? 'border-red-700 text-red-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Confirmation
              {invitedStudents.length > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                  {invitedStudents.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'eligibility' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{records.length}</p>
                </div>
                <Award className="w-12 h-12 text-blue-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Eligible</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{eligibleCount}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Invited</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{invitedCount}</p>
                </div>
                <Send className="w-12 h-12 text-purple-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Not Eligible</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{notEligibleCount}</p>
                </div>
                <XCircle className="w-12 h-12 text-red-600 opacity-20" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search student by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('eligible')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    filterType === 'eligible'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Eligible
                </button>
                <button
                  onClick={() => setFilterType('invited')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    filterType === 'invited'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Invited
                </button>
                <button
                  onClick={() => setFilterType('not_eligible')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    filterType === 'not_eligible'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Not Eligible
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Joined Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Months With Us</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Classes This Month</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Total Classes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.student_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{record.full_name}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(record.joined_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className={`font-medium ${record.months_with_us >= 3 ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.floor(record.months_with_us)} months
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${record.classes_this_month >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                            {record.classes_this_month} / 8
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-700">{record.total_classes_attended}</span>
                        </td>
                        <td className="px-4 py-3">
                          {record.invitation_sent ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-purple-600">
                                <Send className="w-5 h-5" />
                                <span className="font-semibold">Invitation Sent</span>
                              </div>
                              {record.last_invitation_date && (
                                <span className="text-xs text-gray-500">
                                  {new Date(record.last_invitation_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : record.is_eligible ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-semibold">Eligible</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="w-5 h-5" />
                              <span className="font-semibold">Not Eligible</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {record.invitation_sent ? (
                            <button
                              onClick={() => markInvitationUnsent(record.student_id)}
                              className="flex items-center gap-2 px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Unsend
                            </button>
                          ) : record.is_eligible ? (
                            <button
                              onClick={() => markInvitationSent(record.student_id, record.branch_id)}
                              className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                            >
                              <Send className="w-4 h-4" />
                              Mark Sent
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No students found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Eligibility Requirements:</h3>
            <ul className="space-y-1 text-blue-800">
              <li>• Students must be with us for at least 3 months</li>
              <li>• Students must attend at least 8 classes per month</li>
              <li>• Students with sent invitations won't appear as eligible for 3 months</li>
              <li>• You can mark invitations as unsent to make students eligible again</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <ClipboardCheck className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Instructions:</strong> Check attendance for invited students, mark results (Pass/Fail), and select next belt for promoted students. Click Save to update records.
                </p>
              </div>
            </div>
          </div>

          {invitedStudents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Invited Students</h3>
              <p className="text-gray-600">
                Send invitations to eligible students from the Eligibility tab first.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Student</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Current Belt</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Attended</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Result</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Next Belt</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invitedStudents.map((student) => {
                        const data = participationData[student.student_id] || {};
                        const higherBelts = beltRanks.filter(b => b.belt_order > student.belt_order);

                        return (
                          <tr key={student.student_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-900">{student.full_name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: student.belt_color }}
                                />
                                <span className="text-sm">{student.belt_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={data.attended || false}
                                onChange={(e) => updateParticipation(student.student_id, 'attended', e.target.checked)}
                                className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                disabled={!data.attended}
                                value={data.result || ''}
                                onChange={(e) => updateParticipation(student.student_id, 'result', e.target.value || null)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">Select...</option>
                                <option value="pass">Pass</option>
                                <option value="fail">Fail</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                disabled={data.result !== 'pass'}
                                value={data.next_belt_key || ''}
                                onChange={(e) => {
                                  const selectedBelt = beltRanks.find(b => b.belt_key === e.target.value);
                                  updateParticipation(student.student_id, 'next_belt_key', e.target.value);
                                  updateParticipation(student.student_id, 'next_belt_order', selectedBelt?.belt_order || null);
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">Auto (Next Belt)</option>
                                {higherBelts.map((belt) => (
                                  <option key={belt.belt_key} value={belt.belt_key}>
                                    {belt.belt_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={data.notes || ''}
                                onChange={(e) => updateParticipation(student.student_id, 'notes', e.target.value)}
                                placeholder="Optional notes..."
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveExamResults}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Exam Results'}
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">Important Notes:</h3>
                <ul className="space-y-1 text-red-800 text-sm">
                  <li>• Only students who attended can have results</li>
                  <li>• Only students who passed can be promoted to next belt</li>
                  <li>• If no next belt is selected, the system will automatically promote to the next belt level</li>
                  <li>• Belt promotions are permanent and logged in the system</li>
                  <li>• You cannot promote beyond 1st Dan Black Belt</li>
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
