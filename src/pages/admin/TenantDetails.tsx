import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Shield, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  created_at: string;
}

interface Subscription {
  id: string;
  tenant_id: string;
  plan: 'single' | 'multi' | 'enterprise';
  starts_at: string;
  renews_at: string;
  status: 'active' | 'expired';
  grace_days: number;
  created_at: string;
}

export function TenantDetails() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [editedTenant, setEditedTenant] = useState({
    name: '',
    status: 'active' as 'active' | 'suspended' | 'trial',
  });

  const [editedSubscription, setEditedSubscription] = useState({
    plan: 'single' as 'single' | 'multi' | 'enterprise',
    renews_at: '',
    grace_days: 0,
  });

  const loadData = async () => {
    if (!tenantId) return;

    try {
      setIsLoading(true);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;
      setTenant(tenantData);
      setEditedTenant({
        name: tenantData.name,
        status: tenantData.status,
      });

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData);
      if (subData) {
        setEditedSubscription({
          plan: subData.plan,
          renews_at: subData.renews_at,
          grace_days: subData.grace_days,
        });
      }
    } catch (err) {
      console.error('Error loading tenant:', err);
      alert('Failed to load tenant details');
      navigate('/admin/tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant || isSaving) return;

    setIsSaving(true);
    try {
      // Update tenant
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          name: editedTenant.name,
          status: editedTenant.status,
        })
        .eq('id', tenant.id);

      if (tenantError) throw tenantError;

      // Update subscription
      if (subscription) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            plan: editedSubscription.plan,
            renews_at: editedSubscription.renews_at,
            grace_days: editedSubscription.grace_days,
          })
          .eq('id', subscription.id);

        if (subError) throw subError;
      }

      alert('Tenant updated successfully');
      await loadData();
    } catch (err: any) {
      console.error('Error updating tenant:', err);
      alert(`Failed to update tenant: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const extendRenewal = (days: number) => {
    if (!subscription) return;

    const currentRenewal = new Date(editedSubscription.renews_at);
    currentRenewal.setDate(currentRenewal.getDate() + days);
    setEditedSubscription({
      ...editedSubscription,
      renews_at: currentRenewal.toISOString().split('T')[0],
    });
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant details...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Tenant not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/tenants')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Tenants
        </button>

        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
        </div>
        <p className="text-gray-600 mt-1">{tenant.subdomain}.example.com</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-red-600" />
            Tenant Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academy Name
              </label>
              <input
                type="text"
                value={editedTenant.name}
                onChange={(e) => setEditedTenant({ ...editedTenant, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain
              </label>
              <input
                type="text"
                value={tenant.subdomain}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Subdomain cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={editedTenant.status}
                onChange={(e) => setEditedTenant({ ...editedTenant, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created At
              </label>
              <input
                type="text"
                value={new Date(tenant.created_at).toLocaleString()}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Subscription Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Subscription
          </h2>

          {subscription ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan
                </label>
                <select
                  value={editedSubscription.plan}
                  onChange={(e) => setEditedSubscription({ ...editedSubscription, plan: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="single">Single Branch</option>
                  <option value="multi">Multi Branch</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Renewal Date
                </label>
                <input
                  type="date"
                  value={editedSubscription.renews_at}
                  onChange={(e) => setEditedSubscription({ ...editedSubscription, renews_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => extendRenewal(30)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    +30 days
                  </button>
                  <button
                    type="button"
                    onClick={() => extendRenewal(90)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    +90 days
                  </button>
                  <button
                    type="button"
                    onClick={() => extendRenewal(365)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    +1 year
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={editedSubscription.grace_days}
                  onChange={(e) => setEditedSubscription({ ...editedSubscription, grace_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Started At
                </label>
                <input
                  type="text"
                  value={new Date(subscription.starts_at).toLocaleDateString()}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No subscription found</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/tenants')}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
