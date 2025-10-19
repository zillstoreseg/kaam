import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search, CheckCircle, XCircle, Calendar, Award, Send, Printer, RotateCcw } from 'lucide-react';

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

export default function ExamEligibility() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<EligibilityRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'eligible' | 'not_eligible' | 'invited'>('all');

  useEffect(() => {
    loadEligibilityData();
  }, [profile]);

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

  function handlePrint() {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const eligibleStudents = filteredRecords.filter(r => r.is_eligible && !r.invitation_sent);
    const invitedStudents = filteredRecords.filter(r => r.invitation_sent);

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
    if (invitedStudents.length > 0) {
      printWindow.document.write('<table>');
      printWindow.document.write('<tr><th>Student Name</th><th>Invitation Date</th><th>Months</th><th>Classes This Month</th></tr>');
      invitedStudents.forEach(record => {
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
          <h1 className="text-3xl font-bold text-gray-900">Exam Eligibility</h1>
          <p className="text-gray-600 mt-1">
            Students must have 3+ months tenure and attend 8+ classes per month
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

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
    </div>
  );
}
