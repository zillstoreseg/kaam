import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2, Users, DollarSign, TrendingUp, CheckCircle, XCircle, Clock, Shield } from 'lucide-react';

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  trialTenants: number;
  totalStudents: number;
  totalBranches: number;
  totalRevenue: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
}

interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  created_at: string;
  subscription?: {
    plan: string;
    status: string;
    renews_at: string;
  };
  student_count?: number;
  branch_count?: number;
}

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats>({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    trialTenants: 0,
    totalStudents: 0,
    totalBranches: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
  });
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatformStats();
    loadTenants();
  }, []);

  async function loadPlatformStats() {
    try {
      const { data: tenantsData, count: tenantCount } = await supabase
        .from('tenants')
        .select('status', { count: 'exact' });

      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      const { count: branchesCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true });

      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('total_amount');

      const { data: subscriptionsData, count: subscriptionCount } = await supabase
        .from('subscriptions')
        .select('status', { count: 'exact' });

      const activeTenants = tenantsData?.filter(t => t.status === 'active').length || 0;
      const suspendedTenants = tenantsData?.filter(t => t.status === 'suspended').length || 0;
      const trialTenants = tenantsData?.filter(t => t.status === 'trial').length || 0;

      const totalRevenue = invoicesData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

      const activeSubscriptions = subscriptionsData?.filter(s => s.status === 'active').length || 0;
      const expiredSubscriptions = subscriptionsData?.filter(s => s.status === 'expired').length || 0;

      setStats({
        totalTenants: tenantCount || 0,
        activeTenants,
        suspendedTenants,
        trialTenants,
        totalStudents: studentsCount || 0,
        totalBranches: branchesCount || 0,
        totalRevenue,
        activeSubscriptions,
        expiredSubscriptions: (subscriptionCount || 0) - activeSubscriptions,
      });
    } catch (error) {
      console.error('Error loading platform stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTenants() {
    try {
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (!tenantsData) return;

      const enrichedTenants = await Promise.all(
        tenantsData.map(async (tenant) => {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan, status, renews_at')
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          const { count: branchCount } = await supabase
            .from('branches')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          return {
            ...tenant,
            subscription: subscription || undefined,
            student_count: studentCount || 0,
            branch_count: branchCount || 0,
          };
        })
      );

      setTenants(enrichedTenants);
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'single': return 'bg-blue-100 text-blue-800';
      case 'multi': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="text-center py-12">Loading platform data...</div>;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Platform Dashboard
          </h1>
        </div>
        <p className="text-gray-600">Multi-tenant management and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition"
          onClick={() => navigate('/admin/tenants')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tenants</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTenants}</p>
              <p className="text-xs text-blue-600 mt-1">Click to manage</p>
            </div>
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Tenants</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeTenants}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-red-600">Suspended: {stats.suspendedTenants}</span>
                <span className="text-blue-600">Trial: {stats.trialTenants}</span>
              </div>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
              <p className="text-xs text-gray-500 mt-1">Across all tenants</p>
            </div>
            <Users className="w-12 h-12 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Branches</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalBranches}</p>
              <p className="text-xs text-gray-500 mt-1">Across all tenants</p>
            </div>
            <Building2 className="w-12 h-12 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Platform Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRevenue.toFixed(0)} AED</p>
              <p className="text-xs text-gray-500 mt-1">All-time total</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeSubscriptions}</p>
              <p className="text-xs text-red-600 mt-1">Expired: {stats.expiredSubscriptions}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">All Tenants</h2>
          <button
            onClick={() => navigate('/admin/tenants/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Create New Tenant
          </button>
        </div>

        {tenants.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No tenants found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Subdomain</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Branches</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-4 py-3 text-gray-600">{tenant.subdomain}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tenant.subscription ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(tenant.subscription.plan)}`}>
                          {tenant.subscription.plan}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">No subscription</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tenant.student_count}</td>
                    <td className="px-4 py-3 text-gray-600">{tenant.branch_count}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/tenants?id=${tenant.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
