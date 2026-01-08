import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  created_at: string;
}

interface Subscription {
  id: string;
  tenant_id: string;
  plan: 'single' | 'multi' | 'enterprise';
  starts_at: string;
  renews_at: string;
  status: 'active' | 'expired';
  grace_days: number;
  created_at: string;
}

interface ImpersonationSession {
  id: string;
  admin_user_id: string;
  tenant_id: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  subscription: Subscription | null;
  impersonationSession: ImpersonationSession | null;
  isImpersonating: boolean;
  isPlatformOwner: boolean;
  isLoading: boolean;
  error: string | null;
  startImpersonation: (tenantId: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPlatformOwner = profile?.role === 'platform_owner' || profile?.role === 'platform_admin';
  const isImpersonating = impersonationSession !== null && !impersonationSession.revoked;

  const loadTenant = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check for active impersonation session
      const { data: impersonationData } = await supabase
        .from('impersonation_sessions')
        .select('*')
        .eq('admin_user_id', user.id)
        .eq('revoked', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setImpersonationSession(impersonationData);

      // Determine which tenant to load
      let tenantId: string | null = null;

      if (impersonationData) {
        // Load impersonated tenant
        tenantId = impersonationData.tenant_id;
      } else if (profile?.tenant_id) {
        // Load user's own tenant
        tenantId = profile.tenant_id;
      } else if (isPlatformOwner) {
        // Platform owner without impersonation - no specific tenant
        setCurrentTenant(null);
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      if (tenantId) {
        // Load tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (tenantError) throw tenantError;
        setCurrentTenant(tenantData);

        // Load subscription
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError) throw subError;
        setSubscription(subData);
      }
    } catch (err: any) {
      console.error('Error loading tenant:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startImpersonation = async (tenantId: string) => {
    if (!isPlatformOwner) {
      throw new Error('Only platform owners can impersonate');
    }

    try {
      const { data, error } = await supabase
        .from('impersonation_sessions')
        .insert({
          admin_user_id: user!.id,
          tenant_id: tenantId,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
        })
        .select()
        .single();

      if (error) throw error;

      // Reload tenant context
      await loadTenant();
    } catch (err: any) {
      console.error('Error starting impersonation:', err);
      throw err;
    }
  };

  const exitImpersonation = async () => {
    if (!impersonationSession) return;

    try {
      const { error } = await supabase
        .from('impersonation_sessions')
        .update({ revoked: true })
        .eq('id', impersonationSession.id);

      if (error) throw error;

      // Reload tenant context
      await loadTenant();
    } catch (err: any) {
      console.error('Error exiting impersonation:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadTenant();
  }, [user, profile]);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        subscription,
        impersonationSession,
        isImpersonating,
        isPlatformOwner,
        isLoading,
        error,
        startImpersonation,
        exitImpersonation,
        refreshTenant: loadTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
