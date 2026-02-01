import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlatform } from '../contexts/PlatformContext';
import { supabase, Settings as SettingsType, RolePermission, PageName } from '../lib/supabase';
import ImpersonationBanner from './ImpersonationBanner';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Package,
  Building2,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
  UserCog,
  Award,
  ShoppingBag,
  Receipt,
  ClipboardList,
  DollarSign,
  GraduationCap,
  BarChart3,
  Bell,
  Shield,
  Activity,
  History,
  AlertTriangle,
  Crown,
} from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [inactiveCount, setInactiveCount] = useState(0);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { isOwner } = usePlatform();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
    loadPermissions();
  }, [profile]);

  useEffect(() => {
    if (settings?.enable_inactive_alerts) {
      loadInactiveCount();
      const interval = setInterval(loadInactiveCount, 60000);
      return () => clearInterval(interval);
    }
  }, [settings, profile]);

  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) setSettings(data as SettingsType);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function loadInactiveCount() {
    if (!settings || !settings.enable_inactive_alerts) return;

    try {
      const thresholdDays = settings.inactive_threshold_days || 14;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

      let studentsQuery = supabase
        .from('students')
        .select('id, created_at')
        .eq('is_active', true);

      if (profile?.role === 'branch_manager' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
      }

      const { data: students } = await studentsQuery;
      if (!students) return;

      const studentIds = students.map(s => s.id);
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id, attendance_date')
        .in('student_id', studentIds)
        .order('attendance_date', { ascending: false });

      const lastAttendanceMap: Record<string, string> = {};
      attendanceData?.forEach((record: any) => {
        if (!lastAttendanceMap[record.student_id]) {
          lastAttendanceMap[record.student_id] = record.attendance_date;
        }
      });

      let count = 0;
      students.forEach((student: any) => {
        const lastAttendance = lastAttendanceMap[student.id];
        const referenceDate = lastAttendance ? new Date(lastAttendance) : new Date(student.created_at);
        const daysAbsent = Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysAbsent >= thresholdDays) {
          count++;
        }
      });

      setInactiveCount(count);
    } catch (error) {
      console.error('Error loading inactive count:', error);
    }
  }

  async function loadPermissions() {
    if (!profile?.role) return;

    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', profile.role);

      if (error) throw error;
      setPermissions((data as RolePermission[]) || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  }

  function canViewPage(page: PageName): boolean {
    if (profile?.role === 'super_admin') return true;
    const permission = permissions.find(p => p.page === page);
    return permission?.can_view || false;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    if (langMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [langMenuOpen]);

  const baseNavigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard, page: 'dashboard' as PageName },
    { name: t('nav.students'), href: '/students', icon: Users, page: 'students' as PageName },
    { name: t('nav.attendance'), href: '/attendance', icon: ClipboardCheck, page: 'attendance' as PageName },
    { name: t('nav.packages'), href: '/packages', icon: Package, page: 'packages' as PageName },
    { name: t('nav.branches'), href: '/branches', icon: Building2, page: 'branches' as PageName },
    { name: t('nav.schemes'), href: '/schemes', icon: Award, page: 'schemes' as PageName },
    { name: t('nav.stock'), href: '/stock', icon: ShoppingBag, page: 'stock' as PageName },
    { name: t('nav.stockInventory'), href: '/stock-inventory', icon: ClipboardList, page: 'stock' as PageName },
    { name: t('nav.sales'), href: '/sales', icon: Receipt, page: 'sales' as PageName },
    { name: t('nav.invoices'), href: '/invoices', icon: FileText, page: 'invoices' as PageName },
    { name: 'Revenue Reports', href: '/revenue-reports', icon: DollarSign, page: 'reports' as PageName },
    { name: 'Exam Eligibility', href: '/exam-eligibility', icon: GraduationCap, page: 'reports' as PageName },
    { name: 'Attendance Reports', href: '/attendance-reports', icon: BarChart3, page: 'reports' as PageName },
    { name: 'Expenses', href: '/expenses', icon: DollarSign, page: 'reports' as PageName },
    { name: t('nav.reports'), href: '/reports', icon: FileText, page: 'reports' as PageName },
  ];

  const securityNavigation = [
    { name: 'Activity Log', href: '/activity-log', icon: Activity, page: 'reports' as PageName },
    { name: 'Login History', href: '/login-history', icon: History, page: 'reports' as PageName },
    { name: 'Security Alerts', href: '/security-alerts', icon: AlertTriangle, page: 'reports' as PageName },
  ];

  const adminNavigation = [
    { name: t('nav.users'), href: '/users', icon: UserCog, page: 'users' as PageName },
    { name: t('nav.settings'), href: '/settings', icon: Settings, page: 'settings' as PageName },
  ];

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'branch_manager';

  const navigation = [
    ...baseNavigation,
    ...(isAdmin ? securityNavigation : []),
    ...adminNavigation,
  ];

  const filteredNav = navigation.filter((item) => canViewPage(item.page));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'ur', name: 'اردو' },
    { code: 'fil', name: 'Filipino' },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} z-50 lg:z-auto w-64 h-full bg-white shadow-lg transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-12 mb-3" />
            )}
            <h1 className="text-2xl font-bold text-red-700">
              {settings?.academy_name || t('app.name')}
            </h1>
            {settings?.company_slogan && (
              <p className="text-sm text-gray-600 italic">{settings.company_slogan}</p>
            )}
            {!settings?.company_slogan && (
              <p className="text-sm text-gray-600">{t('app.subtitle')}</p>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {isOwner && (
              <>
                <Link
                  to="/platform-admin"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    location.pathname === '/platform-admin'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-50 border border-blue-200'
                  }`}
                >
                  <Crown className="w-5 h-5" />
                  <span className="font-medium">Platform Admin</span>
                </Link>
                {profile?.role && (
                  <div className="border-b border-gray-200 my-2"></div>
                )}
              </>
            )}
            {!isOwner && filteredNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-red-700 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t space-y-2">
            <div className="px-4 py-2 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-600">
                {profile?.role && t(`role.${profile.role}`)}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-700 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className={isRTL ? 'lg:mr-64' : 'lg:ml-64'}>
        <ImpersonationBanner />
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex-1" />

            {settings?.enable_inactive_alerts && (
              <button
                onClick={() => navigate('/inactive-players')}
                className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition mr-2"
                title="Inactive Players"
              >
                <Bell className="w-6 h-6" />
                {inactiveCount > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {inactiveCount > 99 ? '99+' : inactiveCount}
                  </span>
                )}
              </button>
            )}

            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <Globe className="w-5 h-5" />
                <span className="hidden sm:inline">{languages.find((l) => l.code === language)?.name}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute top-full mt-2 right-0 bg-white shadow-lg rounded-lg border overflow-hidden">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as 'en' | 'ar' | 'hi');
                        setLangMenuOpen(false);
                      }}
                      className={`block w-full px-6 py-3 text-left hover:bg-gray-100 transition ${
                        language === lang.code ? 'bg-red-50 text-red-700' : 'text-gray-700'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
