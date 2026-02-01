import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Search, Calendar, User, Laptop, Globe, Shield, AlertTriangle } from 'lucide-react';

interface LoginLog {
  id: string;
  created_at: string;
  actor_user_id: string;
  actor_role: string;
  branch_id: string | null;
  action: string;
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

export default function LoginHistory() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branches, setBranches] = useState<any[]>([]);

  const pageSize = 50;
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      loadBranches();
    }
    loadLogs();
  }, [profile, page, searchTerm, dateFrom, dateTo, branchFilter, statusFilter]);

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
        .in('action', ['login', 'logout', 'failed_login'])
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (branchFilter !== 'all') {
        query = query.eq('branch_id', branchFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('action', statusFilter);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      if (data) {
        const enrichedLogs = data.map((log: any) => ({
          ...log,
          actor_name: log.profiles?.full_name || log.metadata?.email || 'Unknown',
          branch_name: log.branches?.branch_name || 'Global',
        }));

        if (searchTerm) {
          const filtered = enrichedLogs.filter((log: any) =>
            log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.metadata?.email && log.metadata.email.toLowerCase().includes(searchTerm.toLowerCase()))
          );
          setLogs(filtered);
          setTotal(filtered.length);
        } else {
          setLogs(enrichedLogs);
          setTotal(count || 0);
        }
      }
    } catch (error) {
      console.error('Error loading login history:', error);
    } finally {
      setLoading(false);
    }
  }

  function getActionColor(action: string): string {
    switch (action) {
      case 'login': return 'bg-green-100 text-green-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      case 'failed_login': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getActionIcon(action: string) {
    switch (action) {
      case 'login': return <Shield className="w-4 h-4" />;
      case 'logout': return <User className="w-4 h-4" />;
      case 'failed_login': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  }

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'branch_manager')) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-700">Only administrators can access the Login History.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Login History</h1>
          <p className="text-gray-600 mt-1">Track all authentication events in the system</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Events</p>
          <p className="text-3xl font-bold text-red-700">{total}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            >
              <option value="all">All Events</option>
              <option value="login">Successful Logins</option>
              <option value="logout">Logouts</option>
              <option value="failed_login">Failed Logins</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user or email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading login history...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Login Events Found</h3>
          <p className="text-gray-600">No authentication events match your current filters.</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Browser</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div className="flex flex-col">
                            <span className="text-gray-900">{new Date(log.created_at).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{log.actor_name}</span>
                          <span className="text-xs text-gray-500">{log.actor_role}</span>
                          <span className="text-xs text-gray-400">{log.branch_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action === 'failed_login' ? 'Failed Login' : log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Laptop className="w-4 h-4" />
                          <div className="flex flex-col">
                            <span>{log.device_name || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">{log.os_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.browser_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Globe className="w-4 h-4" />
                          {isSuperAdmin ? (log.ip_address || 'N/A') : (log.ip_masked || 'N/A')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white rounded-lg shadow-md px-4 py-3">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} events
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Login History:</h3>
        <ul className="space-y-1 text-blue-800 text-sm">
          <li>• All authentication events are logged with device and location details</li>
          <li>• Failed login attempts help identify potential security threats</li>
          <li>• IP addresses are {isSuperAdmin ? 'fully visible' : 'partially masked for privacy'}</li>
          <li>• Use date range filters to analyze login patterns over time</li>
          <li>• All timestamps are in your local timezone</li>
        </ul>
      </div>
    </div>
  );
}
