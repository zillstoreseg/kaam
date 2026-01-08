import { useAuth } from '../contexts/AuthContext';
import { getDaysUntilRenewal } from '../lib/supabase';
import { Calendar, AlertTriangle, CheckCircle, Crown } from 'lucide-react';

export default function SubscriptionBadge() {
  const { subscription, tenant, isPlatformOwner } = useAuth();

  // Don't show for platform owners without impersonation
  if (isPlatformOwner() && !tenant) {
    return null;
  }

  if (!subscription || !tenant) {
    return null;
  }

  const daysLeft = getDaysUntilRenewal(subscription);
  const isExpiring = daysLeft <= 7 && daysLeft >= 0;
  const isExpired = daysLeft < 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-600">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Your Subscription</h3>
        </div>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
          {subscription.plan} Plan
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          {isExpired ? (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Expired
            </span>
          ) : isExpiring ? (
            <span className="flex items-center gap-1 text-yellow-600 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Expiring Soon
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle className="h-4 w-4" />
              Active
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Days Remaining:</span>
          <span className={`font-medium ${
            isExpired ? 'text-red-600' : isExpiring ? 'text-yellow-600' : 'text-gray-900'
          }`}>
            {isExpired ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days`}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Renewal Date:</span>
          <span className="font-medium text-gray-900 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(subscription.renews_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {(isExpiring || isExpired) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">
            {isExpired
              ? 'Your subscription has expired. Please contact support to renew.'
              : 'Your subscription is expiring soon. Please renew to avoid interruption.'}
          </p>
        </div>
      )}
    </div>
  );
}
