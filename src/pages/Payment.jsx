import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import logo from '@/assets/amicooked_logo.png';
import { auth, githubProvider } from '@/config/firebase';
import { Button } from '@/components/ui/Button';
import { Github, Check, Zap, Crown, GraduationCap, ArrowRight, MessageSquare, RefreshCw } from 'lucide-react';

const plans = [
    {
        id: 'student',
        name: 'Student',
        icon: GraduationCap,
        iconColor: 'text-[#58a6ff]',
        iconBg: 'bg-[#1c2d4f]',
        borderColor: 'border-[#30363d]',
        badgeColor: 'bg-[#1c2d4f] text-[#58a6ff] border border-[#1f4070]',
        monthlyPrice: 3,
        yearlyPrice: 20,
        tag: null,
        highlight: false,
        description: 'Perfect for students building their first real portfolio.',
        aiMessages: '50 / month',
        regenerations: '15 / month',
        cta: 'Get Student Plan',
        ctaStyle: 'bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white',
    },
    {
        id: 'pro',
        name: 'Pro',
        icon: Zap,
        iconColor: 'text-green-400',
        iconBg: 'bg-[#12261e]',
        borderColor: 'border-[#238636]',
        badgeColor: 'bg-[#12261e] text-green-400 border border-[#238636]/40',
        monthlyPrice: 8,
        yearlyPrice: 80,
        tag: 'Most Popular',
        highlight: true,
        description: 'For developers serious about landing their next role.',
        aiMessages: '200 / month',
        regenerations: '50 / month',
        cta: 'Get Pro Plan',
        ctaStyle: 'bg-[#238636] hover:bg-[#2ea043] text-white',
    },
    {
        id: 'ultimate',
        name: 'Ultimate',
        icon: Crown,
        iconColor: 'text-orange-400',
        iconBg: 'bg-[#2d1e0f]',
        borderColor: 'border-[#f97316]/40',
        badgeColor: 'bg-[#2d1e0f] text-orange-400 border border-[#f97316]/30',
        monthlyPrice: 15,
        yearlyPrice: 100,
        tag: 'Best Results',
        highlight: false,
        description: 'Unlimited power for developers who refuse to stay cooked.',
        aiMessages: 'Unlimited',
        regenerations: 'Unlimited',
        cta: 'Get Ultimate Plan',
        ctaStyle: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white',
    },
];

const sharedFeatures = [
    'GitHub Profile Analysis',
    'Job Fit Checker',
    'Project Recommendations',
    'AI Career Coach',
    'Progress Tracking',
    'Public Data Only — Always',
];

const faqs = [
    {
        q: 'Can I cancel anytime?',
        a: 'Yes — monthly plans cancel immediately. Yearly plans are billed upfront and non-refundable.',
    },
    {
        q: 'What counts as an "AI message"?',
        a: 'Every message to the AI Career Coach or a Job Fit analysis counts as one AI message.',
    },
    {
        q: "What's a \"regeneration\"?",
        a: "When you want a fresh take on a project recommendation or analysis — that's a regeneration.",
    },
    {
        q: 'Is the Student plan really just $3/mo?',
        a: 'Yep. We built this at a hackathon. We get it.',
    },
];

