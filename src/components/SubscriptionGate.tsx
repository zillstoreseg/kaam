import React, { useEffect, useState } from 'react';
import { AlertTriangle, Mail, Phone, MessageCircle } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { supabase } from '../lib/supabase';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { currentTenant, subscription, isPlatformOwner, isLoading } = useTenant();
  const [supportInfo, setSupportInfo] = useState({
    email: 'support@example.com',
    phone: '',
    whatsapp: '',
  });

  useEffect(() => {
    loadSupportInfo();
  }, []);

  const loadSupportInfo = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('support_email, support_phone, support_whatsapp')
        .limit(1)
        .maybeSingle();

      if (data) {
        setSupportInfo({
          email: data.support_email || 'support@example.com',
          phone: data.support_phone || '',
          whatsapp: data.support_whatsapp || '',
        });
      }
    } catch (err) {
      console.error('Error loading support info:', err);
    }
  };

  const SupportContactButton = () => (
    <div className="mt-6 space-y-2">
      {supportInfo.whatsapp && (
        <a
          href={`https://wa.me/${supportInfo.whatsapp.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <MessageCircle className="h-5 w-5" />
          <span>Contact via WhatsApp</span>
        </a>
      )}
      {supportInfo.email && (
        <a
          href={`mailto:${supportInfo.email}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Mail className="h-5 w-5" />
          <span>Email Support</span>
        </a>
      )}
      {supportInfo.phone && (
        <a
          href={`tel:${supportInfo.phone}`}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          <Phone className="h-5 w-5" />
          <span>Call {supportInfo.phone}</span>
        </a>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isPlatformOwner) {
    return <>{children}</>;
  }

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Academy Not Found</h1>
          <p className="text-gray-600 mb-6">
            The academy you're trying to access could not be found. Please check the URL and try again.
          </p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact support.
          </p>
          <SupportContactButton />
        </div>
      </div>
    );
  }

  if (currentTenant.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-gray-600 mb-6">
            Your academy account has been suspended. Please contact support to resolve this issue.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Academy:</span> {currentTenant.name}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-semibold">Status:</span> Suspended
            </p>
          </div>
          <SupportContactButton />
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Active Subscription</h1>
          <p className="text-gray-600 mb-6">
            Your academy does not have an active subscription. Please contact support to activate your subscription.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Academy:</span> {currentTenant.name}
            </p>
          </div>
          <SupportContactButton />
        </div>
      </div>
    );
  }

  const renewalDate = new Date(subscription.renews_at);
  const gracePeriodEnd = new Date(renewalDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + subscription.grace_days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (subscription.status === 'expired' || gracePeriodEnd < today) {
    const daysOverdue = Math.floor((today.getTime() - gracePeriodEnd.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Expired</h1>
          <p className="text-gray-600 mb-6">
            Your subscription has expired. Please renew your subscription to continue using the system.
          </p>
          <div className="bg-red-50 rounded-lg p-4 text-left space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Academy:</span> {currentTenant.name}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Plan:</span> {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Renewal Date:</span> {renewalDate.toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Grace Period End:</span> {gracePeriodEnd.toLocaleDateString()}
            </p>
            <p className="text-sm text-red-700 font-semibold">
              Days Overdue: {daysOverdue}
            </p>
          </div>
          <SupportContactButton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
