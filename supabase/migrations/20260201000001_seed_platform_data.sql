/*
  # Seed Platform Data

  ## Overview
  Seeds initial plans and features for the SaaS platform.

  ## Data Seeded
  1. Three subscription plans: Basic, Pro, Elite
  2. All available features from the existing system
  3. Feature mappings for each plan
*/

INSERT INTO plans (id, name, price_monthly, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Basic', 29.99, 'Essential features for small academies'),
  ('22222222-2222-2222-2222-222222222222', 'Pro', 79.99, 'Advanced features for growing academies'),
  ('33333333-3333-3333-3333-333333333333', 'Elite', 149.99, 'Full feature access for large academies')
ON CONFLICT (id) DO NOTHING;

INSERT INTO features (key, label, category) VALUES
  ('dashboard', 'Dashboard', 'core'),
  ('students', 'Students Management', 'core'),
  ('attendance', 'Attendance Tracking', 'core'),
  ('branches', 'Branch Management', 'management'),
  ('users', 'User Management', 'management'),
  ('packages', 'Package Management', 'management'),
  ('schemes', 'Scheme Management', 'management'),
  ('invoices', 'Invoice Management', 'finance'),
  ('sales', 'Sales Tracking', 'finance'),
  ('expenses', 'Expense Tracking', 'finance'),
  ('reports', 'Reports', 'reports'),
  ('revenue_reports', 'Revenue Reports', 'reports'),
  ('attendance_reports', 'Attendance Reports', 'reports'),
  ('exam_eligibility', 'Exam Eligibility', 'features'),
  ('inactive_players', 'Inactive Players', 'features'),
  ('activity_log', 'Activity Log', 'management'),
  ('login_history', 'Login History', 'management'),
  ('security_alerts', 'Security Alerts', 'management'),
  ('stock', 'Stock Management', 'inventory'),
  ('stock_inventory', 'Stock Inventory', 'inventory'),
  ('settings', 'Settings', 'core')
ON CONFLICT (key) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_key, enabled) VALUES
  ('11111111-1111-1111-1111-111111111111', 'dashboard', true),
  ('11111111-1111-1111-1111-111111111111', 'students', true),
  ('11111111-1111-1111-1111-111111111111', 'attendance', true),
  ('11111111-1111-1111-1111-111111111111', 'packages', true),
  ('11111111-1111-1111-1111-111111111111', 'invoices', true),
  ('11111111-1111-1111-1111-111111111111', 'settings', true),
  
  ('22222222-2222-2222-2222-222222222222', 'dashboard', true),
  ('22222222-2222-2222-2222-222222222222', 'students', true),
  ('22222222-2222-2222-2222-222222222222', 'attendance', true),
  ('22222222-2222-2222-2222-222222222222', 'branches', true),
  ('22222222-2222-2222-2222-222222222222', 'users', true),
  ('22222222-2222-2222-2222-222222222222', 'packages', true),
  ('22222222-2222-2222-2222-222222222222', 'schemes', true),
  ('22222222-2222-2222-2222-222222222222', 'invoices', true),
  ('22222222-2222-2222-2222-222222222222', 'sales', true),
  ('22222222-2222-2222-2222-222222222222', 'expenses', true),
  ('22222222-2222-2222-2222-222222222222', 'reports', true),
  ('22222222-2222-2222-2222-222222222222', 'revenue_reports', true),
  ('22222222-2222-2222-2222-222222222222', 'attendance_reports', true),
  ('22222222-2222-2222-2222-222222222222', 'exam_eligibility', true),
  ('22222222-2222-2222-2222-222222222222', 'settings', true),
  
  ('33333333-3333-3333-3333-333333333333', 'dashboard', true),
  ('33333333-3333-3333-3333-333333333333', 'students', true),
  ('33333333-3333-3333-3333-333333333333', 'attendance', true),
  ('33333333-3333-3333-3333-333333333333', 'branches', true),
  ('33333333-3333-3333-3333-333333333333', 'users', true),
  ('33333333-3333-3333-3333-333333333333', 'packages', true),
  ('33333333-3333-3333-3333-333333333333', 'schemes', true),
  ('33333333-3333-3333-3333-333333333333', 'invoices', true),
  ('33333333-3333-3333-3333-333333333333', 'sales', true),
  ('33333333-3333-3333-3333-333333333333', 'expenses', true),
  ('33333333-3333-3333-3333-333333333333', 'reports', true),
  ('33333333-3333-3333-3333-333333333333', 'revenue_reports', true),
  ('33333333-3333-3333-3333-333333333333', 'attendance_reports', true),
  ('33333333-3333-3333-3333-333333333333', 'exam_eligibility', true),
  ('33333333-3333-3333-3333-333333333333', 'inactive_players', true),
  ('33333333-3333-3333-3333-333333333333', 'activity_log', true),
  ('33333333-3333-3333-3333-333333333333', 'login_history', true),
  ('33333333-3333-3333-3333-333333333333', 'security_alerts', true),
  ('33333333-3333-3333-3333-333333333333', 'stock', true),
  ('33333333-3333-3333-3333-333333333333', 'stock_inventory', true),
  ('33333333-3333-3333-3333-333333333333', 'settings', true)
ON CONFLICT DO NOTHING;
