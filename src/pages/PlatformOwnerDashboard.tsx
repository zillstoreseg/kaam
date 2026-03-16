import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Building2, Package, CreditCard, FileText, Settings, TrendingUp, Users, DollarSign, Calendar, Check, X, Eye, Download, CreditCard as Edit, Trash2, Plus, Search, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Academy {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  subscription_status: string;
  subscription_start: string;
  subscription_end: string;
  trial_ends_at: string;
  created_at: string;
  is_active: boolean;
  subscription_plan?: {
    name: string;
  };
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_students: number;
  max_branches: number;
  features: string[];
  is_active: boolean;
  display_order: number;
}

interface Payment {
  id: string;
  academy: {
    name: string;
    owner_name: string;
    email: string;
  };
  subscription_plan: {
    name: string;
  };
  amount: number;
  currency: string;
  billing_period: string;
  payment_screenshot_url: string;
  status: string;
  submitted_at: string;
  notes: string;
}

interface PlatformSettings {
  bank_details: {
    bank_name: string;
    account_name: string;
    iban: string;
    swift: string;
  };
  openai_api_key: string;
  trial_period_days: number;
  platform_name: string;
  support_email: string;
}

export default function PlatformOwnerDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalAcademies: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    newAcademiesThisMonth: 0,
    mrr: 0,
    arr: 0,
    churnRate: 0,
    conversionRate: 0,
    trialAcademies: 0,
  });
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        await loadStats();
        await loadRecentAcademies();
      } else if (activeTab === 'academies') {
        await loadAcademies();
      } else if (activeTab === 'plans') {
        await loadPlans();
      } else if (activeTab === 'payments') {
        await loadPayments();
      } else if (activeTab === 'settings') {
        await loadSettings();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const { data: academiesData } = await supabase
      .from('academies')
      .select('*, subscription_plan:subscription_plans(*)');

    const totalAcademies = academiesData?.length || 0;
    const activeSubscriptions = academiesData?.filter(a => a.subscription_status === 'active').length || 0;
    const trialAcademies = academiesData?.filter(a => a.subscription_status === 'trial').length || 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const newAcademiesThisMonth = academiesData?.filter(
      a => new Date(a.created_at) >= startOfMonth
    ).length || 0;

    const { data: paymentsData } = await supabase
      .from('subscription_payments')
      .select('amount, billing_period')
      .eq('status', 'approved')
      .gte('submitted_at', startOfMonth.toISOString());

    const monthlyRevenue = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;

    let mrr = 0;
    academiesData?.forEach(academy => {
      if (academy.subscription_status === 'active' && academy.subscription_plan) {
        mrr += academy.subscription_plan.price_monthly;
      }
    });

    const arr = mrr * 12;

    const lastMonthActive = academiesData?.filter(a =>
      a.subscription_status === 'active' &&
      new Date(a.subscription_start) < startOfMonth
    ).length || 1;

    const churnedThisMonth = academiesData?.filter(a =>
      a.subscription_status === 'expired' &&
      a.subscription_end &&
      new Date(a.subscription_end) >= startOfMonth &&
      new Date(a.subscription_end) < new Date()
    ).length || 0;

    const churnRate = lastMonthActive > 0 ? (churnedThisMonth / lastMonthActive) * 100 : 0;

    const totalTrials = academiesData?.filter(a => new Date(a.created_at) < new Date()).length || 1;
    const converted = academiesData?.filter(a => a.subscription_status === 'active').length || 0;
    const conversionRate = (converted / totalTrials) * 100;

    setStats({
      totalAcademies,
      activeSubscriptions,
      monthlyRevenue,
      newAcademiesThisMonth,
      mrr,
      arr,
      churnRate,
      conversionRate,
      trialAcademies,
    });
  };

  const loadRecentAcademies = async () => {
    const { data } = await supabase
      .from('academies')
      .select('*, subscription_plan:subscription_plans(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setAcademies(data);
  };

  const loadAcademies = async () => {
    const { data } = await supabase
      .from('academies')
      .select('*, subscription_plan:subscription_plans(name)')
      .order('created_at', { ascending: false });

    if (data) setAcademies(data);
  };

  const loadPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('display_order');

    if (data) setPlans(data);
  };

  const loadPayments = async () => {
    const { data } = await supabase
      .from('subscription_payments')
      .select(`
        *,
        academy:academies(name, owner_name, email),
        subscription_plan:subscription_plans(name)
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });

    if (data) setPayments(data as any);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('key, value');

    if (data) {
      const settingsObj: any = {};
      data.forEach(item => {
        const value = item.value;
        if (typeof value === 'string') {
          settingsObj[item.key] = JSON.parse(value);
        } else {
          settingsObj[item.key] = value;
        }
      });
      setSettings(settingsObj);
    }
  };

  const handleApprovePayment = async (paymentId: string, payment: Payment) => {
    const { error } = await supabase
      .from('subscription_payments')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (!error) {
      const startDate = new Date();
      const endDate = new Date();
      if (payment.billing_period === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      await supabase
        .from('academies')
        .update({
          subscription_status: 'active',
          subscription_start: startDate.toISOString(),
          subscription_end: endDate.toISOString(),
        })
        .eq('id', payment.academy.id);

      loadPayments();
      alert('Payment approved and subscription activated!');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const { error } = await supabase
      .from('subscription_payments')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (!error) {
      loadPayments();
      alert('Payment rejected');
    }
  };

  const handleToggleAcademy = async (academyId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('academies')
      .update({ is_active: !isActive })
      .eq('id', academyId);

    if (!error) {
      loadAcademies();
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      trial: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      pending_payment: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">DOJO CLOUD Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                Exit to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'overview'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('academies')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'academies'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Building2 className="w-5 h-5 mr-3" />
                Academies
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'plans'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Package className="w-5 h-5 mr-3" />
                Subscription Plans
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'payments'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-5 h-5 mr-3" />
                Payment Approvals
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-5 h-5 mr-3" />
                Platform Settings
              </button>
              <button
                onClick={() => setActiveTab('emails')}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'emails'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5 mr-3" />
                Email Settings
              </button>
            </div>
          </div>

          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">MRR</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">${stats.mrr.toFixed(0)}</p>
                        <p className="text-xs text-gray-500 mt-1">Monthly Recurring</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">ARR</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">${stats.arr.toFixed(0)}</p>
                        <p className="text-xs text-gray-500 mt-1">Annual Recurring</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Conversion Rate</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.conversionRate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500 mt-1">Trial to Paid</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Churn Rate</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.churnRate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500 mt-1">This Month</p>
                      </div>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stats.churnRate > 5 ? 'bg-red-100' : 'bg-green-100'}`}>
                        <TrendingUp className={`w-6 h-6 ${stats.churnRate > 5 ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Academies</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAcademies}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Subscriptions</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeSubscriptions}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Check className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Monthly Revenue</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">${stats.monthlyRevenue.toFixed(2)}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">New This Month</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.newAcademiesThisMonth}</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Academies</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Academy</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {academies.map((academy) => (
                          <tr key={academy.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{academy.name}</div>
                              <div className="text-sm text-gray-500">{academy.city}, {academy.country}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{academy.owner_name}</div>
                              <div className="text-sm text-gray-500">{academy.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {academy.subscription_plan?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(academy.subscription_status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(academy.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
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
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Academy</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {academies.map((academy) => (
                        <tr key={academy.id}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{academy.name}</div>
                            <div className="text-sm text-gray-500">{academy.city}, {academy.country}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{academy.owner_name}</div>
                            <div className="text-sm text-gray-500">{academy.email}</div>
                            {academy.phone && <div className="text-sm text-gray-500">{academy.phone}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              academy.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {academy.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(academy.subscription_status)}
                            {academy.subscription_end && (
                              <div className="text-xs text-gray-500 mt-1">
                                Expires: {new Date(academy.subscription_end).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleAcademy(academy.id, academy.is_active)}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                academy.is_active
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {academy.is_active ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'plans' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Subscription Plans</h2>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-lg shadow-sm p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-gray-600 mb-4">{plan.description}</p>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">
                          ${plan.price_monthly}
                        </span>
                        <span className="text-gray-600">/month</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Max Students: {plan.max_students === 999999 ? 'Unlimited' : plan.max_students}</div>
                        <div>Max Branches: {plan.max_branches}</div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          {plan.features.length} features included
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Payment Approvals</h2>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {payments.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      No pending payments to review
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <div key={payment.id} className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-4">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {payment.academy.name}
                                  </h3>
                                  <p className="text-sm text-gray-600">{payment.academy.email}</p>
                                </div>
                                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                  {payment.subscription_plan.name}
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-600">Amount</p>
                                  <p className="font-semibold text-gray-900">
                                    ${payment.amount} {payment.currency}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Billing Period</p>
                                  <p className="font-semibold text-gray-900 capitalize">
                                    {payment.billing_period}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Submitted</p>
                                  <p className="font-semibold text-gray-900">
                                    {new Date(payment.submitted_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              {payment.notes && (
                                <div className="mb-4">
                                  <p className="text-sm text-gray-600">Notes</p>
                                  <p className="text-sm text-gray-900">{payment.notes}</p>
                                </div>
                              )}

                              {payment.payment_screenshot_url && (
                                <div className="mb-4">
                                  <p className="text-sm text-gray-600 mb-2">Payment Proof</p>
                                  <a
                                    href={payment.payment_screenshot_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Screenshot
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprovePayment(payment.id, payment)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectPayment(payment.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && settings && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Platform Settings</h2>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Transfer Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <input
                        type="text"
                        value={settings.bank_details?.bank_name || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                      <input
                        type="text"
                        value={settings.bank_details?.account_name || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                      <input
                        type="text"
                        value={settings.bank_details?.iban || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SWIFT</label>
                      <input
                        type="text"
                        value={settings.bank_details?.swift || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                      <input
                        type="text"
                        value={settings.platform_name || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                      <input
                        type="email"
                        value={settings.support_email || ''}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Trial Period (Days)</label>
                      <input
                        type="number"
                        value={settings.trial_period_days || 14}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">OpenAI API Key</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Required for AI Assistant feature
                  </p>
                  <input
                    type="password"
                    value={settings.openai_api_key || ''}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="sk-..."
                    readOnly
                  />
                </div>
              </div>
            )}

            {activeTab === 'emails' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Email Settings</h2>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" className="w-4 h-4 text-blue-600" />
                        <span className="ml-2 text-sm font-medium text-gray-700">Enable Email Notifications</span>
                      </label>
                      <p className="text-sm text-gray-500 mt-1 ml-6">Send automated emails to academies</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Provider</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SendGrid API Key</label>
                      <input
                        type="password"
                        placeholder="SG.xxxxxxxxxxxx"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Get your API key from SendGrid dashboard</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                      <input
                        type="email"
                        placeholder="noreply@dojocloud.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                      <input
                        type="text"
                        placeholder="DOJO CLOUD"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Triggers</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Welcome email on registration</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Trial reminder (7 days before)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Trial reminder (3 days before)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Trial reminder (1 day before)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Trial expired notification</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Payment received confirmation</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Payment approved notification</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Subscription expiring (7 days before)</span>
                    </label>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">How to Set Up Email</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Sign up for SendGrid (free tier available)</li>
                    <li>Create an API key in SendGrid dashboard</li>
                    <li>Add the API key above</li>
                    <li>Configure your from email and name</li>
                    <li>Enable email notifications</li>
                    <li>Test by registering a new academy</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
