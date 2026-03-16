import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock, CreditCard } from 'lucide-react';
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits';

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { limits, loading } = useSubscriptionLimits();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (limits?.is_expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {limits.is_trial ? 'Trial Period Ended' : 'Subscription Expired'}
            </h1>

            <p className="text-lg text-gray-600 mb-6">
              {limits.is_trial
                ? 'Your 14-day free trial has ended. Subscribe to a plan to continue using DOJO CLOUD.'
                : 'Your subscription has expired. Renew your subscription to regain access.'}
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <h3 className="font-semibold text-yellow-900 mb-1">Limited Access</h3>
                  <p className="text-sm text-yellow-800">
                    You can view your data but cannot make changes until you subscribe or renew.
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/dashboard/subscription"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Choose Subscription Plan
            </Link>

            <p className="text-sm text-gray-500 mt-4">
              Questions? Contact support@dojocloud.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!limits?.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Subscription Suspended
            </h1>

            <p className="text-lg text-gray-600 mb-6">
              Your subscription is currently suspended. Please contact support to resolve this issue.
            </p>

            <Link
              to="/dashboard/subscription"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              View Subscription Status
            </Link>

            <p className="text-sm text-gray-500 mt-4">
              Support: support@dojocloud.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
