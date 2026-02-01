import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TenantConfig {
  academy_id: string;
  name: string;
  domain: string;
  status: string;
  subscription_status: string;
  expires_at: string | null;
  plan: {
    id: string;
    name: string;
    price_monthly: number;
    description: string;
  } | null;
  features: string[];
}

interface TenantContextType {
  tenant: TenantConfig | null;
  loading: boolean;
  hasFeature: (featureKey: string) => boolean;
  loadTenantConfig: (domain: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTenantConfig = async (domain: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_tenant_config_by_domain', {
        domain_param: domain
      });

      if (error) {
        if (error.message?.includes('function') || error.code === '42883') {
          console.warn('Multi-tenant features not available');
          setTenant(null);
        } else {
          console.error('Error loading tenant config:', error);
          setTenant(null);
        }
      } else if (data) {
        setTenant(data as TenantConfig);
      } else {
        setTenant(null);
      }
    } catch (error) {
      console.error('Error in loadTenantConfig:', error);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (featureKey: string): boolean => {
    if (!tenant) return true;
    return tenant.features.includes(featureKey);
  };

  useEffect(() => {
    const domain = window.location.hostname;
    if (domain && domain !== 'localhost') {
      loadTenantConfig(domain);
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, hasFeature, loadTenantConfig }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
