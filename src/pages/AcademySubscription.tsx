import { useState, useEffect } from 'react';
import { Check, Calendar, CreditCard, AlertCircle, ArrowRight, Star, Zap, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  description: string;
}

interface Academy {
  id: string;
  name: string;
  status: string;
  subscription_status: string;
  expires_at: string | null;
  plan_id: string | null;
  plan?: Plan;
}

const PLAN_FEATURES: Record<string, string[]> = {
  Basic: [
    'Up to 100 students',
    'Attendance tracking',
    'Package management',
    'Basic invoicing',
    'Settings & configuration',
  ],
  Pro: [
    'Up to 500 students',
    'Multi-branch management',
    'User roles & permissions',
    'Sales & expense tracking',
    'Revenue & attendance reports',
    'Exam eligibility tracking',
    'Scheme management',
  ],
  Elite: [
    'Unlimited students',
    'All Pro features',
    'Stock & inventory management',
    'Inactive player alerts',
    'Security audit log',
    'Login history',
    'Priority support',
  ],
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  Basic: <Zap className="w-6 h-6 text-blue-500" />,
  Pro: <Star className="w-6 h-6 text-amber-500" />,
  Elite: <Crown className="w-6 h-6 text-red-600" />,
};

export default function AcademySubscription() {
  const { profile } = useAuth();
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile?.academy_id) {
      setLoading(false);
      return;
    }

    try {
      const [academyRes, plansRes] = await Promise.all([
        supabase
          .from('academies')
          .select('*, plan:plans(*)')
          .eq('id', profile.academy_id)
          .maybeSingle(),
        supabase
          .from('plans')
          .select('*')
          .order('price_monthly'),
      ]);

      if (academyRes.data) setAcademy(academyRes.data);
      if (plansRes.data) setPlans(plansRes.data);
    } catch (err) {
      console.error('Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!academy?.expires_at) return null;
    const diff = new Date(academy.expires_at).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800 border border-green-200' },
      trial: { label: 'Trial', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
      expired: { label: 'Expired', className: 'bg-red-100 text-red-800 border border-red-200' },
      suspended: { label: 'Suspended', className: 'bg-gray-100 text-gray-700 border border-gray-200' },
    };
    const item = map[status] || { label: status, className: 'bg-gray-100 text-gray-700 border border-gray-200' };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${item.className}`}>
        {item.label}
      </span>
    );
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowConfirm(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan || !academy) return;
    setUpgrading(true);
    setErrorMsg('');
    try {
      const newExpiresAt = new Date();
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);

      const { error } = await supabase
        .from('academies')
        .update({
          plan_id: selectedPlan.id,
          subscription_status: 'active',
          status: 'active',
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', academy.id);

      if (error) throw error;

      setSuccessMsg(`Successfully switched to ${selectedPlan.name} plan!`);
      setShowConfirm(false);
      setSelectedPlan(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update plan. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const daysRemaining = getDaysRemaining();
  const expiryPercent = daysRemaining !== null ? Math.max(0, Math.min(100, (daysRemaining / 30) * 100)) : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.academy_id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No Academy Linked</h2>
        <p className="text-gray-500">Your account is not linked to an academy. Contact the platform owner.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your academy's plan and billing</p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800 font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Current Subscription</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status</p>
            {getStatusBadge(academy?.subscription_status || 'trial')}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current Plan</p>
            <div className="flex items-center gap-2">
              {academy?.plan && PLAN_ICONS[academy.plan.name]}
              <p className="text-lg font-bold text-gray-900">{academy?.plan?.name || 'No Plan'}</p>
            </div>
            {academy?.plan && (
              <p className="text-sm text-gray-500 mt-0.5">${academy.plan.price_monthly}/month</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Expires</p>
            {academy?.expires_at ? (
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {new Date(academy.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className={`text-sm mt-0.5 font-medium ${(daysRemaining ?? 0) < 7 ? 'text-red-600' : 'text-gray-500'}`}>
                  {daysRemaining !== null
                    ? daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'
                    : '—'}
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No expiry date set</p>
            )}
          </div>
        </div>

        {academy?.expires_at && daysRemaining !== null && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Subscription period progress</span>
              <span className="text-xs font-semibold text-gray-700">{Math.max(0, daysRemaining)} / 30 days left</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  expiryPercent > 50 ? 'bg-green-500' : expiryPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${expiryPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          {academy?.plan_id ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">Plans are activated immediately upon selection.</p>

        {plans.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-3" />
            <p>No plans available at the moment.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = academy?.plan_id === plan.id;
              const isPopular = plan.name === 'Pro';
              const features = PLAN_FEATURES[plan.name] || [];

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                    isCurrent
                      ? 'border-green-500 bg-green-50/30'
                      : isPopular
                      ? 'border-red-600 shadow-lg shadow-red-100/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isPopular && !isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3 mt-2">
                    {PLAN_ICONS[plan.name] || <Zap className="w-6 h-6 text-gray-400" />}
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>

                  <p className="text-gray-500 text-sm mb-5 min-h-[36px]">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">${plan.price_monthly}</span>
                    <span className="text-gray-500 ml-1 text-sm">/month</span>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !isCurrent && handleSelectPlan(plan)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : isPopular
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <Check className="w-4 h-4" /> Active
                      </>
                    ) : (
                      <>
                        {academy?.plan_id ? 'Switch to This Plan' : 'Get Started'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              {PLAN_ICONS[selectedPlan.name] || <CreditCard className="w-6 h-6 text-gray-600" />}
              <h3 className="text-xl font-bold text-gray-900">
                {academy?.plan_id ? 'Confirm Plan Change' : 'Confirm Plan'}
              </h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Plan</span>
                <span className="font-bold text-gray-900">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Price</span>
                <span className="font-bold text-gray-900">${selectedPlan.price_monthly}/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Active from</span>
                <span className="font-semibold text-gray-700">Immediately</span>
              </div>
            </div>

            {academy?.plan_id && academy.plan?.name !== selectedPlan.name && (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl mb-5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Switching from <strong>{academy.plan?.name}</strong> to <strong>{selectedPlan.name}</strong>. This takes effect immediately.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirmUpgrade}
                disabled={upgrading}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {upgrading ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setSelectedPlan(null); }}
                disabled={upgrading}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
