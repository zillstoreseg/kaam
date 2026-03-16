import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubscriptionLimits } from '../hooks/useSubscriptionLimits';

interface LimitsWarningProps {
  type: 'students' | 'branches';
}

export default function LimitsWarning({ type }: LimitsWarningProps) {
  const { limits } = useSubscriptionLimits();

  if (!limits) return null;

  const isStudents = type === 'students';
  const current = isStudents ? limits.current_students : limits.current_branches;
  const max = isStudents ? limits.max_students : limits.max_branches;
  const percentage = (current / max) * 100;

  if (percentage < 80) return null;

  const isAtLimit = current >= max;
  const isNearLimit = percentage >= 80 && !isAtLimit;

  if (isAtLimit) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">
              {isStudents ? 'Student' : 'Branch'} Limit Reached
            </h3>
            <p className="text-sm text-red-800 mb-3">
              You've reached your plan limit of {max} {isStudents ? 'students' : 'branches'}.
              Upgrade your plan to add more.
            </p>
            <Link
              to="/dashboard/subscription"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isNearLimit) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-1">
              Approaching {isStudents ? 'Student' : 'Branch'} Limit
            </h3>
            <p className="text-sm text-yellow-800 mb-2">
              You're using {current} of {max} {isStudents ? 'students' : 'branches'} ({percentage.toFixed(0)}%).
              Consider upgrading before reaching the limit.
            </p>
            <Link
              to="/dashboard/subscription"
              className="text-sm text-yellow-900 hover:text-yellow-700 font-medium underline"
            >
              View Subscription Plans →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
