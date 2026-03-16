import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const LIMITS_KEY = 'dojo_plan_limits';

interface StoredPlanLimits {
  max_students: number;
  max_branches: number;
  is_trial: boolean;
  trial_days: number;
  price_yearly: number;
  is_popular: boolean;
  display_order: number;
  is_visible: boolean;
  currency: string;
}

function getStoredLimits(): Record<string, StoredPlanLimits> {
  try {
    return JSON.parse(localStorage.getItem(LIMITS_KEY) || '{}');
  } catch {
    return {};
  }
}

export interface SubscriptionLimits {
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
  plan_id: string | null;
}

const UNLIMITED: SubscriptionLimits = {
  max_students: 0,
  max_branches: 0,
  current_students: 0,
  current_branches: 0,
  can_add_students: true,
  can_add_branches: true,
  is_trial: false,
  is_expired: false,
  is_active: true,
  days_remaining: 9999,
  plan_name: 'Unlimited',
  plan_id: null,
};

export function useSubscriptionLimits() {
  const { profile } = useAuth();
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLimits = useCallback(async () => {
    if (!profile) {
      setLimits(UNLIMITED);
      setLoading(false);
      return;
    }

    if (!profile.academy_id) {
      setLimits(UNLIMITED);
      setLoading(false);
      return;
    }

    try {
      const { data: academy, error: academyError } = await supabase
        .from('academies')
        .select('*, plan:plans(id, name, price_monthly)')
        .eq('id', profile.academy_id)
        .maybeSingle();

      if (academyError || !academy) {
        setLimits(UNLIMITED);
        setLoading(false);
        return;
      }

      const [{ count: studentCount }, { count: branchCount }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('branches').select('*', { count: 'exact', head: true }),
      ]);

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

      const planId = (academy.plan as any)?.id || null;
      const planName = (academy.plan as any)?.name || 'No Plan';

      const storedLimits = getStoredLimits();
      const planLimits = planId ? storedLimits[planId] : null;

      const maxStudents = planLimits?.max_students ?? 0;
      const maxBranches = planLimits?.max_branches ?? 0;

      const canAddStudents = isActive && (maxStudents === 0 || currentStudents < maxStudents);
      const canAddBranches = isActive && (maxBranches === 0 || currentBranches < maxBranches);

      setLimits({
        max_students: maxStudents,
        max_branches: maxBranches,
        current_students: currentStudents,
        current_branches: currentBranches,
        can_add_students: canAddStudents,
        can_add_branches: canAddBranches,
        is_trial: isTrial,
        is_expired: isExpired,
        is_active: isActive,
        days_remaining: Math.max(0, daysRemaining),
        plan_name: planName,
        plan_id: planId,
      });
    } catch (error) {
      console.error('Error loading subscription limits:', error);
      setLimits(UNLIMITED);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  return { limits, loading, refresh: loadLimits };
}
