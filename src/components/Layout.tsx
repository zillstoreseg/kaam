import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
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
} from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

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

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard, roles: ['super_admin', 'branch_manager', 'coach'] },
    { name: t('nav.students'), href: '/students', icon: Users, roles: ['super_admin', 'branch_manager', 'coach'] },
    { name: t('nav.attendance'), href: '/attendance', icon: ClipboardCheck, roles: ['super_admin', 'branch_manager', 'coach'] },
    { name: t('nav.packages'), href: '/packages', icon: Package, roles: ['super_admin'] },
    { name: t('nav.branches'), href: '/branches', icon: Building2, roles: ['super_admin'] },
    { name: 'Schemes', href: '/schemes', icon: Award, roles: ['super_admin'] },
    { name: 'Stock', href: '/stock', icon: ShoppingBag, roles: ['super_admin', 'stock_manager'] },
    { name: 'Sales', href: '/sales', icon: Receipt, roles: ['super_admin', 'stock_manager', 'branch_manager'] },
    { name: t('nav.reports'), href: '/reports', icon: FileText, roles: ['super_admin', 'branch_manager', 'accountant'] },
    { name: 'Users', href: '/users', icon: UserCog, roles: ['super_admin'] },
    { name: t('nav.settings'), href: '/settings', icon: Settings, roles: ['super_admin'] },
  ];

  const filteredNav = navigation.filter((item) =>
    profile?.role ? item.roles.includes(profile.role) : false
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
    { code: 'hi', name: 'हिंदी' },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} z-50 lg:z-auto w-64 h-full bg-white shadow-lg transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-red-700">{t('app.name')}</h1>
            <p className="text-sm text-gray-600">{t('app.subtitle')}</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNav.map((item) => {
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
              <p className="text-xs text-gray-600">{profile?.role && t(`role.${profile.role}`)}</p>
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
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex-1" />

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
