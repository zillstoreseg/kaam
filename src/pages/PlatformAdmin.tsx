import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BRANDING } from '../lib/constants';
import {
  Building2,
  CreditCard,
  Settings as SettingsIcon,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  LayoutDashboard,
  UserCog,
  TrendingUp,
  AlertCircle,
  Package,
  DollarSign
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  description: string;
  max_students?: number;
  max_branches?: number;
  max_coaches?: number;
  max_branch_managers?: number;
  max_storage_mb?: number;
}

interface Feature {
  key: string;
  label: string;
  category: string;
}

interface Academy {
  id: string;
  name: string;
  domain: string;
  status: string;
  subscription_status: string;
  expires_at: string | null;
  plan_id: string;
}

interface PlanFeature {
  plan_id: string;
  feature_key: string;
  enabled: boolean;
}

interface AcademyStats {
  id: string;
  name: string;
  total_students: number;
  total_branches: number;
  total_users: number;
  total_revenue: number;
}

export default function PlatformAdmin() {
  const [activeView, setActiveView] = useState<'dashboard' | 'academies' | 'plans' | 'settings'>('dashboard');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [academyStats, setAcademyStats] = useState<AcademyStats[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingAcademy, setEditingAcademy] = useState<Academy | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  const [newAcademy, setNewAcademy] = useState({ name: '', domain: '', plan_id: '' });
  const [newPlan, setNewPlan] = useState({
    name: '',
    price_monthly: 0,
    description: '',
    max_students: 100,
    max_branches: 1,
    max_coaches: 5,
    max_branch_managers: 2,
    max_storage_mb: 1024
  });
  const [newFeature, setNewFeature] = useState({ key: '', label: '', category: '' });

  const [showAcademyForm, setShowAcademyForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadPlans(),
      loadFeatures(),
      loadAcademies(),
      loadPlanFeatures(),
      loadAcademyStats()
    ]);
    setLoading(false);
  };

  const loadPlans = async () => {
    const { data } = await supabase.from('plans').select('*').order('price_monthly');
    if (data) setPlans(data);
  };

  const loadFeatures = async () => {
    const { data } = await supabase.from('features').select('*').order('category, label');
    if (data) setFeatures(data);
  };

  const loadAcademies = async () => {
    const { data } = await supabase.from('academies').select('*').order('created_at', { ascending: false });
    if (data) setAcademies(data);
  };

  const loadPlanFeatures = async () => {
    const { data } = await supabase.from('plan_features').select('*');
    if (data) setPlanFeatures(data);
  };

  const loadAcademyStats = async () => {
    const { data: academiesData } = await supabase.from('academies').select('id, name');
    if (!academiesData) return;

    const stats = await Promise.all(
      academiesData.map(async (academy) => {
        const [studentsRes, branchesRes, usersRes, invoicesRes] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('branches').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('invoices').select('total_amount')
        ]);

        const totalRevenue = invoicesRes.data?.reduce((sum, inv: any) => sum + (Number(inv.total_amount) || 0), 0) || 0;

        return {
          id: academy.id,
          name: academy.name,
          total_students: studentsRes.count || 0,
          total_branches: branchesRes.count || 0,
          total_users: usersRes.count || 0,
          total_revenue: totalRevenue
        };
      })
    );

    setAcademyStats(stats);
  };

  const createAcademy = async () => {
    const { error } = await supabase.from('academies').insert([{
      ...newAcademy,
      status: 'active',
      subscription_status: 'trial',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }]);

    if (!error) {
      setNewAcademy({ name: '', domain: '', plan_id: '' });
      setShowAcademyForm(false);
      loadAcademies();
      loadAcademyStats();
    }
  };

  const updateAcademy = async (academy: Academy) => {
    const { error } = await supabase
      .from('academies')
      .update(academy)
      .eq('id', academy.id);

    if (!error) {
      setEditingAcademy(null);
      loadAcademies();
    }
  };

  const deleteAcademy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this academy?')) return;

    const { error } = await supabase.from('academies').delete().eq('id', id);
    if (!error) {
      loadAcademies();
      loadAcademyStats();
    }
  };

  const createPlan = async () => {
    const { error } = await supabase.from('plans').insert([newPlan]);

    if (!error) {
      setNewPlan({
        name: '',
        price_monthly: 0,
        description: '',
        max_students: 100,
        max_branches: 1,
        max_coaches: 5,
        max_branch_managers: 2,
        max_storage_mb: 1024
      });
      setShowPlanForm(false);
      loadPlans();
    }
  };

  const updatePlan = async (plan: Plan) => {
    const { error } = await supabase
      .from('plans')
      .update(plan)
      .eq('id', plan.id);

    if (!error) {
      setEditingPlan(null);
      loadPlans();
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (!error) loadPlans();
  };

  const createFeature = async () => {
    const { error } = await supabase.from('features').insert([newFeature]);

    if (!error) {
      setNewFeature({ key: '', label: '', category: '' });
      setShowFeatureForm(false);
      loadFeatures();
    }
  };

  const updateFeature = async (feature: Feature) => {
    const { error } = await supabase
      .from('features')
      .update({ label: feature.label, category: feature.category })
      .eq('key', feature.key);

    if (!error) {
      setEditingFeature(null);
      loadFeatures();
    }
  };

  const deleteFeature = async (key: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    const { error } = await supabase.from('features').delete().eq('key', key);
    if (!error) loadFeatures();
  };

  const togglePlanFeature = async (planId: string, featureKey: string) => {
    const existing = planFeatures.find(
      pf => pf.plan_id === planId && pf.feature_key === featureKey
    );

    if (existing) {
      await supabase
        .from('plan_features')
        .update({ enabled: !existing.enabled })
        .eq('plan_id', planId)
        .eq('feature_key', featureKey);
    } else {
      await supabase
        .from('plan_features')
        .insert([{ plan_id: planId, feature_key: featureKey, enabled: true }]);
    }

    loadPlanFeatures();
  };

  const isPlanFeatureEnabled = (planId: string, featureKey: string) => {
    const pf = planFeatures.find(
      item => item.plan_id === planId && item.feature_key === featureKey
    );
    return pf?.enabled || false;
  };

  const totalStats = {
    totalAcademies: academies.length,
    activeAcademies: academies.filter(a => a.status === 'active').length,
    totalPlans: plans.length,
    totalStudents: academyStats.reduce((sum, a) => sum + a.total_students, 0),
    totalRevenue: academyStats.reduce((sum, a) => sum + a.total_revenue, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading platform data...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-800">
          <h1 className="text-xl font-bold text-white">{BRANDING.SYSTEM_NAME}</h1>
          <p className="text-sm text-blue-100">Platform Admin</p>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeView === 'dashboard'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveView('academies')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeView === 'academies'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span>Academies</span>
          </button>

          <button
            onClick={() => setActiveView('plans')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeView === 'plans'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span>Subscription Plans</span>
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeView === 'settings'
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            <span>Software Settings</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {activeView === 'dashboard' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Platform Dashboard</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Building2 className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold">{totalStats.totalAcademies}</div>
                  <div className="text-blue-100 mt-1">Total Academies</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold">{totalStats.activeAcademies}</div>
                  <div className="text-green-100 mt-1">Active Academies</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold">{totalStats.totalStudents}</div>
                  <div className="text-purple-100 mt-1">Total Students</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold">{totalStats.totalPlans}</div>
                  <div className="text-orange-100 mt-1">Subscription Plans</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-8 h-8 opacity-80" />
                  </div>
                  <div className="text-3xl font-bold">{totalStats.totalRevenue.toFixed(0)}</div>
                  <div className="text-emerald-100 mt-1">Total Revenue (AED)</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Academy Statistics</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Academy
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Students
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Branches
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Users
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Revenue (AED)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {academyStats.map((stat) => (
                        <tr key={stat.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{stat.name}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {stat.total_students}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              {stat.total_branches}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                              {stat.total_users}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-semibold text-gray-900">{stat.total_revenue.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Academies</h3>
                  <div className="space-y-3">
                    {academies.slice(0, 5).map(academy => (
                      <div key={academy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{academy.name}</div>
                          <div className="text-sm text-gray-600">{academy.domain}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          academy.subscription_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {academy.subscription_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Subscription Plans</h3>
                  <div className="space-y-3">
                    {plans.map(plan => {
                      const academyCount = academies.filter(a => a.plan_id === plan.id).length;
                      return (
                        <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{plan.name}</div>
                            <div className="text-sm text-gray-600">${plan.price_monthly}/month</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">{academyCount}</div>
                            <div className="text-xs text-gray-600">academies</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'academies' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Academies</h1>
                <button
                  onClick={() => setShowAcademyForm(!showAcademyForm)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Add Academy
                </button>
              </div>

              {showAcademyForm && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">New Academy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Academy Name"
                      value={newAcademy.name}
                      onChange={e => setNewAcademy({ ...newAcademy, name: e.target.value })}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Domain (e.g., academy1)"
                      value={newAcademy.domain}
                      onChange={e => setNewAcademy({ ...newAcademy, domain: e.target.value })}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={newAcademy.plan_id}
                      onChange={e => setNewAcademy({ ...newAcademy, plan_id: e.target.value })}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Plan</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={createAcademy}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Create
                    </button>
                    <button
                      onClick={() => setShowAcademyForm(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 flex items-center gap-2 font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {academies.map(academy => (
                  <div key={academy.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition">
                    {editingAcademy?.id === academy.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input
                            type="text"
                            value={editingAcademy.name}
                            onChange={e => setEditingAcademy({ ...editingAcademy, name: e.target.value })}
                            className="border border-gray-300 rounded-lg px-4 py-2"
                          />
                          <input
                            type="text"
                            value={editingAcademy.domain}
                            onChange={e => setEditingAcademy({ ...editingAcademy, domain: e.target.value })}
                            className="border border-gray-300 rounded-lg px-4 py-2"
                          />
                          <select
                            value={editingAcademy.plan_id}
                            onChange={e => setEditingAcademy({ ...editingAcademy, plan_id: e.target.value })}
                            className="border border-gray-300 rounded-lg px-4 py-2"
                          >
                            {plans.map(plan => (
                              <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <select
                            value={editingAcademy.status}
                            onChange={e => setEditingAcademy({ ...editingAcademy, status: e.target.value })}
                            className="border border-gray-300 rounded-lg px-4 py-2"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                          <select
                            value={editingAcademy.subscription_status}
                            onChange={e => setEditingAcademy({ ...editingAcademy, subscription_status: e.target.value })}
                            className="border border-gray-300 rounded-lg px-4 py-2"
                          >
                            <option value="trial">Trial</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateAcademy(editingAcademy)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                          >
                            <Save className="w-4 h-4 inline mr-2" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAcademy(null)}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xl text-gray-900">{academy.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{academy.domain}</div>
                          <div className="flex gap-2 mt-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              academy.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {academy.status}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              academy.subscription_status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {academy.subscription_status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingAcademy(academy)}
                            className="text-blue-600 hover:text-blue-800 p-3 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteAcademy(academy.id)}
                            className="text-red-600 hover:text-red-800 p-3 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'plans' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
                <button
                  onClick={() => setShowPlanForm(!showPlanForm)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  Add Plan
                </button>
              </div>

              {showPlanForm && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">New Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Plan Name"
                      value={newPlan.name}
                      onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                      className="border border-gray-300 rounded-lg px-4 py-2"
                    />
                    <input
                      type="number"
                      placeholder="Price (monthly)"
                      value={newPlan.price_monthly}
                      onChange={e => setNewPlan({ ...newPlan, price_monthly: parseFloat(e.target.value) })}
                      className="border border-gray-300 rounded-lg px-4 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newPlan.description}
                      onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                      className="border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                      <input
                        type="number"
                        value={newPlan.max_students}
                        onChange={e => setNewPlan({ ...newPlan, max_students: parseInt(e.target.value) })}
                        className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Branches</label>
                      <input
                        type="number"
                        value={newPlan.max_branches}
                        onChange={e => setNewPlan({ ...newPlan, max_branches: parseInt(e.target.value) })}
                        className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Coaches</label>
                      <input
                        type="number"
                        value={newPlan.max_coaches}
                        onChange={e => setNewPlan({ ...newPlan, max_coaches: parseInt(e.target.value) })}
                        className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Managers</label>
                      <input
                        type="number"
                        value={newPlan.max_branch_managers}
                        onChange={e => setNewPlan({ ...newPlan, max_branch_managers: parseInt(e.target.value) })}
                        className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={createPlan}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Create
                    </button>
                    <button
                      onClick={() => setShowPlanForm(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 flex items-center gap-2 font-medium"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {plans.map(plan => (
                  <div key={plan.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition">
                    {editingPlan?.id === plan.id ? (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={editingPlan.name}
                          onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                          className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                        />
                        <input
                          type="number"
                          value={editingPlan.price_monthly}
                          onChange={e => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) })}
                          className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                        />
                        <input
                          type="text"
                          value={editingPlan.description}
                          onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                          className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Max Students</label>
                            <input
                              type="number"
                              value={editingPlan.max_students || 0}
                              onChange={e => setEditingPlan({ ...editingPlan, max_students: parseInt(e.target.value) })}
                              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Max Branches</label>
                            <input
                              type="number"
                              value={editingPlan.max_branches || 0}
                              onChange={e => setEditingPlan({ ...editingPlan, max_branches: parseInt(e.target.value) })}
                              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Max Coaches</label>
                            <input
                              type="number"
                              value={editingPlan.max_coaches || 0}
                              onChange={e => setEditingPlan({ ...editingPlan, max_coaches: parseInt(e.target.value) })}
                              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Max Managers</label>
                            <input
                              type="number"
                              value={editingPlan.max_branch_managers || 0}
                              onChange={e => setEditingPlan({ ...editingPlan, max_branch_managers: parseInt(e.target.value) })}
                              className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updatePlan(editingPlan)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex-1"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPlan(null)}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 flex-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6">
                          <h3 className="text-2xl font-bold mb-2 text-gray-900">{plan.name}</h3>
                          <div className="text-3xl font-bold text-blue-600 mb-2">
                            ${plan.price_monthly}
                            <span className="text-sm text-gray-600 font-normal">/month</span>
                          </div>
                          <p className="text-gray-600 text-sm">{plan.description}</p>
                        </div>
                        <div className="border-t pt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Students:</span>
                            <span className="font-semibold text-gray-900">{plan.max_students || 'Unlimited'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Branches:</span>
                            <span className="font-semibold text-gray-900">{plan.max_branches || 'Unlimited'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Coaches:</span>
                            <span className="font-semibold text-gray-900">{plan.max_coaches || 'Unlimited'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Managers:</span>
                            <span className="font-semibold text-gray-900">{plan.max_branch_managers || 'Unlimited'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-6 pt-4 border-t">
                          <button
                            onClick={() => setEditingPlan(plan)}
                            className="flex-1 text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition flex items-center justify-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => deletePlan(plan.id)}
                            className="flex-1 text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Plan-Feature Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Feature</th>
                        {plans.map(plan => (
                          <th key={plan.id} className="border border-gray-200 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map(feature => (
                        <tr key={feature.key} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-3">
                            <div className="font-medium text-gray-900">{feature.label}</div>
                            <div className="text-sm text-gray-500">{feature.category}</div>
                          </td>
                          {plans.map(plan => (
                            <td key={plan.id} className="border border-gray-200 px-4 py-3 text-center">
                              <button
                                onClick={() => togglePlanFeature(plan.id, feature.key)}
                                className={`p-2 rounded transition ${
                                  isPlanFeatureEnabled(plan.id, feature.key)
                                    ? 'text-green-600 hover:bg-green-50'
                                    : 'text-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {isPlanFeatureEnabled(plan.id, feature.key) ? (
                                  <CheckCircle2 className="w-6 h-6" />
                                ) : (
                                  <XCircle className="w-6 h-6" />
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-6">Software Settings</h1>

              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Feature Management</h2>
                  <button
                    onClick={() => setShowFeatureForm(!showFeatureForm)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-md"
                  >
                    <Plus className="w-5 h-5" />
                    Add Feature
                  </button>
                </div>

                {showFeatureForm && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4">New Feature</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Feature Key (e.g., new_feature)"
                        value={newFeature.key}
                        onChange={e => setNewFeature({ ...newFeature, key: e.target.value })}
                        className="border border-gray-300 rounded-lg px-4 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Feature Label"
                        value={newFeature.label}
                        onChange={e => setNewFeature({ ...newFeature, label: e.target.value })}
                        className="border border-gray-300 rounded-lg px-4 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Category"
                        value={newFeature.category}
                        onChange={e => setNewFeature({ ...newFeature, category: e.target.value })}
                        className="border border-gray-300 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={createFeature}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
                      >
                        <Save className="w-4 h-4" />
                        Create
                      </button>
                      <button
                        onClick={() => setShowFeatureForm(false)}
                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 flex items-center gap-2 font-medium"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {features.map(feature => (
                    <div key={feature.key} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                      {editingFeature?.key === feature.key ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              value={editingFeature.label}
                              onChange={e => setEditingFeature({ ...editingFeature, label: e.target.value })}
                              className="border border-gray-300 rounded-lg px-4 py-2"
                            />
                            <input
                              type="text"
                              value={editingFeature.category}
                              onChange={e => setEditingFeature({ ...editingFeature, category: e.target.value })}
                              className="border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateFeature(editingFeature)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                            >
                              <Save className="w-4 h-4 inline mr-2" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingFeature(null)}
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-lg text-gray-900">{feature.label}</div>
                            <div className="text-sm text-gray-600">Key: {feature.key}</div>
                            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              {feature.category}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingFeature(feature)}
                              className="text-blue-600 hover:text-blue-800 p-3 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteFeature(feature.key)}
                              className="text-red-600 hover:text-red-800 p-3 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
