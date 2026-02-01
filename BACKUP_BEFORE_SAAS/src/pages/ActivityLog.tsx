import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search, Filter, Download, Eye, X, Calendar, User, Laptop, Globe, Activity, AlertTriangle, Shield } from 'lucide-react';

interface AuditLog {
  id: string;
  created_at: string;
  actor_user_id: string;
  actor_role: string;
  branch_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary_key: string;
  summary_params: any;
  before_data: any;
  after_data: any;
  metadata: any;
  ip_address: string | null;
  ip_masked: string | null;
  user_agent: string | null;
  device_name: string | null;
  os_name: string | null;
  browser_name: string | null;
  is_mobile: boolean;
  actor_name?: string;
  branch_name?: string;
}

export default function ActivityLog() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const pageSize = 50;
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      loadBranches();
    }
    loadLogs();
  }, [profile, page, searchTerm, dateFrom, dateTo, branchFilter, actionFilter, entityFilter, sensitiveOnly]);

  async function loadBranches() {
    try {
      const { data } = await supabase.from('branches').select('id, branch_name').order('branch_name');
      if (data) setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  }

  async function loadLogs() {
    if (!profile) return;

    try {
      setLoading(true);

      let query = supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_actor_user_id_fkey(full_name), branches(branch_name)', { count: 'exact' })
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (branchFilter !== 'all') {
        query = query.eq('branch_id', branchFilter);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      if (sensitiveOnly) {
        query = query.in('action', ['delete', 'reset']);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      if (data) {
        const enrichedLogs = data.map((log: any) => ({
          ...log,
          actor_name: log.profiles?.full_name || 'Unknown',
          branch_name: log.branches?.branch_name || 'Global',
        }));

        if (searchTerm) {
          const filtered = enrichedLogs.filter((log: any) =>
            log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.summary_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setLogs(filtered);
          setTotal(filtered.length);
        } else {
          setLogs(enrichedLogs);
          setTotal(count || 0);
        }
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function getSummaryText(log: AuditLog): string {
    const params = log.summary_params || {};
    let text = log.summary_key;

    Object.keys(params).forEach(key => {
      text = text.replace(`{${key}}`, params[key]);
    });

    return text;
  }

  function getActionColor(action: string): string {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-purple-100 text-purple-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      case 'reset': return 'bg-orange-100 text-orange-800';
      case 'promote': return 'bg-yellow-100 text-yellow-800';
      case 'confirm': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function exportToCSV() {
    const headers = ['Date/Time', 'User', 'Role', 'Branch', 'Action', 'Entity Type', 'Entity ID', 'Device', 'OS', 'Browser', 'IP', 'Summary'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.actor_name,
      log.actor_role,
      log.branch_name,
      log.action,
      log.entity_type,
      log.entity_id || '',
      log.device_name || '',
      log.os_name || '',
      log.browser_name || '',
      isSuperAdmin ? (log.ip_address || '') : (log.ip_masked || ''),
      getSummaryText(log),
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function viewDetails(log: AuditLog) {
    setSelectedLog(log);
    setShowDetails(true);
  }

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'branch_manager')) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-700">Only administrators can access the Activity Log.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600 mt-1">Complete audit trail of all system operations</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            />
          </div>

          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="reset">Reset</option>
              <option value="promote">Promote</option>
              <option value="confirm">Confirm</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search user, entity..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            />
          </div>

          <div>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            >
              <option value="all">All Entities</option>
              <option value="student">Students</option>
              <option value="attendance">Attendance</option>
              <option value="exam">Exams</option>
              <option value="expense">Expenses</option>
              <option value="settings">Settings</option>
              <option value="auth">Authentication</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sensitiveOnly"
              checked={sensitiveOnly}
              onChange={(e) => { setSensitiveOnly(e.target.checked); setPage(1); }}
              className="w-4 h-4 text-red-700 rounded focus:ring-2 focus:ring-red-700"
            />
            <label htmlFor="sensitiveOnly" className="text-sm font-medium text-gray-700">
              Sensitive Actions Only
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading activity logs...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Activity Found</h3>
          <p className="text-gray-600">No logs match your current filters.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date/Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{log.actor_name}</span>
                          <span className="text-xs text-gray-500">{log.actor_role}</span>
                          <span className="text-xs text-gray-400">{log.branch_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{log.entity_type}</span>
                          {log.entity_id && (
                            <span className="text-xs text-gray-500">{log.entity_id.substring(0, 8)}...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Laptop className="w-4 h-4" />
                          <div className="flex flex-col">
                            <span>{log.device_name || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">{log.os_name}</span>
                            <span className="text-xs text-gray-400">{log.browser_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Globe className="w-4 h-4" />
                          {isSuperAdmin ? (log.ip_address || 'N/A') : (log.ip_masked || 'N/A')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => viewDetails(log)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white rounded-lg shadow-md px-4 py-3">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} logs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= total}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Audit Log Details</h3>
              <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Date/Time</label>
                  <p className="text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">User</label>
                  <p className="text-gray-900">{selectedLog.actor_name} ({selectedLog.actor_role})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Action</label>
                  <p className="text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Entity</label>
                  <p className="text-gray-900">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Device</label>
                  <p className="text-gray-900">{selectedLog.device_name} - {selectedLog.os_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Browser</label>
                  <p className="text-gray-900">{selectedLog.browser_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">IP Address</label>
                  <p className="text-gray-900">{isSuperAdmin ? (selectedLog.ip_address || 'N/A') : (selectedLog.ip_masked || 'N/A')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Branch</label>
                  <p className="text-gray-900">{selectedLog.branch_name}</p>
                </div>
              </div>

              {selectedLog.summary_params && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Summary</label>
                  <p className="text-gray-900">{getSummaryText(selectedLog)}</p>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Metadata</label>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.before_data && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Before</label>
                  <pre className="bg-red-50 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.before_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_data && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">After</label>
                  <pre className="bg-green-50 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.after_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.user_agent && (
                <details className="bg-gray-50 p-4 rounded">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">User Agent (Raw)</summary>
                  <p className="text-xs text-gray-600 mt-2 break-all">{selectedLog.user_agent}</p>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
