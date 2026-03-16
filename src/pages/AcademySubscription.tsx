import { useState, useEffect } from 'react';
import { Check, Upload, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
}

interface Academy {
  id: string;
  name: string;
  subscription_status: string;
  subscription_start: string;
  subscription_end: string;
  trial_ends_at: string;
  subscription_plan_id: string;
  subscription_plan?: {
    name: string;
    max_students: number;
    max_branches: number;
  };
}

interface BankDetails {
  bank_name: string;
  account_name: string;
  iban: string;
  swift: string;
}

export default function AcademySubscription() {
  const { profile } = useAuth();
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile?.academy_id) return;

    const [academyRes, plansRes, settingsRes] = await Promise.all([
      supabase
        .from('academies')
        .select('*, subscription_plan:subscription_plans(*)')
        .eq('id', profile.academy_id)
        .single(),
      supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'bank_details')
        .single()
    ]);

    if (academyRes.data) setAcademy(academyRes.data);
    if (plansRes.data) setPlans(plansRes.data);
    if (settingsRes.data) {
      const value = settingsRes.data.value;
      setBankDetails(typeof value === 'string' ? JSON.parse(value) : value);
    }

    setLoading(false);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setShowPaymentForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentScreenshot(e.target.files[0]);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedPlan || !paymentScreenshot || !academy) return;

    setUploading(true);

    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `${academy.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, paymentScreenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(fileName);

      const plan = plans.find(p => p.id === selectedPlan);
      const amount = billingPeriod === 'monthly' ? plan!.price_monthly : plan!.price_yearly;

      const { error: paymentError } = await supabase
        .from('subscription_payments')
        .insert({
          academy_id: academy.id,
          subscription_plan_id: selectedPlan,
          amount,
          currency: plan!.currency,
          billing_period: billingPeriod,
          payment_screenshot_url: publicUrl,
          notes,
          status: 'pending',
        });

      if (paymentError) throw paymentError;

      await supabase
        .from('academies')
        .update({ subscription_status: 'pending_payment', subscription_plan_id: selectedPlan })
        .eq('id', academy.id);

      alert('Payment submitted successfully! Your subscription will be activated after review.');
      setShowPaymentForm(false);
      setSelectedPlan(null);
      setPaymentScreenshot(null);
      setNotes('');
      loadData();
    } catch (error: any) {
      console.error('Payment submission error:', error);
      alert('Failed to submit payment. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      trial: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      pending_payment: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDaysRemaining = () => {
    if (!academy) return 0;
    const endDate = academy.subscription_status === 'trial'
      ? new Date(academy.trial_ends_at)
      : new Date(academy.subscription_end);
    const today = new Date();
    const diff = endDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Academy not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Subscription Management</h1>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(academy.subscription_status)}`}>
                  {academy.subscription_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Plan</p>
                <p className="text-lg font-semibold text-gray-900">
                  {academy.subscription_plan?.name || 'No Plan'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {academy.subscription_status === 'trial' ? 'Trial Ends' : 'Subscription Ends'}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {academy.subscription_status === 'trial'
                    ? new Date(academy.trial_ends_at).toLocaleDateString()
                    : academy.subscription_end
                    ? new Date(academy.subscription_end).toLocaleDateString()
                    : 'N/A'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {getDaysRemaining()} days remaining
                </p>
              </div>
            </div>

            {academy.subscription_plan && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Plan Limits</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Max Students:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {academy.subscription_plan.max_students === 999999
                        ? 'Unlimited'
                        : academy.subscription_plan.max_students}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Branches:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {academy.subscription_plan.max_branches}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(academy.subscription_status === 'trial' || academy.subscription_status === 'expired') && (
            <div className="ml-6">
              <button
                onClick={() => setShowPaymentForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Choose Plan
              </button>
            </div>
          )}
        </div>

        {academy.subscription_status === 'pending_payment' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Payment Under Review</h4>
              <p className="text-sm text-yellow-800">
                Your payment is currently being reviewed. You will be notified once it's approved and your subscription is activated.
              </p>
            </div>
          </div>
        )}
      </div>

      {!showPaymentForm && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>

          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-md transition ${
                  billingPeriod === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-md transition ${
                  billingPeriod === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Yearly <span className="text-sm ml-1">(Save 17%)</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`border-2 rounded-lg p-6 ${
                  plan.name === 'Professional'
                    ? 'border-blue-600 relative'
                    : 'border-gray-200'
                }`}
              >
                {plan.name === 'Professional' && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4 h-12">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${billingPeriod === 'monthly' ? plan.price_monthly : (plan.price_yearly / 12).toFixed(2)}
                  </span>
                  <span className="text-gray-600">/month</span>
                  {billingPeriod === 'yearly' && (
                    <p className="text-sm text-gray-500 mt-1">
                      Billed ${plan.price_yearly} annually
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.name === 'Professional'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Select Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPaymentForm && selectedPlan && bankDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete Payment</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Bank Transfer Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank Name:</span>
                    <span className="font-medium text-gray-900">{bankDetails.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Name:</span>
                    <span className="font-medium text-gray-900">{bankDetails.account_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IBAN:</span>
                    <span className="font-medium text-gray-900 font-mono">{bankDetails.iban}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SWIFT:</span>
                    <span className="font-medium text-gray-900 font-mono">{bankDetails.swift}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Payment Amount</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      {plans.find(p => p.id === selectedPlan)?.name} - {billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'}
                    </span>
                    <span className="text-2xl font-bold text-gray-900">
                      ${billingPeriod === 'monthly'
                        ? plans.find(p => p.id === selectedPlan)?.price_monthly
                        : plans.find(p => p.id === selectedPlan)?.price_yearly}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Payment Screenshot
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitPayment}
                  disabled={!paymentScreenshot || uploading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Submitting...' : 'Submit Payment'}
                </button>
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setSelectedPlan(null);
                    setPaymentScreenshot(null);
                    setNotes('');
                  }}
                  disabled={uploading}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
