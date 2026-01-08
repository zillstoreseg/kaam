import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'platform_owner' | 'tenant_admin' | 'super_admin' | 'branch_manager' | 'coach' | 'accountant' | 'stock_manager';
export type PageName = 'dashboard' | 'students' | 'attendance' | 'packages' | 'schemes' | 'branches' | 'stock' | 'sales' | 'invoices' | 'reports' | 'users' | 'settings';
export type TenantStatus = 'active' | 'suspended' | 'trial';
export type SubscriptionPlan = 'single' | 'multi' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired';
export type ModuleKey = 'students' | 'attendance' | 'exams' | 'inactive_alerts' | 'whatsapp_templates' | 'settings' | 'multi_branch' | 'expenses' | 'expense_analytics' | 'email_digests' | 'security_suite';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: TenantStatus;
  created_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: SubscriptionPlan;
  starts_at: string;
  renews_at: string;
  status: SubscriptionStatus;
  grace_days: number;
  module_overrides: Record<string, boolean>;
  created_at: string;
}

export interface ImpersonationSession {
  id: string;
  admin_user_id: string;
  tenant_id: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  tenant_id: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  page: PageName;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  manager_id: string | null;
  created_at: string;
}

export interface Package {
  id: string;
  name: string;
  sessions_per_month: number;
  sessions_per_week: number;
  price: number;
  description: string;
  currency: string;
  created_at: string;
}

export interface Scheme {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  phone1: string;
  phone2: string;
  nationality: string;
  address: string;
  branch_id: string;
  package_id: string;
  package_start: string;
  package_end: string;
  notes: string;
  is_active: boolean;
  photo_url: string | null;
  trial_student: boolean;
  whatsapp_number: string;
  joined_date: string;
  freeze_start_date: string | null;
  freeze_end_date: string | null;
  freeze_reason: string | null;
  is_frozen: boolean;
  belt_key: string | null;
  belt_order: number | null;
  has_chronic_condition: boolean;
  condition_details: string | null;
  current_treatment: string | null;
  gender: string | null;
  email: string | null;
  birthdate: string | null;
  referral_source: string | null;
  referred_by_student_id: string | null;
  scheme_id: string | null;
  created_at: string;
}

export interface MembershipFreezeHistory {
  id: string;
  student_id: string;
  freeze_start: string;
  freeze_end: string;
  freeze_reason: string | null;
  frozen_by: string;
  unfrozen_at: string | null;
  unfrozen_by: string | null;
  created_at: string;
}

export interface AttendanceAlert {
  id: string;
  student_id: string;
  attendance_id: string;
  alert_type: string;
  alert_message: string;
  week_start_date: string;
  session_count: number;
  session_limit: number;
  is_resolved: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  package_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  notes: string;
  created_by: string;
  branch_id: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  branch_id: string;
  attendance_date: string;
  attendance_time: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
  note: string;
  created_at: string;
}

export interface Settings {
  id: string;
  academy_name: string;
  logo_url: string;
  default_language: 'en' | 'ar' | 'hi';
  notifications_enabled: boolean;
  primary_color: string;
  accent_color: string;
  currency_symbol: string;
  company_address: string | null;
  company_city: string | null;
  company_country: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_website: string | null;
  tax_registration_number: string | null;
  company_slogan: string | null;
  message_template_expired: string | null;
  message_template_registration: string | null;
  message_template_renewal: string | null;
  message_template_invoice: string | null;
  invoice_footer_text: string | null;
  auto_send_expired_message: boolean;
  expired_message_days_interval: number;
  enable_data_reset: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted_by: string | null;
  created_at: string;
}

export interface StockCategory {
  id: string;
  name: string;
  description: string;
  scheme_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StockItem {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  sku: string | null;
  price: number;
  cost: number;
  quantity: number;
  min_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  branch_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'installment';
  payment_status: 'paid' | 'pending' | 'partial';
  amount_paid: number;
  sold_by: string;
  notes: string | null;
  invoice_date: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  stock_item_id: string | null;
  item_name: string;
  item_description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface BeltRank {
  id: string;
  belt_key: string;
  belt_name: string;
  belt_order: number;
  color: string;
  created_at: string;
}

export interface ExamParticipation {
  id: string;
  exam_invitation_id: string;
  student_id: string;
  branch_id: string;
  attended: boolean;
  result: 'pass' | 'fail' | null;
  previous_belt_key: string | null;
  previous_belt_order: number | null;
  promoted_to_belt_key: string | null;
  promoted_to_belt_order: number | null;
  notes: string | null;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface PromotionLog {
  id: string;
  student_id: string;
  exam_participation_id: string | null;
  from_belt_key: string;
  from_belt_order: number;
  to_belt_key: string;
  to_belt_order: number;
  promotion_date: string;
  promoted_by: string;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_date: string;
  branch_id: string;
  category: 'rent' | 'salaries' | 'utilities' | 'equipment' | 'maintenance' | 'marketing' | 'other';
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer';
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// SaaS Plan Features
export const PLAN_FEATURES: Record<SubscriptionPlan, ModuleKey[]> = {
  single: ['students', 'attendance', 'exams', 'inactive_alerts', 'whatsapp_templates', 'settings'],
  multi: ['students', 'attendance', 'exams', 'inactive_alerts', 'whatsapp_templates', 'settings', 'multi_branch', 'expenses', 'expense_analytics', 'email_digests'],
  enterprise: ['students', 'attendance', 'exams', 'inactive_alerts', 'whatsapp_templates', 'settings', 'multi_branch', 'expenses', 'expense_analytics', 'email_digests', 'security_suite']
};

// Check if feature is enabled for current subscription
export function isFeatureEnabled(
  subscription: Subscription | null,
  featureKey: ModuleKey
): boolean {
  if (!subscription) return false;

  // Check subscription status
  const renewDate = new Date(subscription.renews_at);
  const graceEndDate = new Date(renewDate);
  graceEndDate.setDate(graceEndDate.getDate() + subscription.grace_days);

  if (subscription.status !== 'active' || graceEndDate < new Date()) {
    return false;
  }

  // Get plan features
  const planFeatures = PLAN_FEATURES[subscription.plan] || [];

  // Check if feature is in plan
  const inPlan = planFeatures.includes(featureKey);

  // Check for overrides
  if (subscription.module_overrides[featureKey] !== undefined) {
    return subscription.module_overrides[featureKey];
  }

  return inPlan;
}

// Get days until renewal
export function getDaysUntilRenewal(subscription: Subscription | null): number {
  if (!subscription) return 0;

  const renewDate = new Date(subscription.renews_at);
  const today = new Date();
  const diffTime = renewDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

// Check if subscription is expired
export function isSubscriptionExpired(subscription: Subscription | null): boolean {
  if (!subscription) return true;

  const renewDate = new Date(subscription.renews_at);
  const graceEndDate = new Date(renewDate);
  graceEndDate.setDate(graceEndDate.getDate() + subscription.grace_days);

  return subscription.status !== 'active' || graceEndDate < new Date();
}
