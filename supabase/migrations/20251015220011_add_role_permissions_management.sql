/*
  # Role Permissions Management System

  1. New Tables
    - `role_permissions`
      - `id` (uuid, primary key)
      - `role` (text) - The role name (super_admin, branch_manager, coach, etc.)
      - `page` (text) - The page/section identifier (dashboard, students, attendance, etc.)
      - `can_view` (boolean) - Whether role can view this page
      - `can_create` (boolean) - Whether role can create records
      - `can_edit` (boolean) - Whether role can edit records
      - `can_delete` (boolean) - Whether role can delete records
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `role_permissions` table
    - Super admins can read/write all permissions
    - Other roles can only read their own role's permissions

  3. Initial Data
    - Set up default permissions for all roles
*/

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  page text NOT NULL,
  can_view boolean DEFAULT true,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, page)
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- All authenticated users can read permissions for their own role
CREATE POLICY "Users can view their role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    role = (
      SELECT profiles.role FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- Insert default permissions for super_admin
INSERT INTO role_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
  ('super_admin', 'dashboard', true, false, false, false),
  ('super_admin', 'students', true, true, true, true),
  ('super_admin', 'attendance', true, true, true, true),
  ('super_admin', 'packages', true, true, true, true),
  ('super_admin', 'schemes', true, true, true, true),
  ('super_admin', 'branches', true, true, true, true),
  ('super_admin', 'stock', true, true, true, true),
  ('super_admin', 'sales', true, true, true, true),
  ('super_admin', 'invoices', true, true, true, true),
  ('super_admin', 'reports', true, true, false, false),
  ('super_admin', 'users', true, true, true, true),
  ('super_admin', 'settings', true, false, true, false)
ON CONFLICT (role, page) DO NOTHING;

-- Insert default permissions for branch_manager
INSERT INTO role_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
  ('branch_manager', 'dashboard', true, false, false, false),
  ('branch_manager', 'students', true, true, true, true),
  ('branch_manager', 'attendance', true, true, true, true),
  ('branch_manager', 'packages', true, false, false, false),
  ('branch_manager', 'schemes', true, false, false, false),
  ('branch_manager', 'branches', false, false, false, false),
  ('branch_manager', 'stock', false, false, false, false),
  ('branch_manager', 'sales', true, true, false, false),
  ('branch_manager', 'invoices', true, false, false, false),
  ('branch_manager', 'reports', true, true, false, false),
  ('branch_manager', 'users', true, true, true, false),
  ('branch_manager', 'settings', false, false, false, false)
ON CONFLICT (role, page) DO NOTHING;

-- Insert default permissions for coach
INSERT INTO role_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
  ('coach', 'dashboard', true, false, false, false),
  ('coach', 'students', true, false, true, false),
  ('coach', 'attendance', true, true, true, false),
  ('coach', 'packages', true, false, false, false),
  ('coach', 'schemes', true, false, false, false),
  ('coach', 'branches', false, false, false, false),
  ('coach', 'stock', false, false, false, false),
  ('coach', 'sales', false, false, false, false),
  ('coach', 'invoices', false, false, false, false),
  ('coach', 'reports', false, false, false, false),
  ('coach', 'users', false, false, false, false),
  ('coach', 'settings', false, false, false, false)
ON CONFLICT (role, page) DO NOTHING;

-- Insert default permissions for accountant
INSERT INTO role_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
  ('accountant', 'dashboard', true, false, false, false),
  ('accountant', 'students', true, false, false, false),
  ('accountant', 'attendance', false, false, false, false),
  ('accountant', 'packages', true, false, false, false),
  ('accountant', 'schemes', false, false, false, false),
  ('accountant', 'branches', false, false, false, false),
  ('accountant', 'stock', true, false, false, false),
  ('accountant', 'sales', true, true, true, false),
  ('accountant', 'invoices', true, true, true, true),
  ('accountant', 'reports', true, true, false, false),
  ('accountant', 'users', false, false, false, false),
  ('accountant', 'settings', false, false, false, false)
ON CONFLICT (role, page) DO NOTHING;

-- Insert default permissions for stock_manager
INSERT INTO role_permissions (role, page, can_view, can_create, can_edit, can_delete) VALUES
  ('stock_manager', 'dashboard', true, false, false, false),
  ('stock_manager', 'students', true, false, false, false),
  ('stock_manager', 'attendance', false, false, false, false),
  ('stock_manager', 'packages', false, false, false, false),
  ('stock_manager', 'schemes', false, false, false, false),
  ('stock_manager', 'branches', false, false, false, false),
  ('stock_manager', 'stock', true, true, true, true),
  ('stock_manager', 'sales', true, true, false, false),
  ('stock_manager', 'invoices', true, false, false, false),
  ('stock_manager', 'reports', true, true, false, false),
  ('stock_manager', 'users', false, false, false, false),
  ('stock_manager', 'settings', false, false, false, false)
ON CONFLICT (role, page) DO NOTHING;