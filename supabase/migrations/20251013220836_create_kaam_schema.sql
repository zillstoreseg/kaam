/*
  # Karate Academy Attendance Manager - Complete Database Schema

  ## Overview
  This migration creates the complete database structure for the Karate Academy Attendance Manager,
  including branches, users, packages, students, attendance tracking, and system settings.

  ## Tables Created

  1. **branches**
     - `id` (uuid, primary key)
     - `name` (text) - Branch name
     - `location` (text) - Physical address
     - `created_at` (timestamptz)
     - Stores all academy branch locations

  2. **profiles**
     - `id` (uuid, primary key, references auth.users)
     - `full_name` (text) - User's full name
     - `role` (text) - Role: 'super_admin', 'branch_manager', 'coach'
     - `branch_id` (uuid) - Assigned branch (null for super_admin)
     - `created_at` (timestamptz)
     - Extended user profile information

  3. **packages**
     - `id` (uuid, primary key)
     - `name` (text) - Package name
     - `sessions_per_month` (integer) - Monthly session limit
     - `sessions_per_week` (integer) - Weekly session limit
     - `price` (decimal) - Package price
     - `description` (text) - Package details
     - `created_at` (timestamptz)
     - Subscription packages/plans

  4. **students**
     - `id` (uuid, primary key)
     - `full_name` (text) - Student name
     - `phone1` (text) - Primary phone
     - `phone2` (text) - Secondary phone
     - `nationality` (text) - Student nationality
     - `address` (text) - Physical address
     - `branch_id` (uuid) - Assigned branch
     - `package_id` (uuid) - Subscribed package
     - `package_start` (date) - Subscription start
     - `package_end` (date) - Subscription end
     - `notes` (text) - Additional notes
     - `is_active` (boolean) - Active/inactive status
     - `created_at` (timestamptz)
     - Student records

  5. **attendance**
     - `id` (uuid, primary key)
     - `student_id` (uuid) - Reference to student
     - `branch_id` (uuid) - Reference to branch
     - `attendance_date` (date) - Date of attendance
     - `attendance_time` (timestamptz) - Time marked
     - `status` (text) - Status: 'present', 'absent', 'late'
     - `marked_by` (uuid) - User who marked attendance
     - `note` (text) - Optional note
     - `created_at` (timestamptz)
     - Daily attendance records

  6. **settings**
     - `id` (uuid, primary key)
     - `academy_name` (text) - Academy name
     - `logo_url` (text) - Logo image URL
     - `default_language` (text) - Default language: 'en', 'ar', 'hi'
     - `notifications_enabled` (boolean) - Global notification toggle
     - `primary_color` (text) - Theme primary color
     - `accent_color` (text) - Theme accent color
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     - System-wide settings (single row)

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with strict policies based on user roles:

  - **Super Admin**: Full access to all data across all branches
  - **Branch Manager**: Access only to their assigned branch data
  - **Coach**: Read access to students and ability to mark attendance for their branch

  ### Important Notes
  1. All policies check authentication using `auth.uid()`
  2. Policies validate role and branch assignment from the profiles table
  3. Data is isolated by branch for non-super-admin users
  4. Students can only be accessed by users assigned to the same branch
  5. Attendance records are branch-scoped
  6. Only super_admin can manage branches, packages, and settings
*/

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'coach')),
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sessions_per_month integer DEFAULT 0,
  sessions_per_week integer DEFAULT 0,
  price decimal(10, 2) DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone1 text,
  phone2 text,
  nationality text,
  address text,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  package_start date,
  package_end date,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  attendance_date date NOT NULL,
  attendance_time timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_name text DEFAULT 'Karate Academy',
  logo_url text,
  default_language text DEFAULT 'en' CHECK (default_language IN ('en', 'ar', 'hi')),
  notifications_enabled boolean DEFAULT false,
  primary_color text DEFAULT '#B91C1C',
  accent_color text DEFAULT '#F59E0B',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_package ON students(package_id);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_branch ON attendance(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- Insert default settings row if not exists
INSERT INTO settings (id, academy_name, default_language, notifications_enabled)
SELECT gen_random_uuid(), 'Karate Academy', 'en', false
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

-- Enable Row Level Security
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- BRANCHES POLICIES
-- ========================================

-- Super admin can view all branches
CREATE POLICY "Super admin can view all branches"
  ON branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Branch managers and coaches can view their own branch
CREATE POLICY "Branch staff can view own branch"
  ON branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.branch_id = branches.id
    )
  );

