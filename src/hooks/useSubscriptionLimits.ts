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
    if (profile?.academy_id) {
      loadLimits();
    }
  }, [profile?.academy_id]);

  const loadLimits = async () => {
    if (!profile?.academy_id) return;

    try {
      const { data: academy } = await supabase
        .from('academies')
        .select(`
          *,
          subscription_plan:subscription_plans(*)
        `)
        .eq('id', profile.academy_id)
        .single();

      if (!academy) return;

      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', profile.academy_id)
        .eq('is_active', true);

      const { count: branchCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', profile.academy_id)
        .eq('is_active', true);

      const maxStudents = academy.subscription_plan?.max_students || 50;
      const maxBranches = academy.subscription_plan?.max_branches || 1;
      const currentStudents = studentCount || 0;
      const currentBranches = branchCount || 0;

      const isTrial = academy.subscription_status === 'trial';
      const endDate = isTrial
        ? new Date(academy.trial_ends_at)
        : new Date(academy.subscription_end);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = daysRemaining < 0;
      const isActive = academy.subscription_status === 'active' || (isTrial && !isExpired);

      setLimits({
        max_students: maxStudents,
        max_branches: maxBranches,
        current_students: currentStudents,
        current_branches: currentBranches,
        can_add_students: currentStudents < maxStudents && isActive,
        can_add_branches: currentBranches < maxBranches && isActive,
        is_trial: isTrial,
        is_expired: isExpired,
        is_active: isActive,
        days_remaining: Math.max(0, daysRemaining),
        plan_name: academy.subscription_plan?.name || 'No Plan',
      });
    } catch (error) {
      console.error('Error loading subscription limits:', error);
    } finally {
      setLoading(false);
    }
  };

  return { limits, loading, refresh: loadLimits };
}
