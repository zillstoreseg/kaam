import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Tenant, Subscription, getDaysUntilRenewal } from '../../lib/supabase';
import { Building2, Plus, Calendar, AlertCircle, CheckCircle, Clock, PlayCircle } from 'lucide-react';

interface TenantWithSubscription extends Tenant {
  subscription: Subscription | null;
}

export default function TenantList() {
  const navigate = useNavigate();
  const { isPlatformOwner } = useAuth();
  const [tenants, setTenants] = useState<TenantWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPlatformOwner()) {
      navigate('/');
      return;
    }
    loadTenants();
  }, []);

  async function loadTenants() {
    try {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      const tenantsWithSubs: TenantWithSubscription[] = [];

      for (const tenant of tenantsData || []) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        tenantsWithSubs.push({
          ...tenant,
          subscription: subData,
        });
      }

      setTenants(tenantsWithSubs);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleImpersonate(tenantId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create impersonation session
      const { error } = await supabase
        .from('impersonation_sessions')
        .insert({
          admin_user_id: user.id,
          tenant_id: tenantId,
        });

      if (error) throw error;

      // Log to platform audit
      await supabase
        .from('platform_audit')
        .insert({
          actor_user_id: user.id,
          action: 'impersonate_tenant',
          tenant_id: tenantId,
          details: { timestamp: new Date().toISOString() },
        });

      // Reload page to activate impersonation
      window.location.href = '/';
    } catch (error) {
      console.error('Error creating impersonation session:', error);
      alert('Failed to impersonate tenant');
    }
  }

  async function handleToggleStatus(tenant: Tenant) {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';

    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', tenant.id);

      if (error) throw error;

      await loadTenants();
    } catch (error) {
      console.error('Error updating tenant status:', error);
      alert('Failed to update tenant status');
    }
  }

  function getStatusBadge(status: string) {
    const colors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  }

  function getDaysLeftBadge(subscription: Subscription | null) {
    if (!subscription) return <span className="text-gray-400 text-sm">No subscription</span>;

    const daysLeft = getDaysUntilRenewal(subscription);

    if (daysLeft < 0) {
      return (
        <span className="flex items-center gap-1 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          Expired {Math.abs(daysLeft)} days ago
        </span>
      );
    } else if (daysLeft <= 7) {
      return (
        <span className="flex items-center gap-1 text-yellow-600 text-sm">
          <Clock className="h-4 w-4" />
          {daysLeft} days left
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          {daysLeft} days left
        </span>
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Platform Admin - Tenants
            </h1>
            <p className="text-gray-600 mt-2">Manage all academy tenants and subscriptions</p>
          </div>
          <button
            onClick={() => navigate('/admin/tenants/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Tenant
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-sm text-gray-500">{tenant.subdomain}.academy.com</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(tenant.status)}
                  </td>
                  <td className="px-6 py-4">
                    {tenant.subscription ? (
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {tenant.subscription.plan}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">No plan</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {tenant.subscription ? (
                      <div className="space-y-1">
                        {getDaysLeftBadge(tenant.subscription)}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Renews: {new Date(tenant.subscription.renews_at).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleImpersonate(tenant.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Login As
                    </button>
                    <button
                      onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(tenant)}
                      className={`inline-flex items-center px-3 py-1 text-sm rounded transition-colors ${
                        tenant.status === 'active'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tenants.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No tenants found. This is unusual.</p>
              <p className="text-sm text-gray-400">
                The "Main Academy" tenant should have been created during migration.
                <br />
                Click "Create Tenant" above to add your first academy.
              </p>
            </div>
          )}
        </div>

        {tenants.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• <strong>Login As:</strong> Click to impersonate tenant for support (no password needed)</li>
              <li>• <strong>Edit:</strong> Modify tenant details, plan, and subscription dates</li>
              <li>• <strong>Suspend/Activate:</strong> Control tenant access instantly</li>
              <li>• Your existing data is in "<strong>Main Academy</strong>" tenant</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