export default function Pricing() {
    const [yearly, setYearly] = useState(false);
    const [hoveredPlan, setHoveredPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleGitHubSignIn = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, githubProvider);
            const credential = result._tokenResponse.oauthAccessToken;
            localStorage.setItem('github_token', credential);
            navigate('/dashboard');
        } catch (error) {
            console.error('Authentication error:', error);
            alert('Failed to sign in with GitHub. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0d1117] text-white">
            {/* Background grid */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(48,54,61,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(48,54,61,0.15) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Nav */}
            <nav className="sticky top-0 z-50 border-b border-[#30363d] bg-[#020408]">
                <div className="max-w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
                    <a href="/" className="flex items-center gap-2">
                        <img src={logo} alt="AmICooked" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" />
                        <span className="text-lg sm:text-xl font-bold">AmICooked?</span>
                    </a>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <a
                            href="/"
                            className="text-gray-400 hover:text-white hover:bg-[#161b22] border border-transparent hover:border-[#30363d] text-xs sm:text-sm transition-colors px-3 py-1.5 rounded-md"
                        >
                            ← Back to home
                        </a>
                        <Button
                            onClick={handleGitHubSignIn}
                            disabled={loading}
                            className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs sm:text-sm"
                        >
                            <Github className="mr-1 sm:mr-2 h-4 w-4" />
                            {loading ? 'Signing in...' : 'Sign in with GitHub'}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-8 text-center">
                <div className="inline-block mb-4 px-3 py-1.5 rounded-md border border-[#30363d] bg-[#161b22] text-xs sm:text-sm text-gray-400">
                    🔥 Stop being cooked. Start getting hired.
                </div>
                <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                    Simple, honest pricing.
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                        No hidden nonsense.
                    </span>
                </h1>
                <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed mb-8">
                    Whether you're just starting out or grinding hard for your next offer — there's a plan for where you are right now.
                </p>

                {/* Billing toggle */}
                <div className="inline-flex items-center gap-3 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
                    <button
                        onClick={() => setYearly(false)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                            !yearly
                                ? 'bg-[#0d1117] text-white shadow border border-[#30363d]'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setYearly(true)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                            yearly
                                ? 'bg-[#0d1117] text-white shadow border border-[#30363d]'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Yearly
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                            Save up to 44%
                        </span>
                    </button>
                </div>
            </section>

            {/* Plans */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const Icon = plan.icon;
                        const isHovered = hoveredPlan === plan.id;
                        const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
                        const period = yearly ? 'year' : 'month';

                        return (
                            <div
                                key={plan.id}
                                onMouseEnter={() => setHoveredPlan(plan.id)}
                                onMouseLeave={() => setHoveredPlan(null)}
                                className={`
                                    relative rounded-xl border p-6 flex flex-col transition-all duration-300
                                    ${plan.borderColor}
                                    ${plan.highlight
                                    ? 'bg-gradient-to-b from-[#1a2e1a] to-[#161b22]'
                                    : 'bg-[#161b22]'}
                                    ${isHovered ? 'scale-[1.02]' : ''}
                                `}
                                style={{
                                    boxShadow: plan.highlight
                                        ? '0 0 40px rgba(35,134,54,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
                                        : isHovered
                                            ? '0 20px 60px rgba(0,0,0,0.5)'
                                            : '0 4px 20px rgba(0,0,0,0.3)',
                                }}
                            >
                                {plan.tag && (
                                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${plan.badgeColor}`}>
                                        {plan.tag}
                                    </div>
                                )}

                                {/* Icon + Name */}
                                <div className="flex items-center gap-3 mb-5">
                                    <div className={`w-10 h-10 rounded-lg ${plan.iconBg} flex items-center justify-center`}>
                                        <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                                    </div>
                                    <h3 className="text-lg font-bold">{plan.name}</h3>
                                </div>

                                {/* Price */}
                                <div className="mb-1">
                                    <div className="flex items-end gap-1">
                                        <span className="text-4xl font-extrabold">${price}</span>
                                        <span className="text-gray-500 text-sm mb-1.5">/ {period}</span>
                                    </div>

                                </div>

                                <p className="text-sm text-gray-400 mb-6 leading-relaxed mt-2">{plan.description}</p>

                                <div className={`border-t ${plan.highlight ? 'border-[#238636]/30' : 'border-[#30363d]'} mb-5`} />

                                {/* Usage limits */}
                                <div className="space-y-2.5 mb-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <MessageSquare className="w-3.5 h-3.5 text-[#58a6ff] flex-shrink-0" />
                                            AI Messages
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            plan.aiMessages === 'Unlimited'
                                                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/20'
                                                : 'bg-[#1c2d4f] text-[#58a6ff]'
                                        }`}>
                                            {plan.aiMessages}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-gray-300">
                                            <RefreshCw className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                            Regenerations
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            plan.regenerations === 'Unlimited'
                                                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/20'
                                                : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                        }`}>
                                            {plan.regenerations}
                                        </span>
                                    </div>
                                </div>

                                <div className={`border-t ${plan.highlight ? 'border-[#238636]/30' : 'border-[#30363d]'} mb-5`} />

                                {/* Shared features — single checkmark list */}
                                <ul className="space-y-2.5 flex-1 mb-7">
                                    {sharedFeatures.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                            <Check className={`w-3.5 h-3.5 flex-shrink-0 ${plan.highlight ? 'text-green-400' : 'text-gray-500'}`} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <button
                                    className={`
                                        w-full h-11 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                                        ${plan.ctaStyle}
                                    `}
                                >
                                    <Github className="w-4 h-4" />
                                    {plan.cta}
                                    <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isHovered ? 'translate-x-1' : ''}`} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* FAQ — 2-column grid */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16">
                <h3 className="text-xl font-bold text-center mb-6">Quick answers</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    {faqs.map((faq, i) => (
                        <div key={i} className="border border-[#30363d] rounded-lg p-4 bg-[#161b22]">
                            <p className="text-sm font-semibold text-white mb-1">{faq.q}</p>
                            <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-[#30363d] bg-[#020408]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="AmICooked" className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-sm font-semibold">AmICooked?</span>
                        </div>
                        <span className="text-gray-500 text-xs">
                            © 2026 AmICooked. Built with ❤️ for WinHacks 2026 · Katarina Mantay, Aditya Patel, Norika Upadhyay
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}