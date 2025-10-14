import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Settings as SettingsType } from '../lib/supabase';
import { Save } from 'lucide-react';

export default function Settings() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [formData, setFormData] = useState({
    academy_name: '',
    logo_url: '',
    default_language: 'en' as 'en' | 'ar' | 'hi',
    notifications_enabled: false,
    primary_color: '#B91C1C',
    accent_color: '#F59E0B',
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
          academy_name: data.academy_name,
          logo_url: data.logo_url || '',
          default_language: data.default_language,
          notifications_enabled: data.notifications_enabled,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
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
        alert(t('common.success'));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12">{t('common.loading')}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('settings.title')}</h1>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.academyName')}
            </label>
            <input
              type="text"
              value={formData.academy_name}
              onChange={(e) => setFormData({ ...formData, academy_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.logo')} URL
            </label>
            <input
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.language')}
            </label>
            <select
              value={formData.default_language}
              onChange={(e) =>
                setFormData({ ...formData, default_language: e.target.value as 'en' | 'ar' | 'hi' })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="hi">हिंदी</option>
            </select>
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
              {t('settings.notifications')} (Future Feature)
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? t('common.loading') : t('settings.save')}
          </button>
        </form>
      </div>
    </div>
  );
}
