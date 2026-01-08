import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search, ExternalLink, AlertTriangle, CheckCircle, Clock, Filter, X, Pause, Play, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  created_at: string;
}

interface TenantWithSubscription extends Tenant {
  subscription: {
    id: string;
    plan: string;
    starts_at: string;
    renews_at: string;
    status: string;
    grace_days: number;
  } | null;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

function ConfirmDialog({ isOpen, title, message, confirmText, confirmClass, onConfirm, onCancel, isProcessing }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${confirmClass}`}
          >
            {isProcessing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminTenants() {
  const { startImpersonation } = useTenant();
  const [tenants, setTenants] = useState<TenantWithSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState<string | null>(null);
  const [brandDomain, setBrandDomain] = useState('example.com');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'suspend' | 'activate' | 'extend' | null;
    tenantId: string | null;
    tenantName: string | null;
    days?: number;
  }>({ isOpen: false, type: null, tenantId: null, tenantName: null });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadBrandDomain();
    loadTenants();
  }, []);

  const loadBrandDomain = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('brand_domain')
        .limit(1)
        .maybeSingle();

      if (data?.brand_domain) {
        setBrandDomain(data.brand_domain);
      }
    } catch (err) {
      console.error('Error loading brand domain:', err);
    }
  };

  const loadTenants = async () => {
    try {
      setIsLoading(true);

      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      const tenantsWithSubs = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...tenant,
            subscription: subData,
          };
        })
      );

      setTenants(tenantsWithSubs);
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImpersonate = async (tenantId: string) => {
    setIsImpersonating(tenantId);
    try {
      await startImpersonation(tenantId);
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to impersonate:', err);
      alert('Failed to start impersonation. Please try again.');
      setIsImpersonating(null);
    }
  };

  const handleQuickAction = (type: 'suspend' | 'activate' | 'extend', tenant: TenantWithSubscription, days?: number) => {
    setConfirmDialog({
      isOpen: true,
      type,
      tenantId: tenant.id,
      tenantName: tenant.name,
      days,
    });
  };

  const executeAction = async () => {
    if (!confirmDialog.tenantId) return;

    setIsProcessing(true);
    try {
      if (confirmDialog.type === 'suspend') {
        await supabase
          .from('tenants')
          .update({ status: 'suspended' })
          .eq('id', confirmDialog.tenantId);
      } else if (confirmDialog.type === 'activate') {
        await supabase
          .from('tenants')
          .update({ status: 'active' })
          .eq('id', confirmDialog.tenantId);
      } else if (confirmDialog.type === 'extend' && confirmDialog.days) {
        const tenant = tenants.find(t => t.id === confirmDialog.tenantId);
        if (tenant?.subscription) {
          const currentRenewal = new Date(tenant.subscription.renews_at);
          currentRenewal.setDate(currentRenewal.getDate() + confirmDialog.days);

          await supabase
            .from('subscriptions')
            .update({ renews_at: currentRenewal.toISOString().split('T')[0] })
            .eq('id', tenant.subscription.id);
        }
      }

      await loadTenants();
      setConfirmDialog({ isOpen: false, type: null, tenantId: null, tenantName: null });
    } catch (err: any) {
      console.error('Action failed:', err);
      alert(`Failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysUntilRenewal = (renewsAt: string, graceDays: number) => {
    const renewalDate = new Date(renewsAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const graceDaysLeft = graceDays + diffDays;
      if (graceDaysLeft > 0) {
        return { days: graceDaysLeft, inGrace: true };
      }
      return { days: Math.abs(diffDays), expired: true };
    }

    return { days: diffDays, inGrace: false, expired: false };
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    const matchesPlan = planFilter === 'all' || tenant.subscription?.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getConfirmDialogProps = () => {
    switch (confirmDialog.type) {
      case 'suspend':
        return {
          title: 'Suspend Tenant',
          message: `Are you sure you want to suspend "${confirmDialog.tenantName}"? Users will be blocked from accessing the system.`,
          confirmText: 'Suspend',
          confirmClass: 'bg-orange-600 text-white hover:bg-orange-700',
        };
      case 'activate':
        return {
          title: 'Activate Tenant',
          message: `Activate "${confirmDialog.tenantName}"? Users will regain access to the system.`,
          confirmText: 'Activate',
          confirmClass: 'bg-green-600 text-white hover:bg-green-700',
        };
      case 'extend':
        return {
          title: 'Extend Subscription',
          message: `Extend "${confirmDialog.tenantName}" subscription by ${confirmDialog.days} days?`,
          confirmText: 'Extend',
          confirmClass: 'bg-blue-600 text-white hover:bg-blue-700',
        };
      default:
        return {
          title: '',
          message: '',
          confirmText: '',
          confirmClass: '',
        };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
              <p className="text-sm text-gray-500 mt-1">{filteredTenants.length} of {tenants.length} tenants</p>
            </div>
          </div>
          <Link
            to="/admin/tenants/new"
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            <Plus className="h-5 w-5" />
            Create Tenant
          </Link>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or subdomain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition ${
              showFilters ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-5 w-5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Plans</option>
                  <option value="single">Single</option>
                  <option value="multi">Multi</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setPlanFilter('all');
                    setSearchTerm('');
                  }}
                  className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenants...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Renewal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quick Actions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  More
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.map((tenant) => {
                const renewal = tenant.subscription
                  ? getDaysUntilRenewal(tenant.subscription.renews_at, tenant.subscription.grace_days)
                  : null;

                return (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-sm text-gray-500">{tenant.subdomain}.{brandDomain}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tenant.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : tenant.status === 'trial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tenant.subscription ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 capitalize">
                            {tenant.subscription.plan}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No subscription</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renewal ? (
                        <div className="flex items-center gap-2">
                          {renewal.expired ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600 font-semibold">
                                {renewal.days}d overdue
                              </span>
                            </>
                          ) : renewal.inGrace ? (
                            <>
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span className="text-sm text-orange-600">
                                {renewal.days}d grace
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-gray-700">{renewal.days}d</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {tenant.status === 'active' ? (
                          <button
                            onClick={() => handleQuickAction('suspend', tenant)}
                            className="p-1 text-orange-600 hover:bg-orange-50 rounded transition"
                            title="Suspend"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickAction('activate', tenant)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition"
                            title="Activate"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        {tenant.subscription && (
                          <>
                            <button
                              onClick={() => handleQuickAction('extend', tenant, 30)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
                              title="Extend 30 days"
                            >
                              +30d
                            </button>
                            <button
                              onClick={() => handleQuickAction('extend', tenant, 90)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
                              title="Extend 90 days"
                            >
                              +90d
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        to={`/admin/tenants/${tenant.id}`}
                        className="text-red-600 hover:text-red-900"
                      >
                        Manage
                      </Link>
                      <button
                        onClick={() => handleImpersonate(tenant.id)}
                        disabled={isImpersonating === tenant.id}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                      >
                        {isImpersonating === tenant.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4" />
                            <span>Login As</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredTenants.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || planFilter !== 'all'
                  ? 'No tenants match your filters'
                  : 'No tenants found'}
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        {...getConfirmDialogProps()}
        onConfirm={executeAction}
        onCancel={() => setConfirmDialog({ isOpen: false, type: null, tenantId: null, tenantName: null })}
        isProcessing={isProcessing}
      />
    </div>
  );
}
