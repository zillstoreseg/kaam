export const FEATURES = {
  DASHBOARD: 'dashboard',
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  BRANCHES: 'branches',
  USERS: 'users',
  PACKAGES: 'packages',
  SCHEMES: 'schemes',
  INVOICES: 'invoices',
  SALES: 'sales',
  EXPENSES: 'expenses',
  REPORTS: 'reports',
  REVENUE_REPORTS: 'revenue_reports',
  ATTENDANCE_REPORTS: 'attendance_reports',
  EXAM_ELIGIBILITY: 'exam_eligibility',
  INACTIVE_PLAYERS: 'inactive_players',
  ACTIVITY_LOG: 'activity_log',
  LOGIN_HISTORY: 'login_history',
  SECURITY_ALERTS: 'security_alerts',
  STOCK: 'stock',
  STOCK_INVENTORY: 'stock_inventory',
  SETTINGS: 'settings'
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];
