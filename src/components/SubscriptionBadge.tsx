import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { supabase } from '../lib/supabase';

export function SubscriptionBadge() {
  const { currentTenant, subscription, isPlatformOwner } = useTenant();
  const [brandDomain, setBrandDomain] = useState('example.com');

  useEffect(() => {
    loadBrandDomain();
  }, []);

  const loadBrandDomain = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('brand_domain')
        .limit(1)
        .maybeSingle();

      if (data?.brand_domain) {
        setBrandDomain(data.brand_domain);
      }
    } catch (err) {
      console.error('Error loading brand domain:', err);
    }
  };

  if (isPlatformOwner) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-semibold text-yellow-900">Platform Owner Mode</p>
            <p className="text-xs text-yellow-700">Full access to all system features</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTenant || !subscription) return null;

  const getDaysUntilRenewal = () => {
    const renewalDate = new Date(subscription.renews_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const graceDaysLeft = subscription.grace_days + diffDays;
      if (graceDaysLeft > 0) {
        return { days: graceDaysLeft, status: 'grace', variant: 'orange' };
      }
      return { days: Math.abs(diffDays), status: 'expired', variant: 'red' };
    }

    if (diffDays <= 7) {
      return { days: diffDays, status: 'expiring', variant: 'yellow' };
    }

    return { days: diffDays, status: 'active', variant: 'green' };
  };

  const renewal = getDaysUntilRenewal();

  const variantStyles = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
  };

  const iconColors = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  const textColors = {
    green: 'text-green-900',
    yellow: 'text-yellow-900',
    orange: 'text-orange-900',
    red: 'text-red-900',
  };

  const icons = {
    active: CheckCircle,
    expiring: AlertTriangle,
    grace: Clock,
    expired: AlertTriangle,
  };

  const Icon = icons[renewal.status];

  return (
    <div className={`border rounded-lg p-3 mb-4 ${variantStyles[renewal.variant]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1">
          <Icon className={`h-5 w-5 ${iconColors[renewal.variant]} mt-0.5`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold ${textColors[renewal.variant]}`}>
                {currentTenant.name}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${variantStyles[renewal.variant]} border`}>
                {subscription.plan}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {currentTenant.subdomain}.{brandDomain}
            </p>
            {renewal.status === 'active' && (
              <p className="text-xs text-gray-600 mt-1">
                Subscription active • Renews in {renewal.days} days
              </p>
            )}
            {renewal.status === 'expiring' && (
              <p className="text-xs text-orange-700 mt-1 font-medium">
                Renews in {renewal.days} days • Contact support to extend
              </p>
            )}
            {renewal.status === 'grace' && (
              <p className="text-xs text-orange-700 mt-1 font-medium">
                Grace period • {renewal.days} days remaining
              </p>
            )}
            {renewal.status === 'expired' && (
              <p className="text-xs text-red-700 mt-1 font-medium">
                Subscription expired • Contact support immediately
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
