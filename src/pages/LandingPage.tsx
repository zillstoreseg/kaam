import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CalendarCheck, Trophy, DollarSign, BarChart, Sparkles,
  Check, Menu, X, ChevronRight, ArrowRight, Shield, Zap, Globe, Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const LIMITS_KEY = 'dojo_plan_limits';

interface StoredPlanLimits {
  max_students: number;
  max_branches: number;
  price_yearly: number;
  is_trial: boolean;
  trial_days: number;
  is_popular: boolean;
  display_order: number;
  is_visible: boolean;
  currency: string;
}

interface DisplayPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_students: number;
  max_branches: number;
  is_popular: boolean;
  is_trial: boolean;
  trial_days: number;
  display_order: number;
  features: string[];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', SAR: 'SAR', AED: 'AED', KWD: 'KWD', BHD: 'BHD', QAR: 'QAR',
};

const PLAN_FEATURES: Record<string, string[]> = {
  Basic: ['Student Management', 'Attendance Tracking', 'Belt Ranking', 'Basic Reports', 'Email Support'],
  Pro: ['Everything in Basic', 'Multiple Branches', 'Advanced Analytics', 'Invoicing & Billing', 'Exam Management', 'Priority Support'],
  Elite: ['Everything in Pro', 'Unlimited Branches', 'Custom Reports', 'Security Suite', 'API Access', 'Dedicated Support'],
};

function getStoredPlanLimits(): Record<string, StoredPlanLimits> {
  try {
    return JSON.parse(localStorage.getItem(LIMITS_KEY) || '{}');
  } catch {
    return {};
  }
}

const MARTIAL_ARTS_IMAGES = [
  'https://images.pexels.com/photos/4761671/pexels-photo-4761671.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/6296042/pexels-photo-6296042.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/4384679/pexels-photo-4384679.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/7045405/pexels-photo-7045405.jpeg?auto=compress&cs=tinysrgb&w=900',
];