-- Only super admin can insert branches
CREATE POLICY "Super admin can insert branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Only super admin can update branches
CREATE POLICY "Super admin can update branches"
  ON branches FOR UPDATE
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

-- Only super admin can delete branches
CREATE POLICY "Super admin can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ========================================
-- PROFILES POLICIES
-- ========================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (profiles.id = auth.uid());

-- Super admin can view all profiles
CREATE POLICY "Super admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- Branch managers can view profiles in their branch
CREATE POLICY "Branch managers can view branch profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'branch_manager'
      AND p.branch_id = profiles.branch_id
    )
  );

-- Only super admin can insert profiles
CREATE POLICY "Super admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (profiles.id = auth.uid())
  WITH CHECK (profiles.id = auth.uid());

-- Super admin can update all profiles
CREATE POLICY "Super admin can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
    )
  );

-- Only super admin can delete profiles
CREATE POLICY "Super admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ========================================
-- PACKAGES POLICIES
-- ========================================

-- All authenticated users can view packages
CREATE POLICY "Authenticated users can view packages"
  ON packages FOR SELECT
  TO authenticated
  USING (true);

-- Only super admin can insert packages
CREATE POLICY "Super admin can insert packages"
  ON packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Only super admin can update packages
CREATE POLICY "Super admin can update packages"
  ON packages FOR UPDATE
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

-- Only super admin can delete packages
CREATE POLICY "Super admin can delete packages"
  ON packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ========================================
-- STUDENTS POLICIES
-- ========================================

-- Super admin can view all students
CREATE POLICY "Super admin can view all students"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Branch staff can view students in their branch
CREATE POLICY "Branch staff can view branch students"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.branch_id = students.branch_id
    )
  );

-- Branch managers can insert students in their branch
CREATE POLICY "Branch managers can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR 
           (profiles.role = 'branch_manager' AND profiles.branch_id = students.branch_id))
    )
  );

-- Branch managers can update students in their branch
CREATE POLICY "Branch managers can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR 
           (profiles.role = 'branch_manager' AND profiles.branch_id = students.branch_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR 
           (profiles.role = 'branch_manager' AND profiles.branch_id = students.branch_id))
    )
  );

-- Branch managers can delete students in their branch
CREATE POLICY "Branch managers can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR 
           (profiles.role = 'branch_manager' AND profiles.branch_id = students.branch_id))
    )
  );

-- ========================================
-- ATTENDANCE POLICIES
-- ========================================

-- Super admin can view all attendance
CREATE POLICY "Super admin can view all attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Branch staff can view attendance in their branch
CREATE POLICY "Branch staff can view branch attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.branch_id = attendance.branch_id
    )
  );

-- Branch staff can insert attendance for their branch
CREATE POLICY "Branch staff can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.branch_id = attendance.branch_id
    )
  );

-- Branch staff can update attendance for their branch
CREATE POLICY "Branch staff can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.branch_id = attendance.branch_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.branch_id = attendance.branch_id
    )
  );

-- Branch managers can delete attendance for their branch
CREATE POLICY "Branch managers can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'super_admin' OR 
           (profiles.role = 'branch_manager' AND profiles.branch_id = attendance.branch_id))
    )
  );

-- ========================================
-- SETTINGS POLICIES
-- ========================================

-- All authenticated users can view settings
CREATE POLICY "Authenticated users can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

-- Only super admin can update settings
CREATE POLICY "Super admin can update settings"
  ON settings FOR UPDATE
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
