import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { PlatformProvider, usePlatform } from './contexts/PlatformContext';
import { TenantProvider } from './contexts/TenantContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
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
import PlatformOwnerDashboard from './pages/PlatformOwnerDashboard';
import AcademySubscription from './pages/AcademySubscription';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: platformLoading } = usePlatform();

  if (authLoading || (user && platformLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={isOwner ? '/platform-admin' : '/dashboard'} />;
  }

  return <>{children}</>;
}

function PlatformOwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: platformLoading } = usePlatform();

  if (authLoading || platformLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-gray-300 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-2">This page requires platform owner privileges.</p>
          <p className="text-sm text-gray-500 mb-6">If you are the platform owner, your account may not have the owner role assigned yet.</p>
          <a href="/dashboard" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <PlatformProvider>
            <TenantProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <Register />
                    </PublicRoute>
                  }
                />
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
                <Route
                  path="/platform-admin"
                  element={
                    <PlatformOwnerRoute>
                      <PlatformOwnerDashboard />
                    </PlatformOwnerRoute>
                  }
                />
                <Route
                  path="/dashboard"
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
                  <Route path="subscription" element={<AcademySubscription />} />
                </Route>
              </Routes>
            </TenantProvider>
          </PlatformProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
