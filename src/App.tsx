import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import SubscriptionGate from './components/SubscriptionGate';
import Bootstrap from './pages/Bootstrap';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import TenantList from './pages/admin/TenantList';
import TenantCreate from './pages/admin/TenantCreate';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Packages from './pages/Packages';
import Branches from './pages/Branches';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Schemes from './pages/Schemes';
import Stock from './pages/Stock';
import StockInventory from './pages/StockInventory';
import Sales from './pages/Sales';
import Invoices from './pages/Invoices';
import RevenueReports from './pages/RevenueReports';
import ExamEligibility from './pages/ExamEligibility';
import AttendanceReports from './pages/AttendanceReports';
import Expenses from './pages/Expenses';
import InactivePlayers from './pages/InactivePlayers';
import ActivityLog from './pages/ActivityLog';
import LoginHistory from './pages/LoginHistory';
import SecurityAlerts from './pages/SecurityAlerts';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/" />;
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route path="/admin/tenants" element={<PrivateRoute><TenantList /></PrivateRoute>} />
            <Route path="/admin/tenants/new" element={<PrivateRoute><TenantCreate /></PrivateRoute>} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="packages" element={<Packages />} />
              <Route path="branches" element={<Branches />} />
              <Route path="reports" element={<Reports />} />
              <Route path="schemes" element={<Schemes />} />
              <Route path="stock" element={<Stock />} />
              <Route path="stock-inventory" element={<StockInventory />} />
              <Route path="sales" element={<Sales />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="revenue-reports" element={<RevenueReports />} />
              <Route path="exam-eligibility" element={<ExamEligibility />} />
              <Route path="attendance-reports" element={<AttendanceReports />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="inactive-players" element={<InactivePlayers />} />
              <Route path="activity-log" element={<ActivityLog />} />
              <Route path="login-history" element={<LoginHistory />} />
              <Route path="security-alerts" element={<SecurityAlerts />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
