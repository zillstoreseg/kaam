import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Settings as SettingsType } from '../lib/supabase';
import { Save, Building2, FileText, MessageSquare, Shield, Mail, Key, User, AlertTriangle } from 'lucide-react';
import PermissionsManager from '../components/PermissionsManager';

export default function Settings() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'security' | 'danger'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [formData, setFormData] = useState({
    academy_name: '',
    logo_url: '',
    company_slogan: '',
    company_address: '',
    company_city: '',
    company_country: 'United Arab Emirates',
    company_phone: '',
    company_email: '',
    company_website: '',
    tax_registration_number: '',
    currency_symbol: 'AED',
    default_language: 'en' as 'en' | 'ar' | 'hi',
    notifications_enabled: false,
    primary_color: '#B91C1C',
    accent_color: '#F59E0B',
    message_template_expired: '',
    message_template_registration: '',
    message_template_renewal: '',
    message_template_invoice: '',
    invoice_footer_text: '',
    auto_send_expired_message: false,
    expired_message_days_interval: 7,
    admin_email: '',
    enable_daily_reports: false,
    enable_data_reset: false,
  });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetCounts, setResetCounts] = useState({
    students: 0,
    attendance: 0,
    exams: 0,
    expenses: 0,
    invoices: 0,
  });
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadSettings();
    loadProfile();
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase.from('settings').select('*').maybeSingle();
      if (error) throw error;
      if (data) {
        setSettings(data as SettingsType);
        setFormData({
          academy_name: data.academy_name || '',
          logo_url: data.logo_url || '',
          company_slogan: data.company_slogan || '',
          company_address: data.company_address || '',
          company_city: data.company_city || '',
          company_country: data.company_country || 'United Arab Emirates',
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
          company_website: data.company_website || '',
          tax_registration_number: data.tax_registration_number || '',
          currency_symbol: data.currency_symbol || 'AED',
          default_language: data.default_language || 'en',
          notifications_enabled: data.notifications_enabled || false,
          primary_color: data.primary_color || '#B91C1C',
          accent_color: data.accent_color || '#F59E0B',
          message_template_expired: data.message_template_expired || 'Dear {student_name}, your package expired on {expiry_date}. It has been {days_expired} days since expiry. Please renew your package to continue training. Contact us at {academy_phone}.',
          message_template_registration: data.message_template_registration || 'Welcome {student_name}! Thank you for joining {academy_name}. Your package starts on {package_start} and ends on {package_end}. We look forward to training with you!',
          message_template_renewal: data.message_template_renewal || 'Dear {student_name}, your package has been successfully renewed! Your new package starts on {package_start} and ends on {package_end}. Thank you for continuing with us!',
          message_template_invoice: data.message_template_invoice || 'Thank you for your purchase! Invoice #{invoice_number} for {total_amount}. Visit us at {academy_address}. Contact: {academy_phone}',
          invoice_footer_text: data.invoice_footer_text || 'Thank you for your business! We appreciate your trust in us.',
          auto_send_expired_message: data.auto_send_expired_message || false,
          expired_message_days_interval: data.expired_message_days_interval || 7,
          admin_email: data.admin_email || '',
          enable_daily_reports: data.enable_daily_reports || false,
          enable_data_reset: data.enable_data_reset || false,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResetCounts() {
    try {
      const [studentsCount, attendanceCount, examsCount, expensesCount, invoicesCount] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
        supabase.from('exam_participation').select('*', { count: 'exact', head: true }),
        supabase.from('expenses').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
      ]);

      setResetCounts({
        students: studentsCount.count || 0,
        attendance: attendanceCount.count || 0,
        exams: examsCount.count || 0,
        expenses: expensesCount.count || 0,
        invoices: invoicesCount.count || 0,
      });
    } catch (error) {
      console.error('Error loading reset counts:', error);
    }
  }

  function openResetModal() {
    loadResetCounts();
    setShowResetModal(true);
    setResetConfirmText('');
    setResetPassword('');
  }

  async function performDataReset() {
    if (resetConfirmText !== 'RESET') {
      alert('Please type RESET to confirm');
      return;
    }

    if (!resetPassword) {
      alert('Please enter your password');
      return;
    }

    if (!confirm('This action CANNOT be undone. All student data, attendance, exams, expenses, and invoices will be PERMANENTLY deleted. Are you absolutely sure?')) {
      return;
    }

    try {
      setResetting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: resetPassword,
      });

      if (signInError) {
        alert('Incorrect password');
        return;
      }

      await supabase.from('promotion_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('exam_participation').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('exam_invitations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('attendance_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      alert('All data has been successfully reset!');
      setShowResetModal(false);
      loadResetCounts();
    } catch (error: any) {
      console.error('Error resetting data:', error);
      alert(`Error resetting data: ${error?.message || 'Unknown error'}`);
    } finally {
      setResetting(false);
    }
  }

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && profile) {
        setProfileData({
          full_name: profile.full_name || '',
          email: user.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase
          .from('settings')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', settings.id);
        if (error) throw error;
        alert('Settings saved successfully!');
        loadSettings();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Error changing password');
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileData.full_name || !profileData.email) {
      setProfileError('Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const emailChanged = user && user.email !== profileData.email;

      if (emailChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update',
            user_id: profile?.id,
            full_name: profileData.full_name,
            email: profileData.email,
            role: profile?.role,
            branch_id: profile?.branch_id,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to update profile');
        }
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: profileData.full_name })
          .eq('id', profile?.id);

        if (profileError) throw profileError;
      }

      setProfileSuccess('Profile updated successfully! Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setProfileError(error.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure your academy details and system preferences</p>
      </div>

      <div className="mb-6 flex gap-4 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'general'
              ? 'text-red-700 border-b-2 border-red-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            General Settings
          </div>
        </button>
        {profile?.role === 'super_admin' && (
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'permissions'
                ? 'text-red-700 border-b-2 border-red-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Role Permissions
            </div>
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'security'
              ? 'text-red-700 border-b-2 border-red-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Security
          </div>
        </button>
        {profile?.role === 'super_admin' && (
          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'danger'
                ? 'text-red-700 border-b-2 border-red-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </div>
          </button>
        )}
      </div>

      {activeTab === 'permissions' && profile?.role === 'super_admin' ? (
        <PermissionsManager />
      ) : activeTab === 'danger' && profile?.role === 'super_admin' ? (
        <div className="space-y-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <h2 className="text-2xl font-bold text-red-900">Danger Zone</h2>
                <p className="text-red-700 text-sm">Irreversible actions that affect all system data</p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Reset Feature</h3>
              <p className="text-gray-700 mb-4 text-sm">
                Enable the data reset button below. This allows you to permanently delete all students, attendance records, exams, expenses, and invoices from the system.
              </p>

              <label className="flex items-center gap-3 cursor-pointer p-4 border-2 rounded-lg hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  checked={formData.enable_data_reset}
                  onChange={(e) => setFormData({ ...formData, enable_data_reset: e.target.checked })}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <div>
                  <span className="font-semibold text-gray-900">Enable Data Reset Feature</span>
                  <p className="text-sm text-gray-600">When enabled, the reset button will appear below</p>
                </div>
              </label>

              {formData.enable_data_reset !== settings?.enable_data_reset && (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Setting'}
                </button>
              )}
            </div>

            {formData.enable_data_reset && (
              <div className="bg-white rounded-lg p-6 border-2 border-red-300">
                <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  Reset All Data
                </h3>
                <p className="text-gray-700 mb-4 text-sm">
                  This will permanently delete:
                </p>
                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-red-600">✗</span> All student records
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-600">✗</span> All attendance records
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-600">✗</span> All exam participation records
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-600">✗</span> All expenses
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-600">✗</span> All invoices
                  </li>
                </ul>
                <p className="text-sm text-green-700 mb-6 font-medium">
                  ✓ System settings, branches, users, packages, and belt ranks will be preserved
                </p>

                <button
                  onClick={openResetModal}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Reset All Data
                </button>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'security' ? (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-6 h-6 text-red-700" />
              <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {profileSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Updating Profile...' : 'Update Profile'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <Key className="w-6 h-6 text-red-700" />
              <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {passwordSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <Key className="w-5 h-5" />
                {saving ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your password must be at least 6 characters long. After changing your password, you will remain logged in.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-6 h-6 text-red-700" />
            <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academy/Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.academy_name}
                onChange={(e) => setFormData({ ...formData, academy_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Enter your academy name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Slogan/Tagline</label>
              <input
                type="text"
                value={formData.company_slogan}
                onChange={(e) => setFormData({ ...formData, company_slogan: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Excellence in Martial Arts Training"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a URL to your logo image (recommended size: 200x200px)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-6 h-6 text-red-700" />
            <h2 className="text-xl font-bold text-gray-900">Contact & Address Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <input
                type="text"
                required
                value={formData.company_address}
                onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Street address, building, area"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
              <input
                type="text"
                required
                value={formData.company_city}
                onChange={(e) => setFormData({ ...formData, company_city: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Dubai, Abu Dhabi, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <input
                type="text"
                value={formData.company_country}
                onChange={(e) => setFormData({ ...formData, company_country: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.company_phone}
                onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="+971 XX XXX XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.company_email}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="info@academy.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <input
                type="url"
                value={formData.company_website}
                onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="https://www.academy.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Registration Number (TRN) *
              </label>
              <input
                type="text"
                required
                value={formData.tax_registration_number}
                onChange={(e) => setFormData({ ...formData, tax_registration_number: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="100XXXXXXXXX00003"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for UAE tax invoices (15 digits)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">System Preferences</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="AED"
              />
              <p className="text-xs text-gray-500 mt-1">
                Currency symbol displayed throughout the app (e.g., AED, USD, SAR)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
              <select
                value={formData.default_language}
                onChange={(e) =>
                  setFormData({ ...formData, default_language: e.target.value as 'en' | 'ar' | 'hi' })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
              >
                <option value="en">English</option>
                <option value="ar">العربية (Arabic)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-16 h-10 border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="w-16 h-10 border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notifications"
                checked={formData.notifications_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, notifications_enabled: e.target.checked })
                }
                className="w-5 h-5 text-red-700 rounded focus:ring-red-700"
              />
              <label htmlFor="notifications" className="text-sm font-medium text-gray-700">
                Enable Notifications (Future Feature)
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-6 h-6 text-red-700" />
            <h2 className="text-xl font-bold text-gray-900">WhatsApp Message Templates</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expired Package Message
              </label>
              <textarea
                value={formData.message_template_expired}
                onChange={(e) => setFormData({ ...formData, message_template_expired: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Message to send when package expires"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{student_name}'}, {'{expiry_date}'}, {'{days_expired}'}, {'{academy_name}'}, {'{academy_phone}'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Welcome Message
              </label>
              <textarea
                value={formData.message_template_registration}
                onChange={(e) => setFormData({ ...formData, message_template_registration: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Welcome message for new registrations"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{student_name}'}, {'{academy_name}'}, {'{package_start}'}, {'{package_end}'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Package Renewal Message
              </label>
              <textarea
                value={formData.message_template_renewal}
                onChange={(e) => setFormData({ ...formData, message_template_renewal: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Message after package renewal"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{student_name}'}, {'{package_start}'}, {'{package_end}'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Message
              </label>
              <textarea
                value={formData.message_template_invoice}
                onChange={(e) => setFormData({ ...formData, message_template_invoice: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Message to send with invoice"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{invoice_number}'}, {'{total_amount}'}, {'{academy_address}'}, {'{academy_phone}'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Footer Text
              </label>
              <textarea
                value={formData.invoice_footer_text}
                onChange={(e) => setFormData({ ...formData, invoice_footer_text: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="Footer text on printed invoices"
              />
              <p className="text-xs text-gray-500 mt-1">
                This text will appear at the bottom of all invoices
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-4">Automatic Messaging</h3>

              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="auto_send"
                  checked={formData.auto_send_expired_message}
                  onChange={(e) =>
                    setFormData({ ...formData, auto_send_expired_message: e.target.checked })
                  }
                  className="w-5 h-5 text-red-700 rounded focus:ring-red-700"
                />
                <label htmlFor="auto_send" className="text-sm font-medium text-gray-700">
                  Automatically send expired package reminders
                </label>
              </div>

              {formData.auto_send_expired_message && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send reminder every (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.expired_message_days_interval}
                    onChange={(e) =>
                      setFormData({ ...formData, expired_message_days_interval: parseInt(e.target.value) || 7 })
                    }
                    className="w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    System will remind expired students every {formData.expired_message_days_interval} days
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-6 h-6 text-red-700" />
            <h2 className="text-xl font-bold text-gray-900">Email Reports Configuration</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email Address
              </label>
              <input
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                placeholder="admin@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email address to receive daily registration reports
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enable_daily_reports"
                checked={formData.enable_daily_reports}
                onChange={(e) =>
                  setFormData({ ...formData, enable_daily_reports: e.target.checked })
                }
                className="w-5 h-5 text-red-700 rounded focus:ring-red-700"
              />
              <label htmlFor="enable_daily_reports" className="text-sm font-medium text-gray-700">
                Enable Daily Registration Reports
              </label>
            </div>

            {formData.enable_daily_reports && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Daily Report includes:</strong>
                </p>
                <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                  <li>Students registered today</li>
                  <li>Branch name</li>
                  <li>Scheme/Package selected</li>
                  <li>Amount paid and payment method</li>
                  <li>Contact information (phone, email)</li>
                  <li>All student data (except photo)</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3">
                  Reports are sent automatically every day at 11:59 PM
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> These details will appear on all invoices and official documents. Ensure all information is accurate and complies with UAE regulations.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
        </form>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b bg-red-50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <h2 className="text-2xl font-bold text-red-900">Confirm Data Reset</h2>
              </div>
              <button onClick={() => setShowResetModal(false)}>
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>WARNING:</strong> This action is PERMANENT and CANNOT be undone. All data will be lost forever.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Data to be Deleted:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-gray-600">Students</p>
                    <p className="text-2xl font-bold text-red-600">{resetCounts.students}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-gray-600">Attendance Records</p>
                    <p className="text-2xl font-bold text-red-600">{resetCounts.attendance}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-gray-600">Exam Records</p>
                    <p className="text-2xl font-bold text-red-600">{resetCounts.exams}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-gray-600">Expenses</p>
                    <p className="text-2xl font-bold text-red-600">{resetCounts.expenses}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-gray-600">Invoices</p>
                    <p className="text-2xl font-bold text-red-600">{resetCounts.invoices}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-2">Data to be Preserved:</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>✓ System settings</li>
                  <li>✓ User accounts</li>
                  <li>✓ Branches</li>
                  <li>✓ Packages</li>
                  <li>✓ Belt ranks</li>
                  <li>✓ Schemes</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Type RESET to confirm *
                </label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Type RESET in all caps"
                  className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Enter your password to authorize *
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Your account password"
                  className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={performDataReset}
                  disabled={resetting || resetConfirmText !== 'RESET' || !resetPassword}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
