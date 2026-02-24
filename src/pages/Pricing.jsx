import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import logo from '@/assets/amicooked_logo.png';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useGitHubSignIn } from '@/hooks/useGitHubSignIn';
import { auth, db } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { PLANS, USAGE_TYPES, PLAN_ORDER, FAQS, getIcon, formatLimit, getFeatures, getExclusiveFeatures } from '@/config/plans';
import { Github, Check, ArrowRight, MessageSquare, RefreshCw, Sparkles, Info, BarChart2, Zap } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// All plan data is now sourced from plans.js (PLANS, SHARED_FEATURES, FAQS, etc.)

/** Build displayable plans by merging config with UI metadata */
const buildPlansArray = () => {
    return PLAN_ORDER.map((id, idx) => {
        const plan = PLANS[id];
        const ui = plan.ui;
        const pricing = plan.pricing;
        const prevId = idx > 0 ? PLAN_ORDER[idx - 1] : null;
        const previousPlanName = prevId ? PLANS[prevId].name : null;
        const features = getFeatures(id);
        const exclusiveFeatures = getExclusiveFeatures(id);
        return {
            id,
            name: plan.name,
            description: plan.description,
            aiMessages: formatLimit(plan.limits[USAGE_TYPES.MESSAGE]),
            regenerations: formatLimit(plan.limits[USAGE_TYPES.REANALYZE]),
            hasFallback: plan.hasFallback,
            isPaid: pricing.monthlyPrice > 0,
            icon: ui.icon,
            iconColor: ui.iconColor,
            iconBg: ui.iconBg,
            borderColor: ui.borderColor,
            badgeColor: ui.badgeColor,
            monthlyPrice: pricing.monthlyPrice,
            halfYearlyPrice: pricing.halfYearlyPrice,
            halfYearlyDiscount: pricing.halfYearlyDiscount,
            yearlyPrice: pricing.yearlyPrice,
            yearlyDiscount: pricing.yearlyDiscount,
            tag: ui.tag,
            highlight: ui.highlight,
            modelLabel: ui.modelLabel,
            cta: ui.cta,
            ctaStyle: ui.ctaStyle,
            features,
            previousPlanName,
            exclusiveFeatures,
        };
    });
};

const plans = buildPlansArray();

