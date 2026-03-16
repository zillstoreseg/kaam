import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CalendarCheck, Trophy, DollarSign, BarChart, Sparkles,
  Check, Menu, X, ChevronRight, ArrowRight, Shield, Zap, Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LandingContent {
  hero?: {
    headline: string;
    subheadline: string;
    cta_primary: string;
    cta_secondary: string;
  };
  features?: {
    title: string;
    features: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
  how_it_works?: {
    title: string;
    steps: Array<{
      number: number;
      title: string;
      description: string;
    }>;
  };
  faq?: {
    title: string;
    questions: Array<{
      question: string;
      answer: string;
    }>;
  };
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_students: number;
  max_branches: number;
  features: string[];
  display_order: number;
}

const iconMap: Record<string, any> = {
  users: Users,
  'calendar-check': CalendarCheck,
  trophy: Trophy,
  'dollar-sign': DollarSign,
  'bar-chart': BarChart,
  sparkles: Sparkles,
};

export default function LandingPage() {
  const [content, setContent] = useState<LandingContent>({});
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    loadContent();
    loadPlans();

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadContent = async () => {
    const { data } = await supabase
      .from('landing_page_content')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data) {
      const contentObj: LandingContent = {};
      data.forEach(item => {
        contentObj[item.section as keyof LandingContent] = item.content;
      });
      setContent(contentObj);
    }
  };

  const loadPlans = async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data) {
      setPlans(data);
    }
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
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
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
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 60px rgba(6, 182, 212, 0.3);
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-900/95 backdrop-blur-lg shadow-lg shadow-cyan-500/10' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center group">
              <div className="relative">
                <Trophy className="w-10 h-10 text-cyan-400 animate-pulse-glow" />
                <div className="absolute inset-0 blur-xl bg-cyan-400 opacity-50 animate-pulse-glow"></div>
              </div>
              <span className="ml-3 text-2xl font-bold gradient-text">DOJO CLOUD</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-300 hover:text-cyan-400 transition-all relative group">
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#showcase" className="text-slate-300 hover:text-cyan-400 transition-all relative group">
                Showcase
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#pricing" className="text-slate-300 hover:text-cyan-400 transition-all relative group">
                Pricing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </a>
              <a href="#faq" className="text-slate-300 hover:text-cyan-400 transition-all relative group">
                FAQ
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
              </a>
              <Link
                to="/login"
                className="text-slate-300 hover:text-cyan-400 transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="relative group overflow-hidden bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/80 transition-all"
              >
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
            </div>

            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass-effect border-t border-slate-800">
            <div className="px-4 py-6 space-y-4">
              <a href="#features" className="block text-slate-300 hover:text-cyan-400">Features</a>
              <a href="#showcase" className="block text-slate-300 hover:text-cyan-400">Showcase</a>
              <a href="#pricing" className="block text-slate-300 hover:text-cyan-400">Pricing</a>
              <a href="#faq" className="block text-slate-300 hover:text-cyan-400">FAQ</a>
              <Link to="/login" className="block text-slate-300 hover:text-cyan-400">Sign In</Link>
              <Link
                to="/register"
                className="block bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-6 py-3 rounded-xl text-center font-semibold"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        )}
      </nav>

      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left space-y-8">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="gradient-text">
                  {content.hero?.headline || 'Transform Your Dojo'}
                </span>
                <br />
                <span className="text-white">Into a Digital Powerhouse</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-300 leading-relaxed">
                {content.hero?.subheadline || 'The all-in-one cloud platform for modern martial arts academies. Manage students, track progress, and grow your business seamlessly.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/80 transition-all inline-flex items-center justify-center"
                >
                  <span className="relative z-10 flex items-center">
                    {content.hero?.cta_primary || 'Start Free Trial'}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>
                <a
                  href="#showcase"
                  className="glass-effect border-2 border-cyan-500/50 text-white px-8 py-4 rounded-xl text-lg font-bold hover:border-cyan-500 hover:bg-cyan-500/10 transition-all inline-flex items-center justify-center"
                >
                  See It In Action
                </a>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="glass-effect p-4 rounded-xl text-center card-hover">
                  <div className="text-3xl font-bold gradient-text">14 Days</div>
                  <div className="text-slate-400 mt-1 text-sm">Free Trial</div>
                </div>
                <div className="glass-effect p-4 rounded-xl text-center card-hover">
                  <div className="text-3xl font-bold gradient-text">No Card</div>
                  <div className="text-slate-400 mt-1 text-sm">Required</div>
                </div>
                <div className="glass-effect p-4 rounded-xl text-center card-hover">
                  <div className="text-3xl font-bold gradient-text">24/7</div>
                  <div className="text-slate-400 mt-1 text-sm">Support</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-3xl blur-2xl opacity-30 animate-pulse-glow"></div>
              <img
                src="https://images.pexels.com/photos/7045704/pexels-photo-7045704.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Martial Arts Training"
                className="relative rounded-3xl shadow-2xl shadow-cyan-500/50 w-full h-auto object-cover card-hover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Powerful Features</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Everything you need to run your martial arts academy efficiently and professionally
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Users, title: 'Student Management', desc: 'Complete student profiles with belt tracking, medical info, and progress reports' },
              { icon: CalendarCheck, title: 'Attendance Tracking', desc: 'Real-time check-ins with automated reports and alerts for inactive members' },
              { icon: Trophy, title: 'Tournament & Exams', desc: 'Organize events, track eligibility, and manage belt promotions seamlessly' },
              { icon: DollarSign, title: 'Payment Processing', desc: 'Automated billing, invoicing, and revenue tracking with multiple payment methods' },
              { icon: BarChart, title: 'Analytics & Reports', desc: 'Deep insights into academy performance with customizable dashboards' },
              { icon: Shield, title: 'Security First', desc: 'Bank-level encryption with role-based access control and audit logs' },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="glass-effect p-8 rounded-2xl card-hover group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="relative w-full h-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20">
                      <Icon className="w-8 h-8 text-cyan-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="showcase" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl blur-2xl opacity-30"></div>
              <img
                src="https://images.pexels.com/photos/7045689/pexels-photo-7045689.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Dojo Management Dashboard"
                className="relative rounded-3xl shadow-2xl shadow-emerald-500/50 w-full h-auto object-cover card-hover"
              />
            </div>

            <div className="space-y-6 order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-bold">
                <span className="gradient-text">Manage Everything</span>
                <br />
                <span className="text-white">From One Dashboard</span>
              </h2>
              <p className="text-xl text-slate-300 leading-relaxed">
                Get a bird's eye view of your entire academy operations. Track attendance, manage memberships, process payments, and monitor growth all from one intuitive interface.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  { icon: Zap, text: 'Lightning-fast performance' },
                  { icon: Globe, text: 'Access from anywhere, anytime' },
                  { icon: Shield, text: 'Enterprise-grade security' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 glass-effect p-4 rounded-xl card-hover">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="text-lg text-white font-semibold">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Simple Pricing</span>
            </h2>
            <p className="text-xl text-slate-300 mb-10">Choose the perfect plan for your academy</p>

            <div className="inline-flex items-center glass-effect rounded-2xl p-2">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-8 py-3 rounded-xl transition-all font-semibold ${
                  billingPeriod === 'monthly'
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-8 py-3 rounded-xl transition-all font-semibold ${
                  billingPeriod === 'yearly'
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Yearly <span className="text-sm ml-2">Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`glass-effect rounded-3xl p-8 card-hover relative ${
                  plan.name === 'Professional' ? 'ring-2 ring-cyan-500 shadow-2xl shadow-cyan-500/50' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.name === 'Professional' && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-white mb-3">{plan.name}</h3>
                  <p className="text-slate-400 mb-6">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-5xl font-bold gradient-text">
                      {plan.currency === 'USD' ? '$' : plan.currency}
                      {billingPeriod === 'monthly' ? plan.price_monthly : (plan.price_yearly / 12).toFixed(2)}
                    </span>
                    <span className="text-slate-400 text-lg">/month</span>
                  </div>
                  {billingPeriod === 'yearly' && (
                    <p className="text-sm text-slate-500">
                      Billed ${plan.price_yearly} annually
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-cyan-400" />
                      </div>
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`block w-full text-center py-4 rounded-xl font-bold transition-all ${
                    plan.name === 'Professional'
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/80'
                      : 'glass-effect text-white hover:bg-cyan-500/10 border border-cyan-500/50 hover:border-cyan-500'
                  }`}
                >
                  Start Free Trial
                </Link>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Up to {plan.max_students === 999999 ? 'unlimited' : plan.max_students} students
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">{content.faq?.title || 'FAQ'}</span>
            </h2>
            <p className="text-xl text-slate-300">Everything you need to know</p>
          </div>

          <div className="space-y-4">
            {(content.faq?.questions || []).map((item, index) => (
              <div key={index} className="glass-effect rounded-2xl overflow-hidden card-hover">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full px-8 py-6 text-left flex justify-between items-center hover:bg-cyan-500/5 transition-all"
                >
                  <span className="font-bold text-lg text-white">{item.question}</span>
                  <ChevronRight
                    className={`w-6 h-6 text-cyan-400 transition-transform ${
                      openFaqIndex === index ? 'transform rotate-90' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="px-8 pb-6 border-t border-slate-800">
                    <p className="text-slate-300 pt-4 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Ready to Elevate</span>
            <br />
            <span className="text-white">Your Academy?</span>
          </h2>
          <p className="text-xl text-slate-300 mb-10">
            Join hundreds of martial arts academies worldwide using DOJO CLOUD to transform their operations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-emerald-500 text-white px-10 py-5 rounded-xl text-lg font-bold shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/80 transition-all inline-flex items-center justify-center"
            >
              <span className="relative z-10 flex items-center">
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            <a
              href="#pricing"
              className="glass-effect border-2 border-cyan-500/50 text-white px-10 py-5 rounded-xl text-lg font-bold hover:border-cyan-500 hover:bg-cyan-500/10 transition-all inline-flex items-center justify-center"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center mb-6">
                <div className="relative">
                  <Trophy className="w-8 h-8 text-cyan-400" />
                  <div className="absolute inset-0 blur-xl bg-cyan-400 opacity-50"></div>
                </div>
                <span className="ml-3 text-xl font-bold gradient-text">DOJO CLOUD</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                The complete cloud-based management platform for modern martial arts academies worldwide.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4 text-lg">Product</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="text-slate-400 hover:text-cyan-400 transition">Features</a></li>
                <li><a href="#pricing" className="text-slate-400 hover:text-cyan-400 transition">Pricing</a></li>
                <li><a href="#faq" className="text-slate-400 hover:text-cyan-400 transition">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4 text-lg">Company</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition">About Us</a></li>
                <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition">Contact</a></li>
                <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition">Support</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4 text-lg">Legal</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-400 hover:text-cyan-400 transition">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500 text-sm">&copy; 2024 DOJO CLOUD. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
