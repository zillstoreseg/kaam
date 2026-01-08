import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search, ExternalLink, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
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

export function AdminTenants() {
  const { startImpersonation } = useTenant();
  const [tenants, setTenants] = useState<TenantWithSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState<string | null>(null);

  const loadTenants = async () => {
    try {
      setIsLoading(true);

      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Load subscriptions for each tenant
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
      // Redirect to tenant dashboard
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to impersonate:', err);
      alert('Failed to start impersonation. Please try again.');
      setIsImpersonating(null);
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

  useEffect(() => {
    loadTenants();
  }, []);

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          </div>
          <Link
            to="/admin/tenants/new"
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            <Plus className="h-5 w-5" />
            Create Tenant
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                        <div className="text-sm text-gray-500">{tenant.subdomain}.example.com</div>
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
                          {tenant.subscription.status === 'expired' && (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
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
                                {renewal.days} days overdue
                              </span>
                            </>
                          ) : renewal.inGrace ? (
                            <>
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span className="text-sm text-orange-600">
                                {renewal.days} grace days left
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-gray-700">{renewal.days} days</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
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
              <p className="text-gray-600">No tenants found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