export default function Pricing() {
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [hoveredPlan, setHoveredPlan] = useState(null);
    const navigate = useNavigate();
    const toast = useToast();
    const { handleGitHubSignIn, loading } = useGitHubSignIn({
        onError: () => toast.error('Failed to sign in with GitHub. Please try again.'),
    });
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    // null = unknown/loading, string = resolved plan id (e.g. 'free', 'pro')
    const [userPlan, setUserPlan] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
        return unsubscribe;
    }, []);

    // Fetch the user's current plan from Firestore whenever auth state changes.
    useEffect(() => {
        if (!currentUser) {
            setUserPlan(null);
            return;
        }
        getDoc(doc(db, 'users', currentUser.uid))
            .then((snap) => setUserPlan(snap.exists() ? (snap.data().plan || 'free') : 'free'))
            .catch(() => setUserPlan('free'));
    }, [currentUser]);

    return (
        <div className="min-h-screen bg-background text-foreground">
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
            <nav className="sticky top-0 z-50 border-b border-border bg-background-dark">
                <div className="max-w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="AmICooked" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" />
                        <span className="text-lg sm:text-xl font-bold">AmICooked?</span>
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            to="/"
                            className="text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border text-xs sm:text-sm transition-colors px-3 py-1.5 rounded-md"
                        >
                            ← Back to home
                        </Link>
                        {currentUser ? (
                            <Button
                                onClick={() => navigate('/results')}
                                className="bg-primary hover:bg-primary-hover text-foreground text-xs sm:text-sm"
                            >
                                <ArrowRight className="mr-1 sm:mr-2 h-4 w-4" />
                                Return to Results
                            </Button>
                        ) : (
                            <Button
                                onClick={handleGitHubSignIn}
                                disabled={loading}
                                className="bg-primary hover:bg-primary-hover text-foreground text-xs sm:text-sm"
                            >
                                <Github className="mr-1 sm:mr-2 h-4 w-4" />
                                {loading ? 'Signing in...' : 'Sign in with GitHub'}
                            </Button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-8 text-center">
                <div className="inline-block mb-4 px-3 py-1.5 rounded-md border border-border bg-card text-xs sm:text-sm text-muted-foreground">
                    🔥 Stop being cooked. Start getting hired.
                </div>
                <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
                    Simple, honest pricing.
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                        No hidden nonsense.
                    </span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
                    Whether you're just starting out or grinding hard for your next offer — there's a plan for where you are right now.
                </p>
            </section>

            {/* Plans */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                {/* Free tier — full width */}
                {plans.filter((p) => !p.isPaid).map((plan) => {
                    const Icon = getIcon(plan.icon);
                    const isCurrentPlan = !!currentUser && userPlan === plan.id;

                    const handleCta = () => {
                        if (isCurrentPlan) return;
                        currentUser ? navigate('/dashboard') : handleGitHubSignIn();
                    };

                    return (
                        <div
                            key={plan.id}
                            className="relative rounded-xl border border-border bg-card p-6 mb-8 flex flex-col gap-5"
                            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                        >
                            {/* Top row: icon + name | usage stats | CTA */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                {/* Left: icon + name + description */}
                                <div className="flex items-center gap-4 sm:w-56 shrink-0">
                                    <div className={`w-10 h-10 rounded-lg ${plan.iconBg} flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold leading-tight">Free</h3>
                                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{plan.description}</p>
                                    </div>
                                </div>

                                {/* Middle: usage limits */}
                                <div className="flex flex-wrap gap-x-6 gap-y-2 flex-1">
                                    <div className="flex items-center gap-2 text-sm">
                                        <MessageSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                                        <span className="text-muted-foreground">AI Messages:</span>
                                        <span className="font-semibold text-foreground">{plan.aiMessages}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <RefreshCw className="w-3.5 h-3.5 text-accent shrink-0" />
                                        <span className="text-muted-foreground">Regenerations:</span>
                                        <span className="font-semibold text-foreground">{plan.regenerations}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                                        <span className="text-muted-foreground">AI Model:</span>
                                        <span className="font-semibold text-foreground">{plan.modelLabel}</span>
                                    </div>
                                </div>

                                {/* Right: CTA */}
                                <button
                                    onClick={handleCta}
                                    disabled={isCurrentPlan || loading}
                                    className={`
                                        h-11 px-6 rounded-lg text-sm font-semibold transition-all duration-200
                                        flex items-center justify-center gap-2 shrink-0
                                        disabled:opacity-60 disabled:cursor-default
                                        ${isCurrentPlan
                                            ? 'bg-surface border border-border text-muted-foreground cursor-default'
                                            : plan.ctaStyle}
                                    `}
                                >
                                    {isCurrentPlan ? 'Current Plan' : plan.cta}
                                    {!isCurrentPlan && <ArrowRight className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Feature grid — 3 per row */}
                            <div className="border-t border-border pt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
                                {plan.features.map((f, i) => (
                                    <span key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Check className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {/* Billing toggle */}
                <div className="my-8 flex justify-center">
                    <div className="inline-flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                billingCycle === 'monthly'
                                    ? 'bg-background text-foreground shadow border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('halfYearly')}
                            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                billingCycle === 'halfYearly'
                                    ? 'bg-background text-foreground shadow border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Bi-annual
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                billingCycle === 'yearly'
                                    ? 'bg-background text-foreground shadow border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Annual
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                                Best Deal
                            </span>
                        </button>
                    </div>
                </div>
                {/* Paid tiers — 3 columns */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {plans.filter((p) => p.isPaid).map((plan) => {
                        const Icon = getIcon(plan.icon);
                        const isHovered = hoveredPlan === plan.id;
                        const price = billingCycle === 'yearly' ? plan.yearlyPrice
                            : billingCycle === 'halfYearly' ? plan.halfYearlyPrice
                            : plan.monthlyPrice;
                        const period = billingCycle === 'yearly' ? 'year'
                            : billingCycle === 'halfYearly' ? '6 mo'
                            : 'month';
                        const activeDiscount = billingCycle === 'yearly' ? plan.yearlyDiscount
                            : billingCycle === 'halfYearly' ? plan.halfYearlyDiscount
                            : null;

                        return (
                            <div
                                key={plan.id}
                                onMouseEnter={() => setHoveredPlan(plan.id)}
                                onMouseLeave={() => setHoveredPlan(null)}
                                className={`
                                    relative rounded-xl border p-6 flex flex-col transition-all duration-300
                                    ${plan.borderColor}
                                    ${plan.highlight
                                    ? 'bg-gradient-to-b from-plan-pro-bg to-card'
                                    : 'bg-card'}
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
                                    <div className="flex items-end gap-x-2">
                                        <span className="text-4xl font-extrabold">${price}</span>
                                        <span className="text-muted-foreground text-sm mb-1">/ {period}</span>
                                        {activeDiscount && (
                                            <span
                                                className="mb-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20"
                                            >
                                                {activeDiscount}% off
                                            </span>
                                        )}
                                    </div>
                                    {billingCycle !== 'yearly' && plan.yearlyDiscount && (
                                        <span
                                            onClick={() => setBillingCycle('yearly')}
                                            className="block text-xs font-semibold text-green-400/70 mt-2 cursor-pointer hover:text-green-400 transition-colors"
                                        >
                                            Save {plan.yearlyDiscount}% annually →
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground mb-6 leading-relaxed mt-2">{plan.description}</p>

                                <div className={`border-t ${plan.highlight ? 'border-primary/30' : 'border-border'} mb-5`} />

                                {/* Usage limits */}
                                <div className="flex items-center gap-2 mb-4">
                                    <h4 className="text-sm font-semibold text-foreground">Usage Limits</h4>
                                    <div className="group relative cursor-help">
                                        <Info className="w-4 h-4 text-muted-foreground hover:text-accent transition-colors" />
                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-background border border-border rounded-lg p-3 w-56 text-xs text-muted-foreground shadow-lg z-50">
                                            {plan.hasFallback
                                                ? "Limits apply to premium model requests. After reaching your limit, you'll continue with unlimited access using our free tier model."
                                                : plan.id === 'free'
                                                    ? 'Hard limits — usage resets monthly.'
                                                    : 'Truly unlimited access with premium models.'
                                            }
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2.5 mb-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-foreground">
                                            <MessageSquare className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                            AI Messages
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            plan.id === 'ultimate'
                                                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/20'
                                                : plan.id === 'pro' ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                                : 'bg-plan-student-bg text-accent border border-accent/20'
                                        }`}>
                                            {plan.aiMessages} /month
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-foreground">
                                            <RefreshCw className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                            Regenerations
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            plan.id === 'ultimate'
                                                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/20'
                                                : plan.id === 'pro' ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                                : 'bg-plan-student-bg text-accent border border-accent/20'
                                        }`}>
                                            {plan.regenerations} /month
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-foreground">
                                            <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                            AI Model
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            plan.id === 'ultimate'
                                                ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/20'
                                                : plan.id === 'pro'
                                                    ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                                    : 'bg-plan-student-bg text-accent border border-accent/20'
                                        }`}>
                                            {plan.modelLabel}
                                        </span>
                                    </div>
                                </div>

                                <div className={`border-t ${plan.highlight ? 'border-primary/30' : 'border-border'} mb-5`} />

                                {/* Plan-exclusive features with 'everything in X, plus:' heading */}
                                <div className="flex-1 mb-7 space-y-3">
                                    {plan.previousPlanName && (
                                        <p className="text-xs text-muted-foreground">
                                            Everything in{' '}
                                            <span className="font-semibold text-foreground">{plan.previousPlanName}</span>
                                            , plus:
                                        </p>
                                    )}
                                    <ul className="space-y-2.5">
                                        {plan.exclusiveFeatures.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                                                <Check className={`w-3.5 h-3.5 flex-shrink-0 ${
                                                    plan.highlight
                                                        ? 'text-green-400'
                                                        : plan.id === 'ultimate'
                                                            ? 'text-orange-400'
                                                            : 'text-accent'
                                                }`} />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* CTA */}
                                {(() => {
                                    const isCurrentPlan = !!currentUser && userPlan === plan.id;

                                    const handleCta = () => {
                                        if (isCurrentPlan) return;
                                        if (!plan.isPaid) {
                                            // Free plan: sign in if not auth'd, else go to dashboard
                                            currentUser ? navigate('/dashboard') : handleGitHubSignIn();
                                        } else {
                                            // Paid plans: payment not yet set up
                                            toast.info('Coming soon — billing is on the way!');
                                        }
                                    };

                                    return (
                                        <button
                                            onClick={handleCta}
                                            disabled={isCurrentPlan || loading}
                                            className={`
                                                w-full h-11 rounded-lg text-sm font-semibold transition-all duration-200
                                                flex items-center justify-center gap-2
                                                disabled:opacity-60 disabled:cursor-default disabled:scale-100
                                                ${isCurrentPlan
                                                    ? 'bg-surface border border-border text-muted-foreground cursor-default'
                                                    : plan.ctaStyle}
                                            `}
                                        >
                                            {isCurrentPlan ? 'Current Plan' : plan.cta}
                                            {!isCurrentPlan && (
                                                <ArrowRight
                                                    className={`w-4 h-4 transition-transform duration-200 ${isHovered ? 'translate-x-1' : ''}`}
                                                />
                                            )}
                                        </button>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* FAQ — 2-column grid */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16">
                <h3 className="text-xl font-bold text-center mb-6">Quick answers</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    {FAQS.map((faq, i) => (
                        <div key={i} className="border border-border rounded-lg p-4 bg-card">
                            <p className="text-sm font-semibold text-foreground mb-1">{faq.q}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-border bg-background-dark">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="AmICooked" className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-sm font-semibold">AmICooked?</span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                            © 2026 AmICooked. Built with ❤️ for WinHacks 2026 · Katarina Mantay, Aditya Patel, Norika Upadhyay
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
