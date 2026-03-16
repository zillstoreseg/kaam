import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Settings as SettingsType } from '../lib/supabase';
import { Trophy, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) setSettings(data as SettingsType);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [profileRes, platformRoleRes] = await Promise.all([
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
          supabase.from('platform_roles').select('role').eq('user_id', user.id).maybeSingle(),
        ]);

        const isPlatformOwner =
          profileRes.data?.role === 'platform_owner' ||
          platformRoleRes.data?.role === 'owner' ||
          platformRoleRes.data?.role === 'super_owner';

        if (isPlatformOwner) {
          navigate('/platform-admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .gradient-text {
          background: linear-gradient(135deg, #06b6d4, #10b981, #06b6d4);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-shift 3s ease infinite;
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <div className="max-w-md w-full">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-slate-300 hover:text-cyan-400 transition">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="glass-effect rounded-2xl shadow-2xl p-8 border border-cyan-500/20">
          <div className="text-center mb-8">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-20 mx-auto mb-4" />
            ) : (
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <Trophy className="w-16 h-16 text-cyan-400 animate-pulse-glow" />
                  <div className="absolute inset-0 blur-xl bg-cyan-400 opacity-50 animate-pulse-glow"></div>
                </div>
              </div>
            )}
            <h1 className="text-4xl font-bold gradient-text mb-2">
              {settings?.academy_name || 'DOJO CLOUD'}
            </h1>
            <p className="text-slate-300">
              {settings?.company_slogan || 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : t('auth.login')}
            </button>

            <div className="mt-6 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition">
                Sign up for free
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 text-center">
              <p className="text-xs text-slate-500 mb-2">Platform Admin?</p>
              <p className="text-xs text-slate-400">
                Use your platform owner credentials to access admin features
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
