import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    academyName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    city: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.ownerName,
            academy_name: formData.academyName,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        const domainSlug = formData.academyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

        const { data: academy, error: academyError } = await supabase
          .from('academies')
          .insert({
            name: formData.academyName,
            domain: domainSlug,
            status: 'active',
            subscription_status: 'trial',
            expires_at: trialEndsAt.toISOString(),
          })
          .select()
          .single();

        if (academyError) throw academyError;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            academy_id: academy.id,
            platform_role: 'academy_admin',
            role: 'super_admin',
            full_name: formData.ownerName,
            email: formData.email,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        const { error: settingsError } = await supabase
          .from('settings')
          .insert({
            academy_id: academy.id,
            academy_name: formData.academyName,
            language: 'en',
            currency_symbol: '$',
          });

        if (settingsError) console.error('Settings creation failed:', settingsError);

        await supabase
          .from('branches')
          .insert({
            academy_id: academy.id,
            name: 'Main Branch',
            location: formData.city || 'Main Location',
            is_active: true,
          });

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
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

      <nav className="p-4">
        <Link to="/" className="inline-flex items-center text-slate-300 hover:text-cyan-400 transition">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex items-center">
                <div className="relative">
                  <Trophy className="w-10 h-10 text-cyan-400 animate-pulse-glow" />
                  <div className="absolute inset-0 blur-xl bg-cyan-400 opacity-50 animate-pulse-glow"></div>
                </div>
                <span className="ml-3 text-2xl font-bold gradient-text">DOJO CLOUD</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Start Your Free Trial</h1>
            <p className="text-slate-300">14 days free, no credit card required</p>
          </div>

          <div className="glass-effect rounded-2xl shadow-2xl p-8 border border-cyan-500/20">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Academy Name
                  </label>
                  <input
                    type="text"
                    name="academyName"
                    required
                    value={formData.academyName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    placeholder="Your Academy Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    required
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    placeholder="Your Full Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                    placeholder="United States"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                  placeholder="New York"
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 text-cyan-500 bg-slate-800 border-slate-700 rounded focus:ring-cyan-500"
                />
                <label className="ml-2 text-sm text-slate-300">
                  I agree to the{' '}
                  <a href="#" className="text-cyan-400 hover:text-cyan-300">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-cyan-400 hover:text-cyan-300">Privacy Policy</a>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Start Free Trial'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Sign in
              </Link>
            </div>
          </div>

          <div className="mt-8 glass-effect border border-cyan-500/20 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">What happens next?</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start">
                <span className="font-bold text-cyan-400 mr-3">1.</span>
                <span>Your 14-day free trial starts immediately</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-cyan-400 mr-3">2.</span>
                <span>Set up your academy, add students, and explore features</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-cyan-400 mr-3">3.</span>
                <span>Choose a plan that fits your academy when ready</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
