import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Package, Settings, TrendingUp, Users, DollarSign, Check, X, Plus, Trash2, Save, ChevronRight, LogOut, RefreshCw, Shield, AlertCircle, ToggleLeft, ToggleRight, Calendar, Globe, Layers, Star, CreditCard as Edit2, Eye, EyeOff, Clock, Activity, CreditCard, Bell, Lock, Database, BarChart2, ArrowUpRight, ArrowDownRight, Zap, Award, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PlanLimits {
  max_students: number;
  max_branches: number;
  price_yearly: number;
  is_trial: boolean;
  trial_days: number;
  is_popular: boolean;
  display_order: number;
  is_visible: boolean;
  currency: string;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  created_at: string;
  limits?: PlanLimits;
}

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

const LIMITS_KEY = 'dojo_plan_limits';

function loadPlanLimits(): Record<string, PlanLimits> {
  try {
    return JSON.parse(localStorage.getItem(LIMITS_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePlanLimits(limits: Record<string, PlanLimits>) {
  localStorage.setItem(LIMITS_KEY, JSON.stringify(limits));
}

const defaultLimits = (): PlanLimits => ({
  max_students: 0,
  max_branches: 0,
  price_yearly: 0,
  is_trial: false,
  trial_days: 14,
  is_popular: false,
  display_order: 0,
  is_visible: true,
  currency: 'USD',
});

export default function PlatformOwnerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [academies, setAcademies] = useState<Academy[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [academyOverrides, setAcademyOverrides] = useState<AcademyFeatureOverride[]>([]);
  const [planLimitsMap, setPlanLimitsMap] = useState<Record<string, PlanLimits>>(loadPlanLimits());

  const [showNewAcademyForm, setShowNewAcademyForm] = useState(false);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [showNewFeatureForm, setShowNewFeatureForm] = useState(false);
  const [editingAcademy, setEditingAcademy] = useState<Academy | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingPlanLimits, setEditingPlanLimits] = useState<PlanLimits | null>(null);
  const [selectedAcademyForFeatures, setSelectedAcademyForFeatures] = useState<Academy | null>(null);
  const [searchAcademies, setSearchAcademies] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [newAcademy, setNewAcademy] = useState({
    name: '', domain: '', plan_id: '', status: 'active', subscription_status: 'trial', expires_at: '', trial_days: '14'
  });
  const [newPlan, setNewPlan] = useState({ name: '', description: '', price_monthly: '' });
  const [newFeature, setNewFeature] = useState({ key: '', label: '', category: 'core' });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const loadAllData = useCallback(async () => {
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
      if (plansRes.data) {
        const storedLimits = loadPlanLimits();
        setPlans(plansRes.data.map(p => ({ ...p, limits: storedLimits[p.id] || defaultLimits() })));
      }
      if (featuresRes.data) setFeatures(featuresRes.data);
      if (planFeaturesRes.data) setPlanFeatures(planFeaturesRes.data);
      if (subsRes.data) setSubscriptions(subsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const loadAcademyFeatureOverrides = async (academyId: string) => {
    const { data } = await supabase.from('academy_feature_overrides').select('*').eq('academy_id', academyId);
    if (data) setAcademyOverrides(data);
  };

  const stats = {
    totalAcademies: academies.length,
    activeAcademies: academies.filter(a => a.status === 'active').length,
    suspendedAcademies: academies.filter(a => a.status === 'suspended').length,
    trialAcademies: academies.filter(a => a.subscription_status === 'trial').length,
    activeSubscriptions: academies.filter(a => a.subscription_status === 'active').length,
    expiredSubscriptions: academies.filter(a => a.subscription_status === 'expired').length,
    mrr: academies.filter(a => a.subscription_status === 'active' && a.plan?.price_monthly).reduce((sum, a) => sum + (a.plan?.price_monthly || 0), 0),
    totalPlans: plans.length,
    totalFeatures: features.length,
  };

  const filteredAcademies = academies.filter(a => {
    const matchSearch = !searchAcademies || a.name.toLowerCase().includes(searchAcademies.toLowerCase()) || a.domain.toLowerCase().includes(searchAcademies.toLowerCase());
    const matchFilter = filterStatus === 'all' || a.subscription_status === filterStatus || a.status === filterStatus;
    return matchSearch && matchFilter;
  });

  const handleCreateAcademy = async () => {
    if (!newAcademy.name || !newAcademy.domain) return;
    let expiresAt = newAcademy.expires_at || null;
    if (!expiresAt && newAcademy.subscription_status === 'trial') {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(newAcademy.trial_days || '14'));
      expiresAt = d.toISOString();
    }
    const { error } = await supabase.from('academies').insert({
      name: newAcademy.name, domain: newAcademy.domain,
      plan_id: newAcademy.plan_id || null, status: newAcademy.status,
      subscription_status: newAcademy.subscription_status, expires_at: expiresAt,
    });
    if (!error) {
      setNewAcademy({ name: '', domain: '', plan_id: '', status: 'active', subscription_status: 'trial', expires_at: '', trial_days: '14' });
      setShowNewAcademyForm(false);
      loadAllData();
      showSuccess('Academy created successfully');
    } else setError('Error: ' + error.message);
  };

  const handleUpdateAcademy = async () => {
    if (!editingAcademy) return;
    const { error } = await supabase.from('academies').update({
      name: editingAcademy.name, domain: editingAcademy.domain,
      plan_id: editingAcademy.plan_id || null, status: editingAcademy.status,
      subscription_status: editingAcademy.subscription_status, expires_at: editingAcademy.expires_at,
    }).eq('id', editingAcademy.id);
    if (!error) { setEditingAcademy(null); loadAllData(); showSuccess('Academy updated'); }
    else setError('Error: ' + error.message);
  };

  const handleDeleteAcademy = async (id: string) => {
    if (!confirm('Delete this academy? This cannot be undone.')) return;
    const { error } = await supabase.from('academies').delete().eq('id', id);
    if (!error) { loadAllData(); showSuccess('Academy deleted'); }
    else setError('Error: ' + error.message);
  };

  const handleToggleAcademyStatus = async (academy: Academy) => {
    const newStatus = academy.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('academies').update({ status: newStatus }).eq('id', academy.id);
    if (!error) { loadAllData(); showSuccess(`Academy ${newStatus}`); }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.price_monthly) return;
    const { data, error } = await supabase.from('plans').insert({
      name: newPlan.name, description: newPlan.description || null,
      price_monthly: parseFloat(newPlan.price_monthly),
    }).select().single();
    if (!error && data) {
      const newLimits = { ...planLimitsMap, [data.id]: defaultLimits() };
      setPlanLimitsMap(newLimits);
      savePlanLimits(newLimits);
      setNewPlan({ name: '', description: '', price_monthly: '' });
      setShowNewPlanForm(false);
      loadAllData();
      showSuccess('Plan created');
    } else setError('Error: ' + (error?.message || 'Unknown'));
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    const { error } = await supabase.from('plans').update({
      name: editingPlan.name, description: editingPlan.description, price_monthly: editingPlan.price_monthly,
    }).eq('id', editingPlan.id);
    if (!error) {
      if (editingPlanLimits) {
        const newLimits = { ...planLimitsMap, [editingPlan.id]: editingPlanLimits };
        setPlanLimitsMap(newLimits);
        savePlanLimits(newLimits);
      }
      setEditingPlan(null);
      setEditingPlanLimits(null);
      loadAllData();
      showSuccess('Plan updated');
    } else setError('Error: ' + error.message);
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (!error) {
      const newLimits = { ...planLimitsMap };
      delete newLimits[id];
      setPlanLimitsMap(newLimits);
      savePlanLimits(newLimits);
      loadAllData();
      showSuccess('Plan deleted');
    } else setError('Error: ' + error.message);
  };

  const handleTogglePlanFeature = async (planId: string, featureKey: string, currentlyEnabled: boolean) => {
    const exists = planFeatures.find(pf => pf.plan_id === planId && pf.feature_key === featureKey);
    if (exists) {
      const { error } = await supabase.from('plan_features').update({ enabled: !currentlyEnabled }).eq('plan_id', planId).eq('feature_key', featureKey);
      if (!error) setPlanFeatures(prev => prev.map(pf => pf.plan_id === planId && pf.feature_key === featureKey ? { ...pf, enabled: !currentlyEnabled } : pf));
    } else {
      const { error } = await supabase.from('plan_features').insert({ plan_id: planId, feature_key: featureKey, enabled: true });
      if (!error) setPlanFeatures(prev => [...prev, { plan_id: planId, feature_key: featureKey, enabled: true }]);
    }
  };

  const handleCreateFeature = async () => {
    if (!newFeature.key || !newFeature.label) return;
    const { error } = await supabase.from('features').insert({ key: newFeature.key, label: newFeature.label, category: newFeature.category });
    if (!error) { setNewFeature({ key: '', label: '', category: 'core' }); setShowNewFeatureForm(false); loadAllData(); showSuccess('Feature added'); }
    else setError('Error: ' + error.message);
  };

  const handleDeleteFeature = async (key: string) => {
    if (!confirm('Delete this feature?')) return;
    const { error } = await supabase.from('features').delete().eq('key', key);
    if (!error) { loadAllData(); showSuccess('Feature deleted'); }
    else setError('Error: ' + error.message);
  };

  const handleToggleAcademyFeatureOverride = async (academyId: string, featureKey: string, currentEnabled: boolean | undefined) => {
    if (currentEnabled === undefined) {
      const { error } = await supabase.from('academy_feature_overrides').insert({ academy_id: academyId, feature_key: featureKey, enabled: true });
      if (!error) loadAcademyFeatureOverrides(academyId);
    } else if (currentEnabled) {
      const { error } = await supabase.from('academy_feature_overrides').update({ enabled: false }).eq('academy_id', academyId).eq('feature_key', featureKey);
      if (!error) loadAcademyFeatureOverrides(academyId);
    } else {
      const { error } = await supabase.from('academy_feature_overrides').delete().eq('academy_id', academyId).eq('feature_key', featureKey);
      if (!error) loadAcademyFeatureOverrides(academyId);
    }
  };

  const handleExtendSubscription = async (academy: Academy, months: number) => {
    const base = academy.expires_at ? new Date(academy.expires_at) : new Date();
    if (base < new Date()) base.setTime(new Date().getTime());
    base.setMonth(base.getMonth() + months);
    const { error } = await supabase.from('academies').update({ subscription_status: 'active', expires_at: base.toISOString() }).eq('id', academy.id);
    if (!error) {
      await supabase.from('subscriptions').insert({ academy_id: academy.id, plan_id: academy.plan_id, starts_at: new Date().toISOString(), ends_at: base.toISOString(), status: 'active' });
      loadAllData();
      showSuccess(`Subscription extended until ${base.toLocaleDateString()}`);
    } else setError('Error: ' + error.message);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      suspended: 'bg-red-100 text-red-800 border border-red-200',
      trial: 'bg-blue-100 text-blue-800 border border-blue-200',
      expired: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status.toUpperCase()}</span>;
  };

  const featuresByCategory = features.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, Feature[]>);

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    return diff;
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Loading Platform Data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">DOJO CLOUD</h1>
                <p className="text-xs text-gray-400">Platform Administration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadAllData} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <Link to="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {successMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="flex gap-6">
          <div className="w-52 flex-shrink-0 space-y-3">
            <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                { id: 'academies', icon: Building2, label: 'Academies' },
                { id: 'plans', icon: Package, label: 'Plans & Limits' },
                { id: 'features', icon: Layers, label: 'Features' },
                { id: 'subscriptions', icon: Calendar, label: 'Subscriptions' },
                { id: 'settings', icon: Settings, label: 'Platform Settings' },
              ].map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" /> {label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Stats</p>
              {[
                { label: 'Academies', val: stats.totalAcademies, color: 'text-gray-900' },
                { label: 'Active', val: stats.activeSubscriptions, color: 'text-emerald-600' },
                { label: 'Trial', val: stats.trialAcademies, color: 'text-blue-600' },
                { label: 'Suspended', val: stats.suspendedAcademies, color: 'text-red-500' },
                { label: 'MRR', val: `$${stats.mrr.toFixed(0)}`, color: 'text-gray-900' },
                { label: 'ARR', val: `$${(stats.mrr * 12).toFixed(0)}`, color: 'text-gray-900' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Platform Overview</h2>
                  <span className="text-sm text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Academies', value: stats.totalAcademies, icon: Building2, color: 'blue', change: '+2 this month' },
                    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: Check, color: 'emerald', change: `${stats.expiredSubscriptions} expired` },
                    { label: 'Trial Academies', value: stats.trialAcademies, icon: Clock, color: 'amber', change: 'Converting' },
                    { label: 'Monthly Revenue', value: `$${stats.mrr.toFixed(0)}`, icon: DollarSign, color: 'emerald', change: `$${(stats.mrr * 12).toFixed(0)} ARR` },
                  ].map(({ label, value, icon: Icon, color, change }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-50`}>
                          <Icon className={`w-5 h-5 text-${color}-600`} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-500 mt-1">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{change}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <p className="text-sm font-semibold text-gray-700">Health Score</p>
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold text-gray-900">
                        {stats.totalAcademies === 0 ? '—' : Math.round((stats.activeSubscriptions / stats.totalAcademies) * 100)}%
                      </p>
                      <span className="text-xs text-emerald-500 pb-1 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" /> Active rate</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-amber-500" />
                      <p className="text-sm font-semibold text-gray-700">Trial Conversion</p>
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold text-gray-900">{stats.trialAcademies}</p>
                      <span className="text-xs text-gray-400 pb-1">pending</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-red-500" />
                      <p className="text-sm font-semibold text-gray-700">Churn Risk</p>
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold text-red-600">{stats.expiredSubscriptions}</p>
                      <span className="text-xs text-gray-400 pb-1 flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3 text-red-400" /> expired</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Recent Academies</h3>
                    <button onClick={() => setActiveTab('academies')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                      View All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Academy', 'Plan', 'Status', 'Subscription', 'Expires', 'Days Left'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {academies.slice(0, 8).map(a => {
                        const days = getDaysRemaining(a.expires_at);
                        return (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-medium text-gray-900 text-sm">{a.name}</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1"><Globe className="w-3 h-3" />{a.domain}</div>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600">{a.plan?.name || <span className="text-gray-300 italic text-xs">No Plan</span>}</td>
                            <td className="px-5 py-3">{getStatusBadge(a.status)}</td>
                            <td className="px-5 py-3">{getStatusBadge(a.subscription_status)}</td>
                            <td className="px-5 py-3 text-sm text-gray-500">{a.expires_at ? new Date(a.expires_at).toLocaleDateString() : '—'}</td>
                            <td className="px-5 py-3">
                              {days !== null ? (
                                <span className={`text-sm font-semibold ${days < 0 ? 'text-red-500' : days < 7 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                  {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {academies.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No academies yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'academies' && (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Academies</h2>
                  <button onClick={() => setShowNewAcademyForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition shadow-sm">
                    <Plus className="w-4 h-4" /> Add Academy
                  </button>
                </div>

                <div className="flex gap-3">
                  <input type="text" placeholder="Search academies..." value={searchAcademies} onChange={e => setSearchAcademies(e.target.value)}
                    className={`flex-1 ${inputCls}`} />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`w-40 ${inputCls}`}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="trial">Trial</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {showNewAcademyForm && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> New Academy</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelCls}>Name *</label><input type="text" value={newAcademy.name} onChange={e => setNewAcademy(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Academy name" /></div>
                      <div><label className={labelCls}>Domain *</label><input type="text" value={newAcademy.domain} onChange={e => setNewAcademy(p => ({ ...p, domain: e.target.value }))} className={inputCls} placeholder="e.g. tiger-dojo" /></div>
                      <div>
                        <label className={labelCls}>Plan</label>
                        <select value={newAcademy.plan_id} onChange={e => setNewAcademy(p => ({ ...p, plan_id: e.target.value }))} className={inputCls}>
                          <option value="">No Plan</option>
                          {plans.map(p => <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Subscription Type</label>
                        <select value={newAcademy.subscription_status} onChange={e => setNewAcademy(p => ({ ...p, subscription_status: e.target.value }))} className={inputCls}>
                          <option value="trial">Trial</option>
                          <option value="active">Active</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                      {newAcademy.subscription_status === 'trial' && (
                        <div><label className={labelCls}>Trial Days</label><input type="number" value={newAcademy.trial_days} onChange={e => setNewAcademy(p => ({ ...p, trial_days: e.target.value }))} className={inputCls} min="1" max="365" /></div>
                      )}
                      {newAcademy.subscription_status !== 'trial' && (
                        <div><label className={labelCls}>Expires At</label><input type="date" value={newAcademy.expires_at} onChange={e => setNewAcademy(p => ({ ...p, expires_at: e.target.value }))} className={inputCls} /></div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={handleCreateAcademy} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Create Academy</button>
                      <button onClick={() => setShowNewAcademyForm(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Academy', 'Plan', 'Status', 'Subscription', 'Expires', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAcademies.map(academy => (
                        editingAcademy?.id === academy.id ? (
                          <tr key={academy.id} className="bg-blue-50">
                            <td className="px-5 py-3 space-y-1">
                              <input type="text" value={editingAcademy.name} onChange={e => setEditingAcademy(p => p ? { ...p, name: e.target.value } : p)} className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-sm" />
                              <input type="text" value={editingAcademy.domain} onChange={e => setEditingAcademy(p => p ? { ...p, domain: e.target.value } : p)} className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-sm" />
                            </td>
                            <td className="px-5 py-3">
                              <select value={editingAcademy.plan_id || ''} onChange={e => setEditingAcademy(p => p ? { ...p, plan_id: e.target.value } : p)} className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-sm">
                                <option value="">No Plan</option>
                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                            <td className="px-5 py-3">
                              <select value={editingAcademy.status} onChange={e => setEditingAcademy(p => p ? { ...p, status: e.target.value } : p)} className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-sm">
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            </td>
                            <td className="px-5 py-3">
                              <select value={editingAcademy.subscription_status} onChange={e => setEditingAcademy(p => p ? { ...p, subscription_status: e.target.value } : p)} className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-sm">
                                <option value="trial">Trial</option>
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            </td>
                            <td className="px-5 py-3">
                              <input type="date" value={editingAcademy.expires_at ? editingAcademy.expires_at.split('T')[0] : ''} onChange={e => setEditingAcademy(p => p ? { ...p, expires_at: e.target.value } : p)} className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-sm" />
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <button onClick={handleUpdateAcademy} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><Save className="w-4 h-4" /></button>
                                <button onClick={() => setEditingAcademy(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={academy.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-semibold text-gray-900 text-sm">{academy.name}</div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Globe className="w-3 h-3" />{academy.domain}</div>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600">{academy.plan?.name || <span className="text-gray-300 italic text-xs">No Plan</span>}</td>
                            <td className="px-5 py-3">{getStatusBadge(academy.status)}</td>
                            <td className="px-5 py-3">{getStatusBadge(academy.subscription_status)}</td>
                            <td className="px-5 py-3">
                              {academy.expires_at ? (
                                <div>
                                  <div className="text-sm text-gray-600">{new Date(academy.expires_at).toLocaleDateString()}</div>
                                  {(() => {
                                    const d = getDaysRemaining(academy.expires_at);
                                    if (d === null) return null;
                                    return <div className={`text-xs font-medium ${d < 0 ? 'text-red-500' : d < 7 ? 'text-amber-500' : 'text-emerald-600'}`}>{d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}</div>;
                                  })()}
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setEditingAcademy(academy)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleToggleAcademyStatus(academy)} className={`p-1.5 rounded-lg ${academy.status === 'active' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} title={academy.status === 'active' ? 'Suspend' : 'Activate'}>
                                  {academy.status === 'active' ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => { setSelectedAcademyForFeatures(academy); loadAcademyFeatureOverrides(academy.id); setActiveTab('academy-features'); }} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Feature Overrides">
                                  <Layers className="w-3.5 h-3.5" />
                                </button>
                                <div className="relative group">
                                  <button className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Extend Subscription"><Calendar className="w-3.5 h-3.5" /></button>
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 hidden group-hover:block min-w-[150px] py-1">
                                    <p className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">Extend by</p>
                                    {[1, 3, 6, 12].map(m => (
                                      <button key={m} onClick={() => handleExtendSubscription(academy, m)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                                        +{m} month{m > 1 ? 's' : ''}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteAcademy(academy.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                      {filteredAcademies.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No academies found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'academy-features' && selectedAcademyForFeatures && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveTab('academies')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Feature Overrides</h2>
                    <p className="text-sm text-gray-400">{selectedAcademyForFeatures.name} — {selectedAcademyForFeatures.plan?.name || 'No Plan'}</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                  Override features specifically for this academy. Overrides take precedence over plan settings.
                </div>
                {Object.entries(featuresByCategory).map(([category, catFeatures]) => (
                  <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><h3 className="font-semibold text-gray-700 capitalize text-sm">{category}</h3></div>
                    <div className="divide-y divide-gray-50">
                      {catFeatures.map(feature => {
                        const override = academyOverrides.find(o => o.feature_key === feature.key);
                        const planFeature = selectedAcademyForFeatures.plan_id ? planFeatures.find(pf => pf.plan_id === selectedAcademyForFeatures.plan_id && pf.feature_key === feature.key) : null;
                        return (
                          <div key={feature.key} className="px-5 py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{feature.label}</p>
                              <p className="text-xs text-gray-400">Plan default: {planFeature?.enabled ? <span className="text-emerald-600 font-medium">Enabled</span> : <span className="text-gray-400">Disabled</span>}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {override !== undefined && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${override.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  Override: {override.enabled ? 'ON' : 'OFF'}
                                </span>
                              )}
                              <button onClick={() => handleToggleAcademyFeatureOverride(selectedAcademyForFeatures.id, feature.key, override?.enabled)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${override === undefined ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : override.enabled ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700' : 'bg-red-100 text-red-700 hover:bg-gray-100 hover:text-gray-700'}`}>
                                {override === undefined ? 'Set Override' : override.enabled ? 'Force ON' : 'Force OFF'}
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
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Plans & Limits</h2>
                  <button onClick={() => setShowNewPlanForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition shadow-sm">
                    <Plus className="w-4 h-4" /> Add Plan
                  </button>
                </div>

                {showNewPlanForm && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4">New Plan</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className={labelCls}>Name *</label><input type="text" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Plan name" /></div>
                      <div><label className={labelCls}>Monthly Price *</label><input type="number" value={newPlan.price_monthly} onChange={e => setNewPlan(p => ({ ...p, price_monthly: e.target.value }))} className={inputCls} placeholder="0.00" /></div>
                      <div><label className={labelCls}>Description</label><input type="text" value={newPlan.description} onChange={e => setNewPlan(p => ({ ...p, description: e.target.value }))} className={inputCls} placeholder="Short description" /></div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleCreatePlan} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Create Plan</button>
                      <button onClick={() => setShowNewPlanForm(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {plans.map(plan => {
                    const limits = planLimitsMap[plan.id] || defaultLimits();
                    const isEditing = editingPlan?.id === plan.id;
                    const academiesOnPlan = academies.filter(a => a.plan_id === plan.id).length;
                    const editLimits = isEditing ? (editingPlanLimits || limits) : limits;

                    return (
                      <div key={plan.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isEditing ? 'border-blue-300' : 'border-gray-200'}`}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              {isEditing ? (
                                <input type="text" value={editingPlan!.name} onChange={e => setEditingPlan(p => p ? { ...p, name: e.target.value } : p)} className="font-bold text-gray-900 border-b border-blue-400 bg-transparent focus:outline-none text-lg" />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                                  {limits.is_popular && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">Most Popular</span>}
                                  {limits.is_trial && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">Trial: {limits.trial_days}d</span>}
                                  {!limits.is_visible && <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><EyeOff className="w-3 h-3" />Hidden</span>}
                                </div>
                              )}
                              <p className="text-sm text-gray-400">{academiesOnPlan} {academiesOnPlan === 1 ? 'academy' : 'academies'} on this plan</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 text-sm">$</span>
                                  <input type="number" value={editingPlan!.price_monthly} onChange={e => setEditingPlan(p => p ? { ...p, price_monthly: parseFloat(e.target.value) } : p)} className="w-24 border-b border-blue-400 bg-transparent text-xl font-bold text-gray-900 focus:outline-none" />
                                  <span className="text-gray-400 text-sm">/mo</span>
                                </div>
                              ) : (
                                <div>
                                  <div className="text-xl font-bold text-gray-900">${plan.price_monthly}<span className="text-gray-400 text-sm font-normal">/mo</span></div>
                                  {limits.price_yearly > 0 && <div className="text-xs text-gray-400">${limits.price_yearly}/yr</div>}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={handleUpdatePlan} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"><Save className="w-3.5 h-3.5" /> Save</button>
                                  <button onClick={() => { setEditingPlan(null); setEditingPlanLimits(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingPlan(plan); setEditingPlanLimits({ ...limits }); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeletePlan(plan.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"><Trash2 className="w-4 h-4" /></button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Plan Settings & Limits</p>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className={labelCls}>Max Students</label>
                                <div className="flex items-center gap-2">
                                  <input type="number" min="0" value={editLimits.max_students} onChange={e => setEditingPlanLimits(p => p ? { ...p, max_students: parseInt(e.target.value) || 0 } : p)} className={inputCls} />
                                  <span className="text-xs text-gray-400 whitespace-nowrap">{editLimits.max_students === 0 ? 'unlimited' : ''}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">0 = unlimited</p>
                              </div>
                              <div>
                                <label className={labelCls}>Max Branches</label>
                                <div className="flex items-center gap-2">
                                  <input type="number" min="0" value={editLimits.max_branches} onChange={e => setEditingPlanLimits(p => p ? { ...p, max_branches: parseInt(e.target.value) || 0 } : p)} className={inputCls} />
                                  <span className="text-xs text-gray-400 whitespace-nowrap">{editLimits.max_branches === 0 ? 'unlimited' : ''}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">0 = unlimited</p>
                              </div>
                              <div>
                                <label className={labelCls}>Yearly Price ($)</label>
                                <input type="number" min="0" value={editLimits.price_yearly} onChange={e => setEditingPlanLimits(p => p ? { ...p, price_yearly: parseFloat(e.target.value) || 0 } : p)} className={inputCls} />
                              </div>
                              <div>
                                <label className={labelCls}>Currency</label>
                                <select value={editLimits.currency} onChange={e => setEditingPlanLimits(p => p ? { ...p, currency: e.target.value } : p)} className={inputCls}>
                                  <option value="USD">USD ($)</option>
                                  <option value="EUR">EUR (€)</option>
                                  <option value="GBP">GBP (£)</option>
                                  <option value="SAR">SAR (ر.س)</option>
                                  <option value="AED">AED (د.إ)</option>
                                  <option value="KWD">KWD (د.ك)</option>
                                  <option value="BHD">BHD (.د.ب)</option>
                                  <option value="QAR">QAR (ر.ق)</option>
                                </select>
                              </div>
                              <div>
                                <label className={labelCls}>Display Order</label>
                                <input type="number" min="0" value={editLimits.display_order} onChange={e => setEditingPlanLimits(p => p ? { ...p, display_order: parseInt(e.target.value) || 0 } : p)} className={inputCls} />
                              </div>
                              <div className="space-y-3 pt-1">
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                  <div className={`w-10 h-5 rounded-full transition-colors relative ${editLimits.is_trial ? 'bg-blue-500' : 'bg-gray-200'}`} onClick={() => setEditingPlanLimits(p => p ? { ...p, is_trial: !p.is_trial } : p)}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editLimits.is_trial ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Is Trial Plan</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                  <div className={`w-10 h-5 rounded-full transition-colors relative ${editLimits.is_popular ? 'bg-amber-500' : 'bg-gray-200'}`} onClick={() => setEditingPlanLimits(p => p ? { ...p, is_popular: !p.is_popular } : p)}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editLimits.is_popular ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Most Popular</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                  <div className={`w-10 h-5 rounded-full transition-colors relative ${editLimits.is_visible ? 'bg-emerald-500' : 'bg-gray-200'}`} onClick={() => setEditingPlanLimits(p => p ? { ...p, is_visible: !p.is_visible } : p)}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editLimits.is_visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Visible on Landing</span>
                                </label>
                              </div>
                              {editLimits.is_trial && (
                                <div>
                                  <label className={labelCls}>Trial Days</label>
                                  <input type="number" min="1" max="365" value={editLimits.trial_days} onChange={e => setEditingPlanLimits(p => p ? { ...p, trial_days: parseInt(e.target.value) || 14 } : p)} className={inputCls} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                            <div className="flex gap-6 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                <span className="font-medium">{limits.max_students === 0 ? 'Unlimited' : limits.max_students}</span>
                                <span className="text-gray-400">students</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                <span className="font-medium">{limits.max_branches === 0 ? 'Unlimited' : limits.max_branches}</span>
                                <span className="text-gray-400">branches</span>
                              </div>
                              {limits.price_yearly > 0 && (
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="font-medium">${limits.price_yearly}/yr</span>
                                </div>
                              )}
                              {limits.is_trial && (
                                <div className="flex items-center gap-1.5 text-blue-600">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span className="font-medium">{limits.trial_days}-day trial</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="px-6 py-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Features Included</p>
                          <div className="grid grid-cols-4 gap-2">
                            {features.map(feature => {
                              const pf = planFeatures.find(f => f.plan_id === plan.id && f.feature_key === feature.key);
                              const enabled = pf?.enabled ?? false;
                              return (
                                <button key={feature.key} onClick={() => handleTogglePlanFeature(plan.id, feature.key, enabled)}
                                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition border ${enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}>
                                  {enabled ? <Check className="w-3 h-3 flex-shrink-0" /> : <X className="w-3 h-3 flex-shrink-0" />}
                                  <span className="truncate">{feature.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          {features.length === 0 && <p className="text-xs text-gray-400 italic">No features defined yet</p>}
                        </div>
                      </div>
                    );
                  })}
                  {plans.length === 0 && <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">No plans yet.</div>}
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Features Management</h2>
                  <button onClick={() => setShowNewFeatureForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition shadow-sm">
                    <Plus className="w-4 h-4" /> Add Feature
                  </button>
                </div>

                {showNewFeatureForm && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4">New Feature</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className={labelCls}>Key (unique) *</label><input type="text" value={newFeature.key} onChange={e => setNewFeature(p => ({ ...p, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} className={inputCls} placeholder="e.g. reports" /></div>
                      <div><label className={labelCls}>Label *</label><input type="text" value={newFeature.label} onChange={e => setNewFeature(p => ({ ...p, label: e.target.value }))} className={inputCls} placeholder="e.g. Reports" /></div>
                      <div>
                        <label className={labelCls}>Category</label>
                        <select value={newFeature.category} onChange={e => setNewFeature(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                          {['core', 'management', 'finance', 'reports', 'security', 'communication', 'inventory'].map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={handleCreateFeature} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Add Feature</button>
                      <button onClick={() => setShowNewFeatureForm(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
                    </div>
                  </div>
                )}

                {Object.entries(featuresByCategory).map(([category, catFeatures]) => (
                  <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-gray-700 capitalize text-sm">{category}</h3>
                      <span className="text-xs text-gray-400">{catFeatures.length} feature{catFeatures.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {catFeatures.map(feature => (
                        <div key={feature.key} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{feature.label}</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{feature.key}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {plans.filter(p => planFeatures.find(pf => pf.plan_id === p.id && pf.feature_key === feature.key && pf.enabled)).map(p => (
                                <span key={p.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{p.name}</span>
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">{plans.filter(p => planFeatures.find(pf => pf.plan_id === p.id && pf.feature_key === feature.key && pf.enabled)).length}/{plans.length} plans</span>
                            <button onClick={() => handleDeleteFeature(feature.key)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {features.length === 0 && <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">No features yet.</div>}
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-900">Subscription History</h2>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Academy', 'Plan', 'Starts', 'Ends', 'Duration', 'Status'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subscriptions.map(sub => {
                        const academy = academies.find(a => a.id === sub.academy_id);
                        const plan = plans.find(p => p.id === sub.plan_id);
                        const start = new Date(sub.starts_at);
                        const end = new Date(sub.ends_at);
                        const months = Math.round((end.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000));
                        return (
                          <tr key={sub.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-sm font-semibold text-gray-900">{academy?.name || sub.academy_id.substring(0, 8) + '...'}</td>
                            <td className="px-5 py-3 text-sm text-gray-600">{plan?.name || '—'}</td>
                            <td className="px-5 py-3 text-sm text-gray-600">{start.toLocaleDateString()}</td>
                            <td className="px-5 py-3 text-sm text-gray-600">{end.toLocaleDateString()}</td>
                            <td className="px-5 py-3 text-sm text-gray-500">{months}mo</td>
                            <td className="px-5 py-3">{getStatusBadge(sub.status)}</td>
                          </tr>
                        );
                      })}
                      {subscriptions.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No subscription records yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-900">Platform Settings</h2>
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { icon: Bell, title: 'Notifications', desc: 'Configure platform-wide notification settings', color: 'blue' },
                    { icon: Shield, title: 'Security', desc: 'Manage authentication and security policies', color: 'red' },
                    { icon: Database, title: 'Data & Backups', desc: 'Manage data retention and backup schedules', color: 'emerald' },
                    { icon: Lock, title: 'Access Control', desc: 'Manage admin roles and permissions', color: 'amber' },
                    { icon: BarChart2, title: 'Analytics', desc: 'Platform-wide analytics and reporting', color: 'blue' },
                    { icon: Zap, title: 'Integrations', desc: 'Manage third-party integrations and APIs', color: 'emerald' },
                  ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-5 h-5 text-${color}-600`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{title}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Platform Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total Plans', val: stats.totalPlans, icon: Package },
                      { label: 'Total Features', val: stats.totalFeatures, icon: Zap },
                      { label: 'Total Academies', val: stats.totalAcademies, icon: Building2 },
                      { label: 'Active Subscriptions', val: stats.activeSubscriptions, icon: Check },
                      { label: 'MRR', val: `$${stats.mrr.toFixed(0)}`, icon: DollarSign },
                      { label: 'ARR', val: `$${(stats.mrr * 12).toFixed(0)}`, icon: TrendingUp },
                    ].map(({ label, val, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Icon className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="font-bold text-gray-900">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
