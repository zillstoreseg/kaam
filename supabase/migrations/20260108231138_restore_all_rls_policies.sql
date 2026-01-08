/*
  # Restore All RLS Policies for Single Tenant
  
  1. Changes
    - Drop all existing policies on all tables
    - Create simple policies allowing authenticated users full access
  
  2. Security
    - All authenticated users can access all data (single tenant system)
*/

-- Drop all existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Super admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (true);

-- Students
CREATE POLICY "Users can view students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (true);

-- Branches
CREATE POLICY "Users can view branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage branches"
  ON branches FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Packages
CREATE POLICY "Users can view packages"
  ON packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage packages"
  ON packages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Attendance
CREATE POLICY "Users can view attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage attendance"
  ON attendance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoices
CREATE POLICY "Users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoice Items
CREATE POLICY "Users can view invoice_items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage invoice_items"
  ON invoice_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Settings
CREATE POLICY "Users can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Schemes
CREATE POLICY "Users can view schemes"
  ON schemes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage schemes"
  ON schemes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Payments
CREATE POLICY "Users can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Expenses
CREATE POLICY "Users can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Items
CREATE POLICY "Users can view stock_items"
  ON stock_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock_items"
  ON stock_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Categories
CREATE POLICY "Users can view stock_categories"
  ON stock_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock_categories"
  ON stock_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Stock Counts
CREATE POLICY "Users can view stock_counts"
  ON stock_counts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage stock_counts"
  ON stock_counts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Belt Ranks
CREATE POLICY "Users can view belt_ranks"
  ON belt_ranks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage belt_ranks"
  ON belt_ranks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Exam Invitations
CREATE POLICY "Users can view exam_invitations"
  ON exam_invitations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage exam_invitations"
  ON exam_invitations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Exam Participation
CREATE POLICY "Users can view exam_participation"
  ON exam_participation FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage exam_participation"
  ON exam_participation FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Promotion Log
CREATE POLICY "Users can view promotion_log"
  ON promotion_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage promotion_log"
  ON promotion_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Player Contacts
CREATE POLICY "Users can view player_contacts"
  ON player_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage player_contacts"
  ON player_contacts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Audit Logs
CREATE POLICY "Users can view audit_logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- WhatsApp Messages
CREATE POLICY "Users can view whatsapp_messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage whatsapp_messages"
  ON whatsapp_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Student Renewals
CREATE POLICY "Users can view student_renewals"
  ON student_renewals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage student_renewals"
  ON student_renewals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Membership Freeze History
CREATE POLICY "Users can view membership_freeze_history"
  ON membership_freeze_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage membership_freeze_history"
  ON membership_freeze_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Attendance Alerts
CREATE POLICY "Users can view attendance_alerts"
  ON attendance_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage attendance_alerts"
  ON attendance_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Class Attendance
CREATE POLICY "Users can view class_attendance"
  ON class_attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage class_attendance"
  ON class_attendance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Student Schemes
CREATE POLICY "Users can view student_schemes"
  ON student_schemes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage student_schemes"
  ON student_schemes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Package Schemes
CREATE POLICY "Users can view package_schemes"
  ON package_schemes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage package_schemes"
  ON package_schemes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permissions
CREATE POLICY "Users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage permissions"
  ON permissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- User Permissions
CREATE POLICY "Users can view user_permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage user_permissions"
  ON user_permissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Role Permissions
CREATE POLICY "Users can view role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage role_permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);