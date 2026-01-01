/*
  # Critical Security and Performance Fixes

  ## Changes
  1. Add missing foreign key indexes for performance
  2. Optimize RLS policies with (select auth.uid()) pattern
  3. Secure functions with immutable search_path

  All changes are non-breaking and preserve existing functionality.
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_attendance_id ON attendance_alerts(attendance_id);
CREATE INDEX IF NOT EXISTS idx_branches_manager_id ON branches(manager_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_created_by ON class_attendance(created_by);
CREATE INDEX IF NOT EXISTS idx_class_attendance_package_id ON class_attendance(package_id);
CREATE INDEX IF NOT EXISTS idx_exam_invitations_created_by ON exam_invitations(created_by);
CREATE INDEX IF NOT EXISTS idx_exam_participation_recorded_by ON exam_participation(recorded_by);
CREATE INDEX IF NOT EXISTS idx_invoice_items_stock_item_id ON invoice_items(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sold_by ON invoices(sold_by);
CREATE INDEX IF NOT EXISTS idx_membership_freeze_history_frozen_by ON membership_freeze_history(frozen_by);
CREATE INDEX IF NOT EXISTS idx_membership_freeze_history_unfrozen_by ON membership_freeze_history(unfrozen_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_package_id ON payments(package_id);
CREATE INDEX IF NOT EXISTS idx_player_contacts_contacted_by ON player_contacts(contacted_by);
CREATE INDEX IF NOT EXISTS idx_promotion_log_exam_participation_id ON promotion_log(exam_participation_id);
CREATE INDEX IF NOT EXISTS idx_promotion_log_promoted_by ON promotion_log(promoted_by);
CREATE INDEX IF NOT EXISTS idx_stock_categories_scheme_id ON stock_categories(scheme_id);
CREATE INDEX IF NOT EXISTS idx_student_renewals_new_package_id ON student_renewals(new_package_id);
CREATE INDEX IF NOT EXISTS idx_student_renewals_old_package_id ON student_renewals(old_package_id);
CREATE INDEX IF NOT EXISTS idx_student_renewals_renewed_by ON student_renewals(renewed_by);
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_by ON user_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_branch_id ON whatsapp_messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_by ON whatsapp_messages(sent_by);

-- Secure functions with immutable search_path
DROP TRIGGER IF EXISTS trigger_update_stock ON invoice_items;
DROP FUNCTION IF EXISTS insert_audit_log(text,uuid,text,text,text,text,jsonb,jsonb,jsonb,jsonb,text,text,text,text,text,boolean) CASCADE;
DROP FUNCTION IF EXISTS update_stock_on_invoice() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_number() CASCADE;

CREATE FUNCTION insert_audit_log(
  p_actor_role text, p_branch_id uuid, p_action text, p_entity_type text, p_entity_id text, p_summary_key text,
  p_summary_params jsonb DEFAULT NULL, p_before_data jsonb DEFAULT NULL, p_after_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL, p_ip_address text DEFAULT NULL, p_user_agent text DEFAULT NULL,
  p_device_name text DEFAULT NULL, p_os_name text DEFAULT NULL, p_browser_name text DEFAULT NULL, p_is_mobile boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_log_id uuid; v_ip_masked text;
BEGIN
  IF p_ip_address IS NOT NULL THEN
    IF position('.' in p_ip_address) > 0 THEN v_ip_masked := split_part(p_ip_address, '.', 1) || '.' || split_part(p_ip_address, '.', 2) || '.*.*';
    ELSIF position(':' in p_ip_address) > 0 THEN v_ip_masked := split_part(p_ip_address, ':', 1) || ':' || split_part(p_ip_address, ':', 2) || ':*';
    ELSE v_ip_masked := 'masked'; END IF;
  END IF;
  INSERT INTO audit_logs (actor_user_id, actor_role, branch_id, action, entity_type, entity_id, summary_key, summary_params, before_data, after_data, metadata, ip_address, ip_masked, user_agent, device_name, os_name, browser_name, is_mobile)
  VALUES (auth.uid(), p_actor_role, p_branch_id, p_action, p_entity_type, p_entity_id, p_summary_key, p_summary_params, p_before_data, p_after_data, p_metadata, p_ip_address, v_ip_masked, p_user_agent, p_device_name, p_os_name, p_browser_name, p_is_mobile)
  RETURNING id INTO v_log_id; RETURN v_log_id;
END; $$;

CREATE FUNCTION update_stock_on_invoice() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NEW.stock_item_id IS NOT NULL THEN UPDATE stock_items SET quantity = quantity - NEW.quantity WHERE id = NEW.stock_item_id; END IF; RETURN NEW; END; $$;

CREATE TRIGGER trigger_update_stock AFTER INSERT ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_stock_on_invoice();

CREATE FUNCTION is_super_admin() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_role text; BEGIN SELECT role INTO user_role FROM profiles WHERE id = auth.uid(); RETURN user_role = 'super_admin'; END; $$;

CREATE FUNCTION generate_invoice_number() RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_number INTEGER; formatted_number TEXT;
BEGIN SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1 INTO next_number FROM invoices WHERE invoice_number ~ '^INV-[0-9]+$';
formatted_number := 'INV-' || LPAD(next_number::TEXT, 6, '0'); RETURN formatted_number; END; $$;

-- Optimize critical RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (id = (select auth.uid()));
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Super admin can view all branches" ON branches;
DROP POLICY IF EXISTS "Branch staff can view own branch" ON branches;
DROP POLICY IF EXISTS "Super admin can insert branches" ON branches;
DROP POLICY IF EXISTS "Super admin can update branches" ON branches;
DROP POLICY IF EXISTS "Super admin can delete branches" ON branches;
CREATE POLICY "Super admin can view all branches" ON branches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch staff can view own branch" ON branches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.branch_id = branches.id));
CREATE POLICY "Super admin can insert branches" ON branches FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin can update branches" ON branches FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin can delete branches" ON branches FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));

DROP POLICY IF EXISTS "Super admin can view all students" ON students;
DROP POLICY IF EXISTS "Branch staff can view branch students" ON students;
DROP POLICY IF EXISTS "Branch managers can insert students" ON students;
DROP POLICY IF EXISTS "Branch managers can update students" ON students;
DROP POLICY IF EXISTS "Branch managers can delete students" ON students;
CREATE POLICY "Super admin can view all students" ON students FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch staff can view branch students" ON students FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.branch_id = students.branch_id));
CREATE POLICY "Branch managers can insert students" ON students FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'branch_manager')));
CREATE POLICY "Branch managers can update students" ON students FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR (profiles.role = 'branch_manager' AND profiles.branch_id = students.branch_id))));
CREATE POLICY "Branch managers can delete students" ON students FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR (profiles.role = 'branch_manager' AND profiles.branch_id = students.branch_id))));

DROP POLICY IF EXISTS "Super admin can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Branch staff can view branch attendance" ON attendance;
DROP POLICY IF EXISTS "Branch staff can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Super admin can insert attendance in any branch" ON attendance;
DROP POLICY IF EXISTS "Branch staff can update attendance" ON attendance;
DROP POLICY IF EXISTS "Super admin can update attendance in any branch" ON attendance;
DROP POLICY IF EXISTS "Branch managers can delete attendance" ON attendance;
CREATE POLICY "Super admin can view all attendance" ON attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch staff can view branch attendance" ON attendance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.branch_id = attendance.branch_id));
CREATE POLICY "Branch staff can insert attendance" ON attendance FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.branch_id = attendance.branch_id));
CREATE POLICY "Super admin can insert attendance in any branch" ON attendance FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch staff can update attendance" ON attendance FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.branch_id = attendance.branch_id));
CREATE POLICY "Super admin can update attendance in any branch" ON attendance FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch managers can delete attendance" ON attendance FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR (profiles.role = 'branch_manager' AND profiles.branch_id = attendance.branch_id))));

DROP POLICY IF EXISTS "Super admins can view all expenses" ON expenses;
DROP POLICY IF EXISTS "Branch managers can view their branch expenses" ON expenses;
DROP POLICY IF EXISTS "Super admins can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Branch managers can insert expenses for their branch" ON expenses;
DROP POLICY IF EXISTS "Super admins can update expenses" ON expenses;
DROP POLICY IF EXISTS "Branch managers can update their branch expenses" ON expenses;
DROP POLICY IF EXISTS "Super admins can delete expenses" ON expenses;
DROP POLICY IF EXISTS "Branch managers can delete their branch expenses" ON expenses;
CREATE POLICY "Super admins can view all expenses" ON expenses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch managers can view their branch expenses" ON expenses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.branch_id = expenses.branch_id));
CREATE POLICY "Super admins can insert expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch managers can insert expenses for their branch" ON expenses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'branch_manager' AND profiles.branch_id = expenses.branch_id));
CREATE POLICY "Super admins can update expenses" ON expenses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch managers can update their branch expenses" ON expenses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'branch_manager' AND profiles.branch_id = expenses.branch_id));
CREATE POLICY "Super admins can delete expenses" ON expenses FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch managers can delete their branch expenses" ON expenses FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'branch_manager' AND profiles.branch_id = expenses.branch_id));

DROP POLICY IF EXISTS "Super Admin can read all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Branch Admin can read their branch audit logs" ON audit_logs;
CREATE POLICY "Super Admin can read all audit logs" ON audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Branch Admin can read their branch audit logs" ON audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'branch_manager' AND profiles.branch_id = audit_logs.branch_id));

DROP POLICY IF EXISTS "Super admin can update settings" ON settings;
CREATE POLICY "Super admin can update settings" ON settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));

DROP POLICY IF EXISTS "Super admin can insert packages" ON packages;
DROP POLICY IF EXISTS "Super admin can update packages" ON packages;
DROP POLICY IF EXISTS "Super admin can delete packages" ON packages;
CREATE POLICY "Super admin can insert packages" ON packages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin can update packages" ON packages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin can delete packages" ON packages FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));

DROP POLICY IF EXISTS "Super admin can insert schemes" ON schemes;
DROP POLICY IF EXISTS "Super admin can update schemes" ON schemes;
DROP POLICY IF EXISTS "Super admin can delete schemes" ON schemes;
CREATE POLICY "Super admin can insert schemes" ON schemes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin can update schemes" ON schemes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin can delete schemes" ON schemes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));

DROP POLICY IF EXISTS "Managers can insert student schemes" ON student_schemes;
DROP POLICY IF EXISTS "Managers can delete student schemes" ON student_schemes;
CREATE POLICY "Managers can insert student schemes" ON student_schemes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'branch_manager')));
CREATE POLICY "Managers can delete student schemes" ON student_schemes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'branch_manager')));

DROP POLICY IF EXISTS "Users can view payments in their branch" ON payments;
DROP POLICY IF EXISTS "Managers can insert payments" ON payments;
DROP POLICY IF EXISTS "Managers can update payments" ON payments;
CREATE POLICY "Users can view payments in their branch" ON payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.branch_id = payments.branch_id)));
CREATE POLICY "Managers can insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'branch_manager')));
CREATE POLICY "Managers can update payments" ON payments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'branch_manager')));

DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Super admin can manage user permissions" ON user_permissions;
CREATE POLICY "Users can view their own permissions" ON user_permissions FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Super admin can manage user permissions" ON user_permissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));

DROP POLICY IF EXISTS "Super admin can insert package schemes" ON package_schemes;
DROP POLICY IF EXISTS "Super admin can delete package schemes" ON package_schemes;
CREATE POLICY "Super admin can insert package schemes" ON package_schemes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Super admin can delete package schemes" ON package_schemes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));

DROP POLICY IF EXISTS "Super admin and stock managers can manage categories" ON stock_categories;
DROP POLICY IF EXISTS "Super admin and stock managers can manage items" ON stock_items;
CREATE POLICY "Super admin and stock managers can manage categories" ON stock_categories FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'stock_manager')));
CREATE POLICY "Super admin and stock managers can manage items" ON stock_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'stock_manager')));

DROP POLICY IF EXISTS "Branch staff can view their branch invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can create invoices" ON invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON invoices;
CREATE POLICY "Branch staff can view their branch invoices" ON invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.branch_id = invoices.branch_id)));
CREATE POLICY "Staff can create invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'branch_manager')));
CREATE POLICY "Staff can update invoices" ON invoices FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'branch_manager')));

DROP POLICY IF EXISTS "Users can view invoice items with invoice access" ON invoice_items;
DROP POLICY IF EXISTS "Staff can create invoice items" ON invoice_items;
CREATE POLICY "Users can view invoice items with invoice access" ON invoice_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM invoices JOIN profiles ON profiles.id = (select auth.uid()) WHERE invoices.id = invoice_items.invoice_id AND (profiles.role = 'super_admin' OR profiles.branch_id = invoices.branch_id)));
CREATE POLICY "Staff can create invoice items" ON invoice_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'branch_manager')));

DROP POLICY IF EXISTS "Super admins can manage all permissions" ON role_permissions;
DROP POLICY IF EXISTS "Users can view their role permissions" ON role_permissions;
CREATE POLICY "Super admins can manage all permissions" ON role_permissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Users can view their role permissions" ON role_permissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = role_permissions.role));

DROP POLICY IF EXISTS "Users can create stock counts" ON stock_counts;
DROP POLICY IF EXISTS "Users can update own stock counts" ON stock_counts;
DROP POLICY IF EXISTS "Users can delete own stock counts" ON stock_counts;
CREATE POLICY "Users can create stock counts" ON stock_counts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND (profiles.role = 'super_admin' OR profiles.role = 'stock_manager')));
CREATE POLICY "Users can update own stock counts" ON stock_counts FOR UPDATE TO authenticated USING (counted_by = (select auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
CREATE POLICY "Users can delete own stock counts" ON stock_counts FOR DELETE TO authenticated USING (counted_by = (select auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'super_admin'));
