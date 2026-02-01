import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
  X
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  description: string;
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

export default function PlatformAdmin() {
  const [activeTab, setActiveTab] = useState<'overview' | 'academies' | 'plans' | 'features'>('overview');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingAcademy, setEditingAcademy] = useState<Academy | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  const [newAcademy, setNewAcademy] = useState({ name: '', domain: '', plan_id: '' });
  const [newPlan, setNewPlan] = useState({ name: '', price_monthly: 0, description: '' });
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
      loadPlanFeatures()
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
    if (!error) loadAcademies();
  };

  const createPlan = async () => {
    const { error } = await supabase.from('plans').insert([newPlan]);

    if (!error) {
      setNewPlan({ name: '', price_monthly: 0, description: '' });
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

  const stats = {
    totalAcademies: academies.length,
    activeAcademies: academies.filter(a => a.status === 'active').length,
    totalPlans: plans.length,
    totalFeatures: features.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading platform data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">DOJO CLOUD - Platform Admin</h1>
          <p className="mt-2 text-blue-100">Manage academies, plans, and features</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Building2 className="inline w-4 h-4 mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('academies')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'academies'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline w-4 h-4 mr-2" />
                Academies
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'plans'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CreditCard className="inline w-4 h-4 mr-2" />
                Plans
              </button>
              <button
                onClick={() => setActiveTab('features')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'features'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <SettingsIcon className="inline w-4 h-4 mr-2" />
                Features
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Platform Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="text-blue-600 text-3xl font-bold">{stats.totalAcademies}</div>
                    <div className="text-gray-600 mt-2">Total Academies</div>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <div className="text-green-600 text-3xl font-bold">{stats.activeAcademies}</div>
                    <div className="text-gray-600 mt-2">Active Academies</div>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <div className="text-purple-600 text-3xl font-bold">{stats.totalPlans}</div>
                    <div className="text-gray-600 mt-2">Subscription Plans</div>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-lg">
                    <div className="text-orange-600 text-3xl font-bold">{stats.totalFeatures}</div>
                    <div className="text-gray-600 mt-2">Available Features</div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-4">Recent Academies</h3>
                <div className="space-y-2">
                  {academies.slice(0, 5).map(academy => (
                    <div key={academy.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{academy.name}</div>
                        <div className="text-sm text-gray-600">{academy.domain}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          academy.subscription_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {academy.subscription_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'academies' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Academies</h2>
                  <button
                    onClick={() => setShowAcademyForm(!showAcademyForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Academy
                  </button>
                </div>

                {showAcademyForm && (
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold mb-4">New Academy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Academy Name"
                        value={newAcademy.name}
                        onChange={e => setNewAcademy({ ...newAcademy, name: e.target.value })}
                        className="border border-gray-300 rounded-lg px-4 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Domain (e.g., academy1)"
                        value={newAcademy.domain}
                        onChange={e => setNewAcademy({ ...newAcademy, domain: e.target.value })}
                        className="border border-gray-300 rounded-lg px-4 py-2"
                      />
                      <select
                        value={newAcademy.plan_id}
                        onChange={e => setNewAcademy({ ...newAcademy, plan_id: e.target.value })}
                        className="border border-gray-300 rounded-lg px-4 py-2"
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
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Create
                      </button>
                      <button
                        onClick={() => setShowAcademyForm(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        <X className="w-4 h-4 inline mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {academies.map(academy => (
                    <div key={academy.id} className="border border-gray-200 rounded-lg p-4">
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
                            <div className="font-medium text-lg">{academy.name}</div>
                            <div className="text-sm text-gray-600">{academy.domain}</div>
                            <div className="flex gap-2 mt-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                academy.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {academy.status}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${
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
                              className="text-blue-600 hover:text-blue-800 p-2"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteAcademy(academy.id)}
                              className="text-red-600 hover:text-red-800 p-2"
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

            {activeTab === 'plans' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Subscription Plans</h2>
                  <button
                    onClick={() => setShowPlanForm(!showPlanForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Plan
                  </button>
                </div>

                {showPlanForm && (
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
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
                    <div className="flex gap-2">
                      <button
                        onClick={createPlan}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Create
                      </button>
                      <button
                        onClick={() => setShowPlanForm(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        <X className="w-4 h-4 inline mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {plans.map(plan => (
                    <div key={plan.id} className="border-2 border-gray-200 rounded-lg p-6">
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
                          <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                          <div className="text-3xl font-bold text-blue-600 mb-4">
                            ${plan.price_monthly}
                            <span className="text-sm text-gray-600 font-normal">/month</span>
                          </div>
                          <p className="text-gray-600 mb-4">{plan.description}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingPlan(plan)}
                              className="text-blue-600 hover:text-blue-800 p-2"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deletePlan(plan.id)}
                              className="text-red-600 hover:text-red-800 p-2"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <h3 className="text-xl font-semibold mb-4">Plan-Feature Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-200 px-4 py-2 text-left">Feature</th>
                        {plans.map(plan => (
                          <th key={plan.id} className="border border-gray-200 px-4 py-2 text-center">
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map(feature => (
                        <tr key={feature.key}>
                          <td className="border border-gray-200 px-4 py-2">
                            <div className="font-medium">{feature.label}</div>
                            <div className="text-sm text-gray-500">{feature.category}</div>
                          </td>
                          {plans.map(plan => (
                            <td key={plan.id} className="border border-gray-200 px-4 py-2 text-center">
                              <button
                                onClick={() => togglePlanFeature(plan.id, feature.key)}
                                className={`p-2 rounded ${
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
            )}

            {activeTab === 'features' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Features</h2>
                  <button
                    onClick={() => setShowFeatureForm(!showFeatureForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Feature
                  </button>
                </div>

                {showFeatureForm && (
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
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
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Create
                      </button>
                      <button
                        onClick={() => setShowFeatureForm(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        <X className="w-4 h-4 inline mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {features.map(feature => (
                    <div key={feature.key} className="border border-gray-200 rounded-lg p-4">
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
                            <div className="font-medium text-lg">{feature.label}</div>
                            <div className="text-sm text-gray-600">Key: {feature.key}</div>
                            <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {feature.category}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingFeature(feature)}
                              className="text-blue-600 hover:text-blue-800 p-2"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteFeature(feature.key)}
                              className="text-red-600 hover:text-red-800 p-2"
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
          </div>
        </div>
      </div>
    </div>
  );
}
