import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Package, Settings, TrendingUp, Users, DollarSign, Check, X, Plus, Trash2, CreditCard as Edit3, Save, ChevronRight, LogOut, RefreshCw, Shield, AlertCircle, ToggleLeft, ToggleRight, Calendar, Globe, Layers, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Academy {
  id: string;
  name: string;
  domain: string;
  status: string;
  plan_id: string | null;
  subscription_status: string;
  expires_at: string | null;
  created_at: string;
  plan?: { name: string; price_monthly: number };
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  created_at: string;
}

interface Feature {
  key: string;
  label: string;
  category: string;
}

interface PlanFeature {
  plan_id: string;
  feature_key: string;
  enabled: boolean;
}

interface AcademyFeatureOverride {
  academy_id: string;
  feature_key: string;
  enabled: boolean;
}

interface Subscription {
  id: string;
  academy_id: string;
  plan_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
}

export default function PlatformOwnerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [academies, setAcademies] = useState<Academy[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [academyOverrides, setAcademyOverrides] = useState<AcademyFeatureOverride[]>([]);

  const [showNewAcademyForm, setShowNewAcademyForm] = useState(false);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [editingAcademy, setEditingAcademy] = useState<Academy | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [selectedAcademyForFeatures, setSelectedAcademyForFeatures] = useState<Academy | null>(null);

  const [newAcademy, setNewAcademy] = useState({ name: '', domain: '', plan_id: '', status: 'active', subscription_status: 'trial', expires_at: '' });
  const [newPlan, setNewPlan] = useState({ name: '', description: '', price_monthly: '' });
  const [newFeature, setNewFeature] = useState({ key: '', label: '', category: 'core' });
  const [showNewFeatureForm, setShowNewFeatureForm] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [academiesRes, plansRes, featuresRes, planFeaturesRes, subsRes] = await Promise.all([
        supabase.from('academies').select('*, plan:plans(name, price_monthly)').order('created_at', { ascending: false }),
        supabase.from('plans').select('*').order('price_monthly'),
        supabase.from('features').select('*').order('category, label'),
        supabase.from('plan_features').select('*'),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      ]);

      if (academiesRes.data) setAcademies(academiesRes.data as Academy[]);
      if (plansRes.data) setPlans(plansRes.data);
      if (featuresRes.data) setFeatures(featuresRes.data);
      if (planFeaturesRes.data) setPlanFeatures(planFeaturesRes.data);
      if (subsRes.data) setSubscriptions(subsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadAcademyFeatureOverrides = async (academyId: string) => {
    const { data } = await supabase
      .from('academy_feature_overrides')
      .select('*')
      .eq('academy_id', academyId);
    if (data) setAcademyOverrides(data);
  };

  const stats = {
    totalAcademies: academies.length,
    activeAcademies: academies.filter(a => a.status === 'active').length,
    suspendedAcademies: academies.filter(a => a.status === 'suspended').length,
    trialAcademies: academies.filter(a => a.subscription_status === 'trial').length,
    activeSubscriptions: academies.filter(a => a.subscription_status === 'active').length,
    expiredSubscriptions: academies.filter(a => a.subscription_status === 'expired').length,
    mrr: academies
      .filter(a => a.subscription_status === 'active' && a.plan?.price_monthly)
      .reduce((sum, a) => sum + (a.plan?.price_monthly || 0), 0),
    totalPlans: plans.length,
    totalFeatures: features.length,
  };

  const handleCreateAcademy = async () => {
    if (!newAcademy.name || !newAcademy.domain) return;
    const { error } = await supabase.from('academies').insert({
      name: newAcademy.name,
      domain: newAcademy.domain,
      plan_id: newAcademy.plan_id || null,
      status: newAcademy.status,
      subscription_status: newAcademy.subscription_status,
      expires_at: newAcademy.expires_at || null,
    });
    if (!error) {
      setNewAcademy({ name: '', domain: '', plan_id: '', status: 'active', subscription_status: 'trial', expires_at: '' });
      setShowNewAcademyForm(false);
      loadAllData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateAcademy = async () => {
    if (!editingAcademy) return;
    const { error } = await supabase.from('academies').update({
      name: editingAcademy.name,
      domain: editingAcademy.domain,
      plan_id: editingAcademy.plan_id || null,
      status: editingAcademy.status,
      subscription_status: editingAcademy.subscription_status,
      expires_at: editingAcademy.expires_at,
    }).eq('id', editingAcademy.id);
    if (!error) {
      setEditingAcademy(null);
      loadAllData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteAcademy = async (id: string) => {
    if (!confirm('Delete this academy? This cannot be undone.')) return;
    const { error } = await supabase.from('academies').delete().eq('id', id);
    if (!error) loadAllData();
    else alert('Error: ' + error.message);
  };

  const handleToggleAcademyStatus = async (academy: Academy) => {
    const newStatus = academy.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('academies').update({ status: newStatus }).eq('id', academy.id);
    if (!error) loadAllData();
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.price_monthly) return;
    const { error } = await supabase.from('plans').insert({
      name: newPlan.name,
      description: newPlan.description || null,
      price_monthly: parseFloat(newPlan.price_monthly),
    });
    if (!error) {
      setNewPlan({ name: '', description: '', price_monthly: '' });
      setShowNewPlanForm(false);
      loadAllData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    const { error } = await supabase.from('plans').update({
      name: editingPlan.name,
      description: editingPlan.description,
      price_monthly: editingPlan.price_monthly,
    }).eq('id', editingPlan.id);
    if (!error) {
      setEditingPlan(null);
      loadAllData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Delete this plan? Academies on this plan will lose their plan assignment.')) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (!error) loadAllData();
    else alert('Error: ' + error.message);
  };

  const handleTogglePlanFeature = async (planId: string, featureKey: string, currentlyEnabled: boolean) => {
    const exists = planFeatures.find(pf => pf.plan_id === planId && pf.feature_key === featureKey);
    if (exists) {
      const { error } = await supabase.from('plan_features').update({ enabled: !currentlyEnabled })
        .eq('plan_id', planId).eq('feature_key', featureKey);
      if (!error) {
        setPlanFeatures(prev => prev.map(pf =>
          pf.plan_id === planId && pf.feature_key === featureKey ? { ...pf, enabled: !currentlyEnabled } : pf
        ));
      }
    } else {
      const { error } = await supabase.from('plan_features').insert({ plan_id: planId, feature_key: featureKey, enabled: true });
      if (!error) {
        setPlanFeatures(prev => [...prev, { plan_id: planId, feature_key: featureKey, enabled: true }]);
      }
    }
  };

  const handleCreateFeature = async () => {
    if (!newFeature.key || !newFeature.label) return;
    const { error } = await supabase.from('features').insert({
      key: newFeature.key,
      label: newFeature.label,
      category: newFeature.category,
    });
    if (!error) {
      setNewFeature({ key: '', label: '', category: 'core' });
      setShowNewFeatureForm(false);
      loadAllData();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteFeature = async (key: string) => {
    if (!confirm('Delete this feature?')) return;
    const { error } = await supabase.from('features').delete().eq('key', key);
    if (!error) loadAllData();
    else alert('Error: ' + error.message);
  };

  const handleToggleAcademyFeatureOverride = async (academyId: string, featureKey: string, currentEnabled: boolean | undefined) => {
    if (currentEnabled === undefined) {
      const { error } = await supabase.from('academy_feature_overrides').insert({
        academy_id: academyId, feature_key: featureKey, enabled: true
      });
      if (!error) loadAcademyFeatureOverrides(academyId);
    } else if (currentEnabled) {
      const { error } = await supabase.from('academy_feature_overrides').update({ enabled: false })
        .eq('academy_id', academyId).eq('feature_key', featureKey);
      if (!error) loadAcademyFeatureOverrides(academyId);
    } else {
      const { error } = await supabase.from('academy_feature_overrides').delete()
        .eq('academy_id', academyId).eq('feature_key', featureKey);
      if (!error) loadAcademyFeatureOverrides(academyId);
    }
  };

  const handleExtendSubscription = async (academy: Academy, months: number) => {
    const newExpiry = new Date(academy.expires_at ? new Date(academy.expires_at) : new Date());
    newExpiry.setMonth(newExpiry.getMonth() + months);

    const { error } = await supabase.from('academies').update({
      subscription_status: 'active',
      expires_at: newExpiry.toISOString(),
    }).eq('id', academy.id);

    if (!error) {
      await supabase.from('subscriptions').insert({
        academy_id: academy.id,
        plan_id: academy.plan_id,
        starts_at: new Date().toISOString(),
        ends_at: newExpiry.toISOString(),
        status: 'active',
      });
      loadAllData();
      alert(`Subscription extended by ${months} month(s) until ${newExpiry.toLocaleDateString()}`);
    } else {
      alert('Error: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getStatusBadge = (status: string, type: 'academy' | 'subscription' = 'subscription') => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const featuresByCategory = features.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, Feature[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Platform Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">DOJO CLOUD</h1>
                <p className="text-xs text-gray-500">Platform Administration</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAllData}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                Academy Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="flex gap-6">
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-2 space-y-1">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                { id: 'academies', icon: Building2, label: 'Academies' },
                { id: 'plans', icon: Package, label: 'Plans' },
                { id: 'features', icon: Layers, label: 'Features' },
                { id: 'subscriptions', icon: Calendar, label: 'Subscriptions' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Stats</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Academies</span>
                  <span className="font-semibold text-gray-900">{stats.totalAcademies}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active</span>
                  <span className="font-semibold text-green-600">{stats.activeSubscriptions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Trial</span>
                  <span className="font-semibold text-blue-600">{stats.trialAcademies}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">MRR</span>
                  <span className="font-semibold text-gray-900">${stats.mrr.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Academies', value: stats.totalAcademies, icon: Building2, color: 'blue' },
                    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: Check, color: 'green' },
                    { label: 'Trial Academies', value: stats.trialAcademies, icon: Star, color: 'amber' },
                    { label: 'Monthly Revenue', value: `$${stats.mrr.toFixed(0)}`, icon: DollarSign, color: 'emerald' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{label}</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-100`}>
                          <Icon className={`w-5 h-5 text-${color}-600`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">ARR (Annual)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">${(stats.mrr * 12).toFixed(0)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">Suspended</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.suspendedAcademies}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">Expired Subs</p>
                    <p className="text-2xl font-bold text-gray-500 mt-1">{stats.expiredSubscriptions}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Recent Academies</h3>
                    <button onClick={() => setActiveTab('academies')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Academy</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {academies.slice(0, 8).map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{a.plan?.name || 'No Plan'}</td>
                            <td className="px-6 py-3">{getStatusBadge(a.status, 'academy')}</td>
                            <td className="px-6 py-3">{getStatusBadge(a.subscription_status)}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">
                              {a.expires_at ? new Date(a.expires_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                        {academies.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No academies yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'academies' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Academies Management</h2>
                  <button
                    onClick={() => setShowNewAcademyForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
                  >
                    <Plus className="w-4 h-4" /> Add Academy
                  </button>
                </div>

                {showNewAcademyForm && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">New Academy</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input type="text" value={newAcademy.name} onChange={e => setNewAcademy(p => ({ ...p, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Academy name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
                        <input type="text" value={newAcademy.domain} onChange={e => setNewAcademy(p => ({ ...p, domain: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. my-academy" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                        <select value={newAcademy.plan_id} onChange={e => setNewAcademy(p => ({ ...p, plan_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">No Plan</option>
                          {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
                        <select value={newAcademy.subscription_status} onChange={e => setNewAcademy(p => ({ ...p, subscription_status: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                        <input type="date" value={newAcademy.expires_at} onChange={e => setNewAcademy(p => ({ ...p, expires_at: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleCreateAcademy} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                        Create Academy
                      </button>
                      <button onClick={() => setShowNewAcademyForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Academy</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {academies.map((academy) => (
                        editingAcademy?.id === academy.id ? (
                          <tr key={academy.id} className="bg-blue-50">
                            <td className="px-6 py-3">
                              <input type="text" value={editingAcademy.name} onChange={e => setEditingAcademy(p => p ? { ...p, name: e.target.value } : p)}
                                className="w-full px-2 py-1 border border-blue-300 rounded text-sm" />
                              <input type="text" value={editingAcademy.domain} onChange={e => setEditingAcademy(p => p ? { ...p, domain: e.target.value } : p)}
                                className="w-full px-2 py-1 border border-blue-300 rounded text-sm mt-1" />
                            </td>
                            <td className="px-6 py-3">
                              <select value={editingAcademy.plan_id || ''} onChange={e => setEditingAcademy(p => p ? { ...p, plan_id: e.target.value } : p)}
                                className="w-full px-2 py-1 border border-blue-300 rounded text-sm">
                                <option value="">No Plan</option>
                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                            <td className="px-6 py-3">
                              <select value={editingAcademy.status} onChange={e => setEditingAcademy(p => p ? { ...p, status: e.target.value } : p)}
                                className="w-full px-2 py-1 border border-blue-300 rounded text-sm">
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            </td>
                            <td className="px-6 py-3">
                              <select value={editingAcademy.subscription_status} onChange={e => setEditingAcademy(p => p ? { ...p, subscription_status: e.target.value } : p)}
                                className="w-full px-2 py-1 border border-blue-300 rounded text-sm">
                                <option value="trial">Trial</option>
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            </td>
                            <td className="px-6 py-3">
                              <input type="date" value={editingAcademy.expires_at ? editingAcademy.expires_at.split('T')[0] : ''} onChange={e => setEditingAcademy(p => p ? { ...p, expires_at: e.target.value } : p)}
                                className="w-full px-2 py-1 border border-blue-300 rounded text-sm" />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex gap-2">
                                <button onClick={handleUpdateAcademy} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><Save className="w-4 h-4" /></button>
                                <button onClick={() => setEditingAcademy(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><X className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={academy.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">
                              <div className="font-medium text-gray-900 text-sm">{academy.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Globe className="w-3 h-3" />{academy.domain}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">{academy.plan?.name || <span className="text-gray-400 italic">No Plan</span>}</td>
                            <td className="px-6 py-3">{getStatusBadge(academy.status, 'academy')}</td>
                            <td className="px-6 py-3">{getStatusBadge(academy.subscription_status)}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">
                              {academy.expires_at ? new Date(academy.expires_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button onClick={() => setEditingAcademy(academy)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Edit">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleToggleAcademyStatus(academy)}
                                  className={`p-1.5 rounded ${academy.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                  title={academy.status === 'active' ? 'Suspend' : 'Activate'}>
                                  {academy.status === 'active' ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => { setSelectedAcademyForFeatures(academy); loadAcademyFeatureOverrides(academy.id); setActiveTab('academy-features'); }}
                                  className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100" title="Feature Overrides">
                                  <Layers className="w-3.5 h-3.5" />
                                </button>
                                <div className="relative group">
                                  <button className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center gap-1 text-xs" title="Extend Subscription">
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden group-hover:block min-w-[140px]">
                                    {[1, 3, 6, 12].map(months => (
                                      <button key={months} onClick={() => handleExtendSubscription(academy, months)}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                        +{months} month{months > 1 ? 's' : ''}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteAcademy(academy.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                      {academies.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No academies yet. Click "Add Academy" to create one.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'academy-features' && selectedAcademyForFeatures && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveTab('academies')} className="p-2 rounded-lg hover:bg-gray-100">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Feature Overrides</h2>
                    <p className="text-sm text-gray-500">{selectedAcademyForFeatures.name}</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  Override features for this specific academy. Green = enabled, Red = disabled. Default = inherits from plan.
                </div>

                {Object.entries(featuresByCategory).map(([category, catFeatures]) => (
                  <div key={category} className="bg-white rounded-xl border border-gray-200">
                    <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                      <h3 className="font-semibold text-gray-700 capitalize">{category}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {catFeatures.map(feature => {
                        const override = academyOverrides.find(o => o.feature_key === feature.key);
                        const planFeature = selectedAcademyForFeatures.plan_id
                          ? planFeatures.find(pf => pf.plan_id === selectedAcademyForFeatures.plan_id && pf.feature_key === feature.key)
                          : null;
                        return (
                          <div key={feature.key} className="px-6 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{feature.label}</p>
                              <p className="text-xs text-gray-500">Plan default: {planFeature?.enabled ? 'Enabled' : 'Disabled/Not in plan'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {override !== undefined && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${override.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  Override: {override.enabled ? 'ON' : 'OFF'}
                                </span>
                              )}
                              <button
                                onClick={() => handleToggleAcademyFeatureOverride(selectedAcademyForFeatures.id, feature.key, override?.enabled)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                  override === undefined
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : override.enabled
                                    ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                    : 'bg-red-100 text-red-700 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                              >
                                {override === undefined ? 'Add Override' : override.enabled ? 'Force Enabled (click to disable)' : 'Force Disabled (click to remove)'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
                  <button onClick={() => setShowNewPlanForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition">
                    <Plus className="w-4 h-4" /> Add Plan
                  </button>
                </div>

                {showNewPlanForm && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">New Plan</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input type="text" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Plan name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price *</label>
                        <input type="number" value={newPlan.price_monthly} onChange={e => setNewPlan(p => ({ ...p, price_monthly: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input type="text" value={newPlan.description} onChange={e => setNewPlan(p => ({ ...p, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Plan description" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleCreatePlan} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Create Plan</button>
                      <button onClick={() => setShowNewPlanForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {plans.map(plan => (
                    editingPlan?.id === plan.id ? (
                      <div key={plan.id} className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" value={editingPlan.name} onChange={e => setEditingPlan(p => p ? { ...p, name: e.target.value } : p)}
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price/Month</label>
                            <input type="number" value={editingPlan.price_monthly} onChange={e => setEditingPlan(p => p ? { ...p, price_monthly: parseFloat(e.target.value) } : p)}
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input type="text" value={editingPlan.description || ''} onChange={e => setEditingPlan(p => p ? { ...p, description: e.target.value } : p)}
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleUpdatePlan} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save
                          </button>
                          <button onClick={() => setEditingPlan(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                            {plan.description && <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">${plan.price_monthly}</p>
                              <p className="text-xs text-gray-500">/month</p>
                            </div>
                            <button onClick={() => setEditingPlan(plan)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeletePlan(plan.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Features in this plan</p>
                          <div className="grid grid-cols-3 gap-2">
                            {features.map(feature => {
                              const pf = planFeatures.find(f => f.plan_id === plan.id && f.feature_key === feature.key);
                              const enabled = pf?.enabled ?? false;
                              return (
                                <button
                                  key={feature.key}
                                  onClick={() => handleTogglePlanFeature(plan.id, feature.key, enabled)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition border ${
                                    enabled
                                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  {enabled ? <Check className="w-3 h-3 flex-shrink-0" /> : <X className="w-3 h-3 flex-shrink-0" />}
                                  <span className="truncate">{feature.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Click any feature to toggle it for this plan</p>
                        </div>
                      </div>
                    )
                  ))}
                  {plans.length === 0 && (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">No plans yet.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Features Management</h2>
                  <button onClick={() => setShowNewFeatureForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition">
                    <Plus className="w-4 h-4" /> Add Feature
                  </button>
                </div>

                {showNewFeatureForm && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">New Feature</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Key (unique) *</label>
                        <input type="text" value={newFeature.key} onChange={e => setNewFeature(p => ({ ...p, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent\" placeholder="e.g. reports" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                        <input type="text" value={newFeature.label} onChange={e => setNewFeature(p => ({ ...p, label: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. Reports" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select value={newFeature.category} onChange={e => setNewFeature(p => ({ ...p, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="core">Core</option>
                          <option value="management">Management</option>
                          <option value="finance">Finance</option>
                          <option value="reports">Reports</option>
                          <option value="features">Features</option>
                          <option value="inventory">Inventory</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleCreateFeature} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Add Feature</button>
                      <button onClick={() => setShowNewFeatureForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
                    </div>
                  </div>
                )}

                {Object.entries(featuresByCategory).map(([category, catFeatures]) => (
                  <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-700 capitalize">{category}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {catFeatures.map(feature => (
                        <div key={feature.key} className="px-6 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{feature.label}</p>
                            <p className="text-xs text-gray-500 font-mono">{feature.key}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {plans.filter(p => planFeatures.find(pf => pf.plan_id === p.id && pf.feature_key === feature.key && pf.enabled)).length} / {plans.length} plans
                            </span>
                            <button onClick={() => handleDeleteFeature(feature.key)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {features.length === 0 && (
                  <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">No features yet.</div>
                )}
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Subscription History</h2>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Academy</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Starts</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ends</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subscriptions.map(sub => {
                        const academy = academies.find(a => a.id === sub.academy_id);
                        const plan = plans.find(p => p.id === sub.plan_id);
                        return (
                          <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">{academy?.name || sub.academy_id}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{plan?.name || '—'}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{new Date(sub.starts_at).toLocaleDateString()}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{new Date(sub.ends_at).toLocaleDateString()}</td>
                            <td className="px-6 py-3">{getStatusBadge(sub.status)}</td>
                          </tr>
                        );
                      })}
                      {subscriptions.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No subscription records yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
