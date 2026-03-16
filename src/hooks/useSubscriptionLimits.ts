import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionLimits {
  max_students: number;
  max_branches: number;
  current_students: number;
  current_branches: number;
  can_add_students: boolean;
  can_add_branches: boolean;
  is_trial: boolean;
  is_expired: boolean;
  is_active: boolean;
  days_remaining: number;
  plan_name: string;
}

export function useSubscriptionLimits() {
  const { profile } = useAuth();
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (profile.academy_id) {
      loadLimits();
    } else {
      setLimits({
        max_students: 999999,
        max_branches: 999999,
        current_students: 0,
        current_branches: 0,
        can_add_students: true,
        can_add_branches: true,
        is_trial: false,
        is_expired: false,
        is_active: true,
        days_remaining: 9999,
        plan_name: 'Unlimited',
      });
      setLoading(false);
    }
  }, [profile]);

  const loadLimits = async () => {
    if (!profile?.academy_id) {
      setLoading(false);
      return;
    }

    try {
      const { data: academy } = await supabase
        .from('academies')
        .select('*, plan:plans(name, price_monthly)')
        .eq('id', profile.academy_id)
        .maybeSingle();

      if (!academy) {
        setLimits({
          max_students: 999999,
          max_branches: 999999,
          current_students: 0,
          current_branches: 0,
          can_add_students: true,
          can_add_branches: true,
          is_trial: false,
          is_expired: false,
          is_active: true,
          days_remaining: 9999,
          plan_name: 'No Plan',
        });
        return;
      }

      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: branchCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true });

      const currentStudents = studentCount || 0;
      const currentBranches = branchCount || 0;

      const isTrial = academy.subscription_status === 'trial';
      const expiresAt = academy.expires_at ? new Date(academy.expires_at) : null;
      const now = new Date();
      const daysRemaining = expiresAt
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 9999;
      const isExpired = expiresAt ? daysRemaining < 0 : false;
      const isActive = academy.status === 'active' && !isExpired;

      setLimits({
        max_students: 999999,
        max_branches: 999999,
        current_students: currentStudents,
        current_branches: currentBranches,
        can_add_students: true,
        can_add_branches: true,
        is_trial: isTrial,
        is_expired: isExpired,
        is_active: isActive,
        days_remaining: Math.max(0, daysRemaining),
        plan_name: (academy.plan as any)?.name || 'No Plan',
      });
    } catch (error) {
      console.error('Error loading subscription limits:', error);
      setLimits({
        max_students: 999999,
        max_branches: 999999,
        current_students: 0,
        current_branches: 0,
        can_add_students: true,
        can_add_branches: true,
        is_trial: false,
        is_expired: false,
        is_active: true,
        days_remaining: 9999,
        plan_name: 'No Plan',
      });
    } finally {
      setLoading(false);
    }
  };

  return { limits, loading, refresh: loadLimits };
}
