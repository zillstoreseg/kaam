import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, SubscriptionPlan } from '../../lib/supabase';
import { Building2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function TenantCreate() {
  const navigate = useNavigate();
  const { isPlatformOwner } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    status: 'active' as 'active' | 'suspended' | 'trial',
    plan: 'single' as SubscriptionPlan,
    startsAt: new Date().toISOString().split('T')[0],
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    graceDays: 7,
    adminEmail: '',
    adminPassword: '',
    adminFullName: '',
  });

  if (!isPlatformOwner()) {
    navigate('/');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      // Validate subdomain
      if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
        throw new Error('Subdomain must contain only lowercase letters, numbers, and hyphens');
      }

      // Create tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.name,
          subdomain: formData.subdomain,
          status: formData.status,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: tenantData.id,
          plan: formData.plan,
          starts_at: formData.startsAt,
          renews_at: formData.renewsAt,
          status: 'active',
          grace_days: formData.graceDays,
          module_overrides: {},
        });

      if (subError) throw subError;

      // Create admin user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.adminEmail,
        password: formData.adminPassword,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: formData.adminFullName,
          role: 'tenant_admin',
          tenant_id: tenantData.id,
          branch_id: null,
        });

      if (profileError) throw profileError;

      // Log to platform audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('platform_audit')
          .insert({
            actor_user_id: user.id,
            action: 'create_tenant',
            tenant_id: tenantData.id,
            details: {
              tenant_name: formData.name,
              subdomain: formData.subdomain,
              plan: formData.plan,
            },
          });
      }

      navigate('/admin/tenants');
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      setError(error.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/tenants')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tenants
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            Create New Tenant
          </h1>
          <p className="text-gray-600 mt-2">Set up a new academy with subscription and admin user</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <XCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Tenant Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academy Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Elite Karate Academy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  pattern="[a-z0-9-]+"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
                  placeholder="elite-karate"
                />
                <span className="text-gray-500">.academy.com</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and hyphens only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as SubscriptionPlan })}
              >
                <option value="single">Single - Basic features</option>
                <option value="multi">Multi - Multi-branch + Expenses</option>
                <option value="enterprise">Enterprise - All features + Security Suite</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starts At *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Renews At *
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.renewsAt}
                  onChange={(e) => setFormData({ ...formData, renewsAt: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grace Days *
              </label>
              <input
                type="number"
                required
                min="0"
                max="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.graceDays}
                onChange={(e) => setFormData({ ...formData, graceDays: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Days after renewal date before blocking access</p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900">Admin User</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.adminFullName}
                onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                placeholder="admin@academy.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? (
                'Creating...'
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Create Tenant
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/tenants')}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
