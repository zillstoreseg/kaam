import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AlertTriangle, DollarSign, Trash2, RefreshCw, Shield, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SecurityAlert {
  id: string;
  type: 'reset' | 'expense_delete' | 'large_expense' | 'failed_logins' | 'attendance_delete';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  log_id: string;
  entity_type: string;
  entity_id: string | null;
  actor_name: string;
  branch_name: string;
}

export default function SecurityAlerts() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    loadSettings();
    loadAlerts();
  }, [profile]);

  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function loadAlerts() {
    if (!profile) return;

    try {
      setLoading(true);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let query = supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_actor_user_id_fkey(full_name), branches(branch_name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const generatedAlerts: SecurityAlert[] = [];

        data.forEach((log: any) => {
          const actorName = log.profiles?.full_name || 'Unknown';
          const branchName = log.branches?.branch_name || 'Global';

          if (log.action === 'reset') {
            generatedAlerts.push({
              id: log.id,
              type: 'reset',
              severity: 'high',
              title: 'System Reset Executed',
              description: `${actorName} performed a system reset operation`,
              timestamp: log.created_at,
              log_id: log.id,
              entity_type: log.entity_type,
              entity_id: log.entity_id,
              actor_name: actorName,
              branch_name: branchName,
            });
          }

          if (log.action === 'delete' && log.entity_type === 'expense') {
            generatedAlerts.push({
              id: log.id,
              type: 'expense_delete',
              severity: 'medium',
              title: 'Expense Deleted',
              description: `${actorName} deleted an expense record`,
              timestamp: log.created_at,
              log_id: log.id,
              entity_type: log.entity_type,
              entity_id: log.entity_id,
              actor_name: actorName,
              branch_name: branchName,
            });
          }

          if (log.action === 'delete' && log.entity_type === 'attendance') {
            generatedAlerts.push({
              id: log.id,
              type: 'attendance_delete',
              severity: 'medium',
              title: 'Attendance Deleted',
              description: `${actorName} deleted an attendance record`,
              timestamp: log.created_at,
              log_id: log.id,
              entity_type: log.entity_type,
              entity_id: log.entity_id,
              actor_name: actorName,
              branch_name: branchName,
            });
          }

          if (log.action === 'create' && log.entity_type === 'expense' && log.after_data?.amount) {
            const threshold = settings?.large_expense_threshold || 1000;
            if (parseFloat(log.after_data.amount) >= threshold) {
              generatedAlerts.push({
                id: log.id,
                type: 'large_expense',
                severity: 'medium',
                title: 'Large Expense Created',
                description: `${actorName} created an expense of ${log.after_data.amount}`,
                timestamp: log.created_at,
                log_id: log.id,
                entity_type: log.entity_type,
                entity_id: log.entity_id,
                actor_name: actorName,
                branch_name: branchName,
              });
            }
          }

          if (log.action === 'failed_login') {
            generatedAlerts.push({
              id: log.id,
              type: 'failed_logins',
              severity: 'low',
              title: 'Failed Login Attempt',
              description: `Failed login attempt for ${log.metadata?.email || 'unknown user'}`,
              timestamp: log.created_at,
              log_id: log.id,
              entity_type: log.entity_type,
              entity_id: log.entity_id,
              actor_name: actorName,
              branch_name: branchName,
            });
          }
        });

        setAlerts(generatedAlerts);
      }
    } catch (error) {
      console.error('Error loading security alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getAlertIcon(type: string) {
    switch (type) {
      case 'reset': return <RefreshCw className="w-5 h-5" />;
      case 'expense_delete': return <Trash2 className="w-5 h-5" />;
      case 'large_expense': return <DollarSign className="w-5 h-5" />;
      case 'failed_logins': return <AlertTriangle className="w-5 h-5" />;
      case 'attendance_delete': return <Trash2 className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  }

  function viewInActivityLog(alert: SecurityAlert) {
    navigate(`/activity-log?logId=${alert.log_id}`);
  }

  const filteredAlerts = severityFilter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === severityFilter);

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'branch_manager')) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-700">Only administrators can access Security Alerts.</p>
        </div>
      </div>
    );
  }

  if (!settings?.enable_security_alerts) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Alerts Disabled</h2>
          <p className="text-gray-700 mb-4">
            Security alert monitoring is currently disabled.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Alerts</h1>
          <p className="text-gray-600 mt-1">Monitor sensitive operations and potential security issues</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Last 7 Days</p>
          <p className="text-3xl font-bold text-red-700">{filteredAlerts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">High Severity</p>
              <p className="text-2xl font-bold text-red-700">{alerts.filter(a => a.severity === 'high').length}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Medium Severity</p>
              <p className="text-2xl font-bold text-orange-700">{alerts.filter(a => a.severity === 'medium').length}</p>
            </div>
            <Trash2 className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Low Severity</p>
              <p className="text-2xl font-bold text-yellow-700">{alerts.filter(a => a.severity === 'low').length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
          >
            <option value="all">All Severities</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600">Loading security alerts...</div>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Security Alerts</h3>
          <p className="text-gray-600">No security issues detected in the last 7 days.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg shadow-md border-l-4 p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-full ${getSeverityColor(alert.severity)}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{alert.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>By: {alert.actor_name}</span>
                      <span>•</span>
                      <span>Branch: {alert.branch_name}</span>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => viewInActivityLog(alert)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                >
                  <Eye className="w-4 h-4" />
                  View Log
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">About Security Alerts:</h3>
        <ul className="space-y-1 text-blue-800 text-sm">
          <li>• <strong>High Severity:</strong> System resets and critical security events</li>
          <li>• <strong>Medium Severity:</strong> Data deletions and large financial transactions</li>
          <li>• <strong>Low Severity:</strong> Failed login attempts and minor issues</li>
          <li>• Alerts are generated automatically from the last 7 days of activity</li>
          <li>• Click "View Log" to see full details in Activity Log</li>
          <li>• Configure thresholds in Settings → Security Configuration</li>
        </ul>
      </div>
    </div>
  );
}
