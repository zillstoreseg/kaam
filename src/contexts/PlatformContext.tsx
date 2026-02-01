import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PlatformContextType {
  isOwner: boolean;
  loading: boolean;
  checkPlatformRole: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPlatformRole = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_my_platform_role');

      if (error) {
        if (error.message?.includes('function') || error.code === '42883') {
          console.warn('Platform owner features not available - SaaS layer not enabled');
          setIsOwner(false);
        } else {
          console.error('Error checking platform role:', error);
          setIsOwner(false);
        }
      } else {
        setIsOwner(data?.role === 'owner' || data?.role === 'super_owner');
      }
    } catch (error) {
      console.error('Error in checkPlatformRole:', error);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPlatformRole();
  }, []);

  return (
    <PlatformContext.Provider value={{ isOwner, loading, checkPlatformRole }}>
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};
