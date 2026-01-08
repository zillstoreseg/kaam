import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';
import { logAudit, AuditActions, AuditEntityTypes } from '../lib/auditLogger';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: string, branchId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  isPlatformOwner: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        try {
          await logAudit('unauthenticated', {
            action: AuditActions.FAILED_LOGIN,
            entityType: AuditEntityTypes.AUTH,
            summaryKey: 'audit.auth.failed_login',
            summaryParams: { email },
            metadata: { reason: error.message }
          });
        } catch (logError) {
          console.error('Failed to log failed login:', logError);
        }
        return { error };
      }

      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, branch_id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileData) {
          try {
            await logAudit(profileData.role, {
              action: AuditActions.LOGIN,
              entityType: AuditEntityTypes.AUTH,
              entityId: data.user.id,
              summaryKey: 'audit.auth.login',
              summaryParams: { email: data.user.email },
              branchId: profileData.branch_id,
              metadata: { email: data.user.email }
            });
          } catch (logError) {
            console.error('Failed to log login:', logError);
          }
        }
      }

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signUp(email: string, password: string, fullName: string, role: string, branchId?: string) {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) return { error: signUpError };
      if (!data.user) return { error: new Error('User creation failed') };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            full_name: fullName,
            role,
            branch_id: branchId || null,
          },
        ]);

      if (profileError) return { error: profileError };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    if (user && profile) {
      try {
        await logAudit(profile.role, {
          action: AuditActions.LOGOUT,
          entityType: AuditEntityTypes.AUTH,
          entityId: user.id,
          summaryKey: 'audit.auth.logout',
          summaryParams: { email: user.email },
          branchId: profile.branch_id,
          metadata: { email: user.email }
        });
      } catch (logError) {
        console.error('Failed to log logout:', logError);
      }
    }
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  function isPlatformOwner() {
    return profile?.role === 'platform_owner';
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        isPlatformOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
