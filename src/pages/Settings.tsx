import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Settings as SettingsType } from '../lib/supabase';
import { Save, Building2, FileText, MessageSquare, Shield } from 'lucide-react';
import PermissionsManager from '../components/PermissionsManager';

export default function Settings() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
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
  });

  useEffect(() => {
    loadSettings();
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
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
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

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure your academy details and system preferences</p>
      </div>

      {profile?.role === 'super_admin' && (
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
        </div>
      )}

      {activeTab === 'permissions' && profile?.role === 'super_admin' ? (
        <PermissionsManager />
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
    </div>
  );
}
