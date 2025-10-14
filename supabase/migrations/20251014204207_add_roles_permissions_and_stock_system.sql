/*
  # Add Roles, Permissions, and Stock Management System

  ## Changes
  
  1. **Roles & Permissions**
     - Add 'accountant' and 'stock_manager' roles (role is text field)
     - Create permissions table for granular access control
     - Create user_permissions junction table
  
  2. **Stock/Inventory System**
     - Create stock_categories table (linked to schemes)
     - Create stock_items table with pricing and quantities
     - Track items by scheme (Karate, Kickboxing, etc.)
  
  3. **Invoice System**
     - Create invoices table with payment details
     - Create invoice_items table for line items
     - Support cash/card/installment payment methods
     - Include VAT calculation (5%)
     - Track who sold (logged-in user)
     - Link to customers (students or walk-ins)
  
  ## Security
     - Enable RLS on all new tables
     - Add appropriate policies for each role
*/

-- 1. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

-- 2. Create user_permissions junction table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage user permissions"
  ON user_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view their own permissions"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Create stock_categories table (linked to schemes)
CREATE TABLE IF NOT EXISTS stock_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scheme_id uuid REFERENCES schemes(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock categories"
  ON stock_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin and stock managers can manage categories"
  ON stock_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'stock_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'stock_manager')
    )
  );

-- 4. Create stock_items table
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES stock_categories(id) ON DELETE SET NULL,
  sku text UNIQUE,
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost decimal(10,2) DEFAULT 0,
  quantity integer DEFAULT 0,
  min_quantity integer DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock items"
  ON stock_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin and stock managers can manage items"
  ON stock_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'stock_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'stock_manager')
    )
  );

-- 5. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES students(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  vat_rate decimal(5,2) DEFAULT 5.00,
  vat_amount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'installment')),
  payment_status text DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partial')),
  amount_paid decimal(10,2) DEFAULT 0,
  sold_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  notes text,
  invoice_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branch staff can view their branch invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND (
        role = 'super_admin' 
        OR role = 'accountant'
        OR (branch_id = invoices.branch_id)
      )
    )
  );

CREATE POLICY "Staff can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND (
        role IN ('super_admin', 'stock_manager', 'branch_manager')
        OR branch_id = invoices.branch_id
      )
    )
  );

CREATE POLICY "Staff can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND (
        role IN ('super_admin', 'accountant', 'stock_manager')
        OR (branch_id = invoices.branch_id)
      )
    )
  );

-- 6. Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES stock_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice items with invoice access"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN profiles ON profiles.id = auth.uid()
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        profiles.role IN ('super_admin', 'accountant')
        OR profiles.branch_id = invoices.branch_id
      )
    )
  );

CREATE POLICY "Staff can create invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      JOIN profiles ON profiles.id = auth.uid()
      WHERE invoices.id = invoice_items.invoice_id
      AND (
        profiles.role IN ('super_admin', 'stock_manager', 'branch_manager')
        OR profiles.branch_id = invoices.branch_id
      )
    )
  );

-- 7. Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  ('view_reports', 'View all reports and analytics', 'reports'),
  ('view_revenue', 'View revenue and financial data', 'finance'),
  ('manage_stock', 'Manage inventory and stock items', 'stock'),
  ('create_invoice', 'Create sales invoices', 'sales'),
  ('view_invoices', 'View all invoices', 'sales'),
  ('manage_students', 'Add, edit, delete students', 'students'),
  ('view_students', 'View student information', 'students'),
  ('mark_attendance', 'Mark student attendance', 'attendance'),
  ('manage_users', 'Manage user accounts', 'admin'),
  ('manage_branches', 'Manage branches', 'admin')
ON CONFLICT (name) DO NOTHING;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_active ON stock_items(is_active);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- 9. Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  invoice_num text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-%';
  
  invoice_num := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(next_num::text, 4, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to update stock quantity on invoice creation
CREATE OR REPLACE FUNCTION update_stock_on_invoice()
RETURNS trigger AS $$
BEGIN
  IF NEW.stock_item_id IS NOT NULL THEN
    UPDATE stock_items
    SET quantity = quantity - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.stock_item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock ON invoice_items;
CREATE TRIGGER trigger_update_stock
  AFTER INSERT ON invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_invoice();
