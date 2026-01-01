import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Settings as SettingsType } from '../lib/supabase';
import { Search, MessageCircle, CheckCircle, Filter, X, AlertTriangle, Phone, Calendar, Clock, XCircle } from 'lucide-react';

interface InactivePlayer {
  student_id: string;
  full_name: string;
  phone1: string;
  phone2: string;
  branch_id: string;
  branch_name: string;
  last_attendance_date: string | null;
  days_absent: number;
  last_contact_date: string | null;
  last_contact_status: string | null;
  last_contact_method: string | null;
  created_at: string;
}

interface ConfirmModal {
  show: boolean;
  playerId: string;
  playerName: string;
  branchId: string;
}

export default function InactivePlayers() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<InactivePlayer[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<'all' | '14' | '30' | '60' | '90'>('all');
  const [contactedFilter, setContactedFilter] = useState<'all' | 'contacted' | 'not_contacted'>('all');
  const [branches, setBranches] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({ show: false, playerId: '', playerName: '', branchId: '' });
  const [contactNotes, setContactNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSettings();
    loadBranches();
  }, []);

  useEffect(() => {
    if (settings) {
      loadInactivePlayers();
    }
  }, [settings, profile]);

  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) setSettings(data as SettingsType);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function loadBranches() {
    try {
      const { data } = await supabase.from('branches').select('id, branch_name').order('branch_name');
      if (data) setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }

  async function loadInactivePlayers() {
    if (!settings) return;

    try {
      setLoading(true);

      const thresholdDays = settings.inactive_threshold_days || 14;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
      const thresholdDateStr = thresholdDate.toISOString();

      let studentsQuery = supabase
        .from('students')
        .select(`
          id,
          full_name,
          phone1,
          phone2,
          branch_id,
          created_at,
          branches(branch_name)
        `)
        .eq('is_active', true);

      if (profile?.role === 'branch_manager' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
      }

      const { data: students } = await studentsQuery;

      if (!students) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id, attendance_date')
        .in('student_id', studentIds)
        .order('attendance_date', { ascending: false });

      const lastAttendanceMap: Record<string, string> = {};
      attendanceData?.forEach((record: any) => {
        if (!lastAttendanceMap[record.student_id]) {
          lastAttendanceMap[record.student_id] = record.attendance_date;
        }
      });

      const { data: contactsData } = await supabase
        .from('player_contacts')
        .select('student_id, contacted_at, status, contact_method')
        .in('student_id', studentIds)
        .order('contacted_at', { ascending: false });

      const lastContactMap: Record<string, any> = {};
      contactsData?.forEach((record: any) => {
        if (!lastContactMap[record.student_id]) {
          lastContactMap[record.student_id] = {
            contacted_at: record.contacted_at,
            status: record.status,
            contact_method: record.contact_method
          };
        }
      });

      const inactivePlayers: InactivePlayer[] = [];

      students.forEach((student: any) => {
        const lastAttendance = lastAttendanceMap[student.id];
        const referenceDate = lastAttendance ? new Date(lastAttendance) : new Date(student.created_at);
        const daysAbsent = Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysAbsent >= thresholdDays) {
          const lastContact = lastContactMap[student.id];
          inactivePlayers.push({
            student_id: student.id,
            full_name: student.full_name,
            phone1: student.phone1,
            phone2: student.phone2,
            branch_id: student.branch_id,
            branch_name: student.branches?.branch_name || 'Unknown',
            last_attendance_date: lastAttendance || null,
            days_absent: daysAbsent,
            last_contact_date: lastContact?.contacted_at || null,
            last_contact_status: lastContact?.status || null,
            last_contact_method: lastContact?.contact_method || null,
            created_at: student.created_at,
          });
        }
      });

      inactivePlayers.sort((a, b) => b.days_absent - a.days_absent);
      setPlayers(inactivePlayers);
    } catch (error) {
      console.error('Error loading inactive players:', error);
    } finally {
      setLoading(false);
    }
  }

  function openWhatsApp(player: InactivePlayer) {
    if (!settings) return;

    const phone = player.phone1 || player.phone2 || '';
    if (!phone) {
      alert('No phone number available for this player');
      return;
    }

    let message = '';
    const lang = settings.default_language || 'en';

    if (lang === 'ar') {
      message = settings.whatsapp_message_inactive_ar || '';
    } else if (lang === 'hi') {
      message = settings.whatsapp_message_inactive_hi || '';
    } else {
      message = settings.whatsapp_message_inactive_en || '';
    }

    message = message
      .replace('{student_name}', player.full_name)
      .replace('{academy_name}', settings.academy_name || 'Academy')
      .replace('{days_absent}', player.days_absent.toString());

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');

    setConfirmModal({
      show: true,
      playerId: player.student_id,
      playerName: player.full_name,
      branchId: player.branch_id
    });
  }

  async function handleConfirmSent() {
    if (!confirmModal.playerId) return;

    try {
      setSubmitting(true);

      const { error } = await supabase.from('player_contacts').insert({
        student_id: confirmModal.playerId,
        branch_id: confirmModal.branchId,
        contacted_by: profile?.id,
        contact_method: 'whatsapp',
        status: 'sent',
        notes: contactNotes || null,
      });

      if (error) throw error;

      alert('Contact logged successfully!');
      closeModal();
      loadInactivePlayers();
    } catch (error) {
      console.error('Error logging contact:', error);
      alert('Failed to log contact');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmNotSent() {
    if (!confirmModal.playerId) return;

    try {
      setSubmitting(true);

      const { error } = await supabase.from('player_contacts').insert({
        student_id: confirmModal.playerId,
        branch_id: confirmModal.branchId,
        contacted_by: profile?.id,
        contact_method: 'whatsapp',
        status: 'not_sent',
        notes: contactNotes || 'Message was not sent',
      });

      if (error) throw error;

      alert('Attempt recorded!');
      closeModal();
      loadInactivePlayers();
    } catch (error) {
      console.error('Error logging attempt:', error);
      alert('Failed to log attempt');
    } finally {
      setSubmitting(false);
    }
  }

  function closeModal() {
    setConfirmModal({ show: false, playerId: '', playerName: '', branchId: '' });
    setContactNotes('');
  }

  function isInCooldown(player: InactivePlayer): boolean {
    if (!settings || !player.last_contact_date || player.last_contact_status !== 'sent') return false;

    const cooldownDays = settings.whatsapp_contact_cooldown_days || 3;
    const lastContactDate = new Date(player.last_contact_date);
    const daysSinceContact = Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysSinceContact < cooldownDays;
  }

  function getCooldownDaysRemaining(player: InactivePlayer): number {
    if (!settings || !player.last_contact_date) return 0;

    const cooldownDays = settings.whatsapp_contact_cooldown_days || 3;
    const lastContactDate = new Date(player.last_contact_date);
    const daysSinceContact = Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

    return Math.max(0, cooldownDays - daysSinceContact);
  }

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === 'all' || player.branch_id === branchFilter;
    const matchesDays =
      daysFilter === 'all' ||
      (daysFilter === '14' && player.days_absent >= 14 && player.days_absent < 30) ||
      (daysFilter === '30' && player.days_absent >= 30 && player.days_absent < 60) ||
      (daysFilter === '60' && player.days_absent >= 60 && player.days_absent < 90) ||
      (daysFilter === '90' && player.days_absent >= 90);
    const matchesContacted =
      contactedFilter === 'all' ||
      (contactedFilter === 'contacted' && player.last_contact_status === 'sent') ||
      (contactedFilter === 'not_contacted' && player.last_contact_status !== 'sent');

    return matchesSearch && matchesBranch && matchesDays && matchesContacted;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading inactive players...</div>
      </div>
    );
  }

  if (!settings?.enable_inactive_alerts) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Feature Disabled</h2>
          <p className="text-gray-700 mb-4">
            The Inactive Player Alerts feature is currently disabled.
          </p>
          <p className="text-sm text-gray-600">
            Please enable it in Settings to start tracking inactive players.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inactive Players</h1>
          <p className="text-gray-600 mt-1">
            Players who haven't attended in {settings?.inactive_threshold_days || 14}+ days
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Inactive</p>
          <p className="text-3xl font-bold text-orange-600">{filteredPlayers.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            />
          </div>

          {profile?.role === 'super_admin' && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          )}

          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
          >
            <option value="all">All Days Absent</option>
            <option value="14">14-29 days</option>
            <option value="30">30-59 days</option>
            <option value="60">60-89 days</option>
            <option value="90">90+ days</option>
          </select>

          <select
            value={contactedFilter}
            onChange={(e) => setContactedFilter(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
          >
            <option value="all">All Status</option>
            <option value="contacted">Contacted (Sent)</option>
            <option value="not_contacted">Not Contacted</option>
          </select>
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Inactive Players</h3>
          <p className="text-gray-600">All players are actively attending classes!</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Player</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Attendance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Days Absent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPlayers.map((player) => {
                  const inCooldown = isInCooldown(player);
                  const cooldownDays = getCooldownDaysRemaining(player);

                  return (
                    <tr key={player.student_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{player.full_name}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{player.branch_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {player.last_attendance_date
                            ? new Date(player.last_attendance_date).toLocaleDateString()
                            : 'Never attended'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span
                            className={`font-bold ${
                              player.days_absent >= 90
                                ? 'text-red-600'
                                : player.days_absent >= 60
                                ? 'text-orange-600'
                                : player.days_absent >= 30
                                ? 'text-yellow-600'
                                : 'text-gray-700'
                            }`}
                          >
                            {player.days_absent} days
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          {player.phone1 || player.phone2 || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {player.last_contact_date ? (
                          <div className="flex flex-col">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full w-fit ${
                                player.last_contact_status === 'sent'
                                  ? 'bg-green-100 text-green-800'
                                  : player.last_contact_status === 'not_sent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {player.last_contact_status === 'sent' && <CheckCircle className="w-3 h-3" />}
                              {player.last_contact_status === 'not_sent' && <XCircle className="w-3 h-3" />}
                              {player.last_contact_status === 'sent'
                                ? 'Sent'
                                : player.last_contact_status === 'not_sent'
                                ? 'Not Sent'
                                : 'Attempted'}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {new Date(player.last_contact_date).toLocaleDateString()}
                            </span>
                            {player.last_contact_method && (
                              <span className="text-xs text-gray-400 capitalize">{player.last_contact_method}</span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Not Contacted
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {inCooldown ? (
                          <div className="text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Cooldown
                            </div>
                            <div className="text-xs text-gray-400">
                              {cooldownDays} day{cooldownDays !== 1 ? 's' : ''} left
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openWhatsApp(player)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Confirm WhatsApp Message</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              Did you successfully send the WhatsApp message to <strong>{confirmModal.playerName}</strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="E.g., No answer, busy, wrong number..."
                disabled={submitting}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmSent}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {submitting ? 'Saving...' : 'Mark as Sent'}
              </button>
              <button
                onClick={handleConfirmNotSent}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {submitting ? 'Saving...' : 'Not Sent'}
              </button>
            </div>

            <button
              onClick={closeModal}
              disabled={submitting}
              className="w-full mt-3 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How It Works:</h3>
        <ul className="space-y-1 text-blue-800 text-sm">
          <li>• Click WhatsApp to open pre-filled message</li>
          <li>• After sending, confirm delivery status for accurate tracking</li>
          <li>• Mark as "Sent" if message was delivered successfully</li>
          <li>• Mark as "Not Sent" if you couldn't deliver the message</li>
          <li>• Cooldown period prevents contacting same player too frequently</li>
          <li>• Contact history is preserved for all tracking and reporting</li>
        </ul>
      </div>
    </div>
  );
}
