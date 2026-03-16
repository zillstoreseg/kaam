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
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      const { data: platformRole } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (platformRole?.role === 'owner' || platformRole?.role === 'super_owner') {
        setIsOwner(true);
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileData?.role === 'platform_owner') {
        setIsOwner(true);
        setLoading(false);
        return;
      }

      setIsOwner(false);
    } catch (error) {
      console.error('Error in checkPlatformRole:', error);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPlatformRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPlatformRole();
    });

    return () => subscription.unsubscribe();
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
