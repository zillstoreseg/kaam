import React from 'react';
import { useTenant } from '../contexts/TenantContext';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureKey,
  children,
  fallback
}) => {
  const { hasFeature } = useTenant();

  if (!hasFeature(featureKey)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Feature Not Available
          </h3>
          <p className="text-gray-600 max-w-md">
            This feature is not included in your current plan. Please upgrade your subscription to access this feature.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