export default function LandingPage() {
  const [plans, setPlans] = useState<DisplayPlan[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data: dbPlans } = await supabase
        .from('plans')
        .select('id, name, description, price_monthly')
        .order('name');

      const storedLimits = getStoredPlanLimits();

      if (dbPlans && dbPlans.length > 0) {
        const merged: DisplayPlan[] = dbPlans
          .map((plan) => {
            const stored = storedLimits[plan.id];
            const isVisible = stored ? stored.is_visible !== false : true;
            if (!isVisible) return null;

            return {
              id: plan.id,
              name: plan.name,
              description: plan.description || `The ${plan.name} plan for your academy`,
              price_monthly: plan.price_monthly || 0,
              price_yearly: stored?.price_yearly ?? Math.round(plan.price_monthly * 10),
              currency: stored?.currency ?? 'USD',
              max_students: stored?.max_students ?? 0,
              max_branches: stored?.max_branches ?? 0,
              is_popular: stored?.is_popular ?? false,
              is_trial: stored?.is_trial ?? false,
              trial_days: stored?.trial_days ?? 14,
              display_order: stored?.display_order ?? 0,
              features: PLAN_FEATURES[plan.name] || ['Student Management', 'Attendance Tracking', 'Basic Reports'],
            };
          })
          .filter(Boolean) as DisplayPlan[];

        merged.sort((a, b) => a.display_order - b.display_order || a.price_monthly - b.price_monthly);
        setPlans(merged);
      } else {
        setPlans(getFallbackPlans());
      }
    } catch {
      setPlans(getFallbackPlans());
    } finally {
      setPlansLoading(false);
    }
  };

  const getFallbackPlans = (): DisplayPlan[] => [
    {
      id: '1', name: 'Basic', description: 'Perfect for small academies just getting started',
      price_monthly: 29, price_yearly: 290, currency: 'USD', max_students: 50, max_branches: 1,
      is_popular: false, is_trial: false, trial_days: 14, display_order: 1,
      features: PLAN_FEATURES['Basic'],
    },
    {
      id: '2', name: 'Pro', description: 'For growing academies with multiple programs',
      price_monthly: 79, price_yearly: 799, currency: 'USD', max_students: 200, max_branches: 3,
      is_popular: true, is_trial: false, trial_days: 14, display_order: 2,
      features: PLAN_FEATURES['Pro'],
    },
    {
      id: '3', name: 'Elite', description: 'Full-featured solution for large academies',
      price_monthly: 149, price_yearly: 1499, currency: 'USD', max_students: 0, max_branches: 0,
      is_popular: false, is_trial: false, trial_days: 14, display_order: 3,
      features: PLAN_FEATURES['Elite'],
    },
  ];

  const formatPrice = (plan: DisplayPlan, period: 'monthly' | 'yearly') => {
    const symbol = CURRENCY_SYMBOLS[plan.currency] || plan.currency + ' ';
    const price = period === 'monthly' ? plan.price_monthly : Math.round(plan.price_yearly / 12);
    return { symbol, price };
  };

  const yearlySaving = (plan: DisplayPlan) => {
    const monthlyCost = plan.price_monthly * 12;
    const yearlyCost = plan.price_yearly;
    if (monthlyCost === 0) return 0;
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        .gradient-text {
          background: linear-gradient(135deg, #06b6d4, #10b981, #06b6d4);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-shift 3s ease infinite;
        }
        .card-hover {
          transition: all 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 60px rgba(6, 182, 212, 0.25);
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .plan-popular {
          background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(16,185,129,0.15));
          border: 1px solid rgba(6,182,212,0.4);
        }
        .img-overlay {
          background: linear-gradient(to bottom, transparent 40%, rgba(15,23,42,0.85) 100%);
        }
      `}</style>

      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-900/95 backdrop-blur-lg shadow-lg shadow-cyan-500/10' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="relative">
                <Trophy className="w-10 h-10 text-cyan-400 animate-pulse-glow" />
                <div className="absolute inset-0 blur-xl bg-cyan-400 opacity-40 animate-pulse-glow"></div>
              </div>
              <span className="ml-3 text-2xl font-bold gradient-text">DOJO CLOUD</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              {['#features', '#gallery', '#pricing', '#faq'].map((href, i) => (
                <a key={href} href={href} className="text-slate-300 hover:text-cyan-400 transition-all relative group capitalize">
                  {['Features', 'Gallery', 'Pricing', 'FAQ'][i]}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
                </a>
              ))}
              <Link to="/login" className="text-slate-300 hover:text-cyan-400 transition-all">Sign In</Link>
              <Link
                to="/register"
                className="relative group overflow-hidden bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-cyan-500/40 hover:shadow-cyan-500/70 transition-all"
              >
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
            </div>

            <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass-effect border-t border-slate-800">
            <div className="px-4 py-6 space-y-4">
              <a href="#features" className="block text-slate-300 hover:text-cyan-400">Features</a>
              <a href="#gallery" className="block text-slate-300 hover:text-cyan-400">Gallery</a>
              <a href="#pricing" className="block text-slate-300 hover:text-cyan-400">Pricing</a>
              <a href="#faq" className="block text-slate-300 hover:text-cyan-400">FAQ</a>
              <Link to="/login" className="block text-slate-300 hover:text-cyan-400">Sign In</Link>
              <Link to="/register" className="block bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-6 py-3 rounded-xl text-center font-semibold">
                Start Free Trial
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-800/30 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 glass-effect px-4 py-2 rounded-full text-sm text-cyan-300 font-medium">
                <Sparkles className="w-4 h-4" />
                The Future of Dojo Management
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                <span className="gradient-text">Transform Your</span>
                <br />
                <span className="text-white">Martial Arts</span>
                <br />
                <span className="text-slate-300 text-4xl md:text-5xl font-semibold">Academy Today</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-lg">
                The all-in-one cloud platform built for modern dojos. Manage students, track belt progression, process payments, and grow your academy — all from one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-500/70 transition-all inline-flex items-center justify-center"
                >
                  <span className="relative z-10 flex items-center">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>
                <a
                  href="#gallery"
                  className="glass-effect border border-cyan-500/40 text-white px-8 py-4 rounded-xl text-lg font-bold hover:border-cyan-500 hover:bg-cyan-500/10 transition-all inline-flex items-center justify-center"
                >
                  See It In Action
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                {[
                  { value: '14 Days', label: 'Free Trial' },
                  { value: 'No Card', label: 'Required' },
                  { value: '24/7', label: 'Support' },
                ].map((stat, i) => (
                  <div key={i} className="glass-effect p-4 rounded-xl text-center card-hover">
                    <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                    <div className="text-slate-500 mt-1 text-xs font-medium uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-3xl blur-3xl opacity-25 animate-pulse-glow"></div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/40 card-hover">
                <img
                  src={MARTIAL_ARTS_IMAGES[0]}
                  alt="Martial Arts Training"
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: '540px', objectFit: 'cover' }}
                />
                <div className="absolute inset-0 img-overlay"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="glass-effect rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">Belt Promotion Tracking</div>
                      <div className="text-slate-400 text-xs mt-0.5">Automated progress monitoring</div>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat Bar */}
      <section className="py-12 px-4 border-y border-slate-800/60 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Academies Worldwide' },
              { value: '50K+', label: 'Students Managed' },
              { value: '99.9%', label: 'Uptime Guarantee' },
              { value: '4.9/5', label: 'Customer Rating' },
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="text-4xl font-bold gradient-text">{stat.value}</div>
                <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 glass-effect px-4 py-2 rounded-full text-sm text-cyan-300 font-medium mb-6">
              <Zap className="w-4 h-4" />
              Built for Dojos
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Everything You Need</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Purpose-built tools for martial arts academies, designed to save time and help you focus on what matters — teaching
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Student Management', desc: 'Complete profiles with belt tracking, medical info, photos, and full training history', color: 'from-cyan-500 to-cyan-600' },
              { icon: CalendarCheck, title: 'Attendance Tracking', desc: 'Real-time check-ins, automated alerts for inactive members, and detailed attendance reports', color: 'from-emerald-500 to-emerald-600' },
              { icon: Trophy, title: 'Belt & Exam System', desc: 'Organize belt exams, track promotion eligibility, and manage rank advancement automatically', color: 'from-amber-500 to-orange-500' },
              { icon: DollarSign, title: 'Billing & Invoicing', desc: 'Automated billing cycles, digital invoices, and comprehensive revenue analytics', color: 'from-rose-500 to-pink-600' },
              { icon: BarChart, title: 'Advanced Analytics', desc: 'Deep insights into growth metrics, attendance trends, and financial performance', color: 'from-blue-500 to-blue-600' },
              { icon: Shield, title: 'Security & Roles', desc: 'Role-based access control, audit logs, and enterprise-grade data protection', color: 'from-slate-500 to-slate-600' },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="glass-effect p-8 rounded-2xl card-hover group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl opacity-5 group-hover:opacity-10 transition-opacity rounded-bl-full" style={{ background: `linear-gradient(to bottom left, var(--tw-gradient-from), transparent)` }}></div>
                  <div className={`w-14 h-14 mb-6 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Built for Champions</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Trusted by martial arts academies teaching every discipline — Karate, BJJ, Muay Thai, Taekwondo, and more
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MARTIAL_ARTS_IMAGES.slice(1).map((src, index) => (
              <div key={index} className={`relative rounded-2xl overflow-hidden card-hover ${index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}>
                <img
                  src={src}
                  alt={`Martial Arts ${index + 1}`}
                  className="w-full object-cover"
                  style={{ height: index === 0 ? '360px' : '280px' }}
                />
                <div className="absolute inset-0 img-overlay"></div>
                <div className="absolute bottom-4 left-4">
                  <div className="glass-effect px-3 py-1.5 rounded-lg text-xs text-white font-medium">
                    {['Training Excellence', 'Competition Ready', 'Expert Coaching'][index]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold">
                <span className="gradient-text">Manage Everything</span>
                <br />
                <span className="text-white">From One Dashboard</span>
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Get a complete view of your academy operations. Track attendance, manage memberships, process payments, and monitor growth from a single intuitive interface accessible from any device.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Zap, text: 'Lightning-fast, mobile-ready interface' },
                  { icon: Globe, text: 'Access from anywhere, on any device' },
                  { icon: Shield, text: 'Enterprise-grade security built in' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 glass-effect p-4 rounded-xl card-hover">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="text-white font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl blur-2xl opacity-20"></div>
              <img
                src={MARTIAL_ARTS_IMAGES[0]}
                alt="Dojo Training"
                className="relative rounded-3xl shadow-2xl shadow-emerald-500/40 w-full object-cover card-hover"
                style={{ height: '400px', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass-effect px-4 py-2 rounded-full text-sm text-cyan-300 font-medium mb-6">
              <DollarSign className="w-4 h-4" />
              Transparent Pricing
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Simple, Honest Pricing</span>
            </h2>
            <p className="text-lg text-slate-400 mb-10">Choose the perfect plan for your academy size and goals</p>

            <div className="inline-flex items-center glass-effect rounded-2xl p-1.5">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-8 py-3 rounded-xl transition-all font-semibold text-sm ${
                  billingPeriod === 'monthly'
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-8 py-3 rounded-xl transition-all font-semibold text-sm flex items-center gap-2 ${
                  billingPeriod === 'yearly'
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yearly
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-semibold">Save up to 17%</span>
              </button>
            </div>
          </div>

          {plansLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className={`grid gap-8 max-w-6xl mx-auto ${
              plans.length === 1 ? 'md:grid-cols-1 max-w-sm' :
              plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' :
              'md:grid-cols-3'
            }`}>
              {plans.map((plan, index) => {
                const { symbol, price } = formatPrice(plan, billingPeriod);
                const saving = yearlySaving(plan);
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-8 card-hover ${
                      plan.is_popular ? 'plan-popular' : 'glass-effect'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg shadow-cyan-500/40 flex items-center gap-1.5">
                          <Star className="w-3 h-3 fill-white" /> Most Popular
                        </span>
                      </div>
                    )}
                    {plan.is_trial && (
                      <div className="mb-3">
                        <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/30">
                          {plan.trial_days}-day free trial
                        </span>
                      </div>
                    )}

                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{plan.description}</p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-end gap-1">
                        <span className="text-lg font-semibold text-slate-400">{symbol}</span>
                        <span className="text-5xl font-bold gradient-text">{price}</span>
                        <span className="text-slate-500 mb-1">/mo</span>
                      </div>
                      {billingPeriod === 'yearly' && saving > 0 && (
                        <p className="text-sm text-emerald-400 mt-1">
                          Save {saving}% — {symbol}{plan.price_yearly}/year
                        </p>
                      )}
                      {billingPeriod === 'yearly' && saving === 0 && (
                        <p className="text-sm text-slate-500 mt-1">{symbol}{plan.price_yearly} billed annually</p>
                      )}
                    </div>

                    <div className="space-y-2 mb-6 pb-6 border-b border-slate-700/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Students</span>
                        <span className="text-white font-medium">
                          {plan.max_students === 0 ? 'Unlimited' : `Up to ${plan.max_students.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Branches</span>
                        <span className="text-white font-medium">
                          {plan.max_branches === 0 ? 'Unlimited' : plan.max_branches === 1 ? '1 branch' : `Up to ${plan.max_branches} branches`}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-cyan-400" />
                          </div>
                          <span className="text-slate-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/register"
                      className={`block w-full text-center py-3.5 rounded-xl font-bold transition-all text-sm ${
                        plan.is_popular
                          ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/40 hover:shadow-cyan-500/70'
                          : 'glass-effect text-white hover:bg-cyan-500/10 border border-slate-700 hover:border-cyan-500/50'
                      }`}
                    >
                      {plan.is_trial ? `Start ${plan.trial_days}-Day Free Trial` : 'Get Started'}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Got Questions?</span>
            </h2>
            <p className="text-lg text-slate-400">Everything you need to know about DOJO CLOUD</p>
          </div>

          <div className="space-y-3">
            {[
              { question: 'How long is the free trial?', answer: 'Your free trial lasts 14 days with full access to all features on your chosen plan. No credit card required to start.' },
              { question: 'Can I manage multiple branches?', answer: 'Yes! Our Pro and Elite plans support multiple branches. Each branch can have its own manager, students, and schedules with separate reports.' },
              { question: 'Is my data secure?', answer: 'Absolutely. We use bank-grade encryption and store all data on secure cloud servers with daily backups. Your data is always safe and accessible.' },
              { question: 'Can I import my existing student data?', answer: 'Yes, we support CSV import for student records. Our support team will help you migrate your existing data at no extra cost.' },
              { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, bank transfers, and various regional payment methods including local payment gateways.' },
              { question: 'Can I cancel anytime?', answer: 'Yes, you can cancel your subscription at any time with no long-term contracts or cancellation fees. Your data remains accessible for 30 days after cancellation.' },
            ].map((item, index) => (
              <div key={index} className="glass-effect rounded-2xl overflow-hidden card-hover">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-7 py-5 text-left flex justify-between items-center hover:bg-white/5 transition-all"
                >
                  <span className="font-semibold text-white pr-4">{item.question}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-cyan-400 transition-transform flex-shrink-0 ${openFaqIndex === index ? 'rotate-90' : ''}`}
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="px-7 pb-5 border-t border-slate-800/60">
                    <p className="text-slate-400 pt-4 leading-relaxed text-sm">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="glass-effect rounded-3xl p-12 md:p-16 border border-cyan-500/20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-cyan-500/40">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="gradient-text">Ready to Elevate</span>
              <br />
              <span className="text-white">Your Academy?</span>
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
              Join hundreds of martial arts academies worldwide using DOJO CLOUD to streamline operations and focus on teaching
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-10 py-4 rounded-xl text-lg font-bold shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-500/70 transition-all inline-flex items-center justify-center"
              >
                <span className="relative z-10 flex items-center">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              <a
                href="#pricing"
                className="glass-effect border border-cyan-500/40 text-white px-10 py-4 rounded-xl text-lg font-bold hover:border-cyan-500 hover:bg-cyan-500/10 transition-all inline-flex items-center justify-center"
              >
                View Pricing
              </a>
            </div>
            <p className="text-slate-500 text-sm mt-6">No credit card required &bull; 14-day free trial &bull; Cancel anytime</p>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-slate-800/60 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center mb-5">
                <div className="relative">
                  <Trophy className="w-8 h-8 text-cyan-400" />
                  <div className="absolute inset-0 blur-xl bg-cyan-400 opacity-40"></div>
                </div>
                <span className="ml-3 text-xl font-bold gradient-text">DOJO CLOUD</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                The complete cloud-based management platform for modern martial arts academies worldwide.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="text-slate-500 hover:text-cyan-400 transition">Features</a></li>
                <li><a href="#pricing" className="text-slate-500 hover:text-cyan-400 transition">Pricing</a></li>
                <li><a href="#faq" className="text-slate-500 hover:text-cyan-400 transition">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-slate-500 hover:text-cyan-400 transition">About Us</a></li>
                <li><a href="#" className="text-slate-500 hover:text-cyan-400 transition">Contact</a></li>
                <li><a href="#" className="text-slate-500 hover:text-cyan-400 transition">Support</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-slate-500 hover:text-cyan-400 transition">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-500 hover:text-cyan-400 transition">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-600 text-sm">&copy; {new Date().getFullYear()} DOJO CLOUD. All rights reserved.</p>
            <p className="text-slate-600 text-sm">Built for martial arts professionals worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
