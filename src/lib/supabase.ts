import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'super_admin' | 'branch_manager' | 'coach' | 'accountant' | 'stock_manager';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  created_at: string;
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
