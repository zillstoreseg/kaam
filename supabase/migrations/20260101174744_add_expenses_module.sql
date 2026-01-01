/*
  # Expenses Module

  1. New Features
    - Track academy expenses by category
    - Branch-scoped expense tracking
    - Monthly analytics and reporting

  2. New Tables
    - `expenses`
      - `id` (uuid, primary key)
      - `expense_date` (date) - When expense occurred
      - `branch_id` (uuid) - FK to branches
      - `category` (text) - Expense category
      - `amount` (numeric) - Expense amount (must be > 0)
      - `payment_method` (text) - How expense was paid
      - `notes` (text, nullable) - Additional details
      - `created_by` (uuid) - FK to profiles (who recorded it)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Categories
    - Rent
    - Salaries
    - Utilities
    - Equipment
    - Maintenance
    - Marketing
    - Other

  4. Payment Methods
    - Cash
    - Card
    - Bank Transfer

  5. Security
    - Enable RLS
    - Super admins can view all expenses
    - Branch managers can view their branch expenses only
    - Only admins and managers can create/edit expenses

  6. Notes
    - All changes are additive (no breaking changes)
    - Branch-scoped for proper access control
*/

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  branch_id uuid REFERENCES branches(id) NOT NULL,
  category text NOT NULL CHECK (category IN (
    'rent',
    'salaries',
    'utilities',
    'equipment',
    'maintenance',
    'marketing',
    'other'
  )),
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN (
    'cash',
    'card',
    'bank_transfer'
  )),
  notes text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch managers can view their branch expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = expenses.branch_id
    )
  );

CREATE POLICY "Super admins can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch managers can insert expenses for their branch"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = expenses.branch_id
    )
  );

CREATE POLICY "Super admins can update expenses"
  ON expenses FOR UPDATE
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

CREATE POLICY "Branch managers can update their branch expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = expenses.branch_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = expenses.branch_id
    )
  );

CREATE POLICY "Super admins can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch managers can delete their branch expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = expenses.branch_id
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- Add comments for documentation
COMMENT ON TABLE expenses IS 'Tracks academy expenses by category and branch';
COMMENT ON COLUMN expenses.expense_date IS 'Date when the expense occurred';
COMMENT ON COLUMN expenses.category IS 'Expense category: rent, salaries, utilities, equipment, maintenance, marketing, other';
COMMENT ON COLUMN expenses.payment_method IS 'Payment method: cash, card, bank_transfer';