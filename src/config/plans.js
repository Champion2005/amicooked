/**
 * Plan definitions — single source of truth for all plan configuration.
 * Includes limits, models, pricing, UI metadata, features, and FAQs.
 *
 * To add / change a plan or edit pricing/features, only edit this file.
 *
 * Limits:
 *   null  = unlimited
 *   number = max per rolling PERIOD_DAYS window
 *
 * hasFallback:
 *   true  = when limit is hit, switch to models.fallback instead of blocking
 *   false = block when limit is hit (paid plans)
 */

/** Rolling window in days */
export const PERIOD_DAYS = 30;

/**
 * Usage counter keys — used in Firestore and throughout the app.
 * Add new keys here to track additional AI call types.
 */
export const USAGE_TYPES = {
  MESSAGE: 'messages',       // AI chat messages (ChatPopup + SavedProjectsOverlay)
  REANALYZE: 'reanalyzes',   // Full GitHub re-analyses (Dashboard)
  PROJECT_CHAT: 'projectChats', // Saved project slots (SavedProjectsOverlay)
};

/** Order of plans on pricing page — change here to reorder cards */
export const PLAN_ORDER = ['free', 'student', 'pro', 'ultimate'];

/**
 * Plan tier order for feature inheritance checks.
 * A plan includes everything from all plans ranked at or below it.
 */
export const PLAN_TIER = { free: 0, student: 1, pro: 2, ultimate: 3 };

/**
 * ─── SINGLE SOURCE OF TRUTH FOR ALL FEATURES ────────────────────────────────
 * Add a feature once with its tier, everything downstream auto-updates.
 * To add a feature: just add { name: '...', availableFrom: 'pro' } here.
 */
export const ALL_FEATURES = [
  // Free + shared across all plans
  { name: 'GitHub Profile Analysis', availableFrom: 'free' },
  { name: 'Basic Score Breakdown', availableFrom: 'free' },
  { name: 'Job Fit Checker', availableFrom: 'free' },
  { name: 'Project Recommendations', availableFrom: 'free' },
  { name: 'AI Agent', availableFrom: 'free' },
  { name: 'Progress Tracking', availableFrom: 'free' },
  { name: 'Public Data Only — Always', availableFrom: 'free' },

  // Student plan exclusives
  { name: 'Increased Usage Limits I', availableFrom: 'student' },
  { name: 'In-Depth Statistics', availableFrom: 'student' },
  { name: 'Richer AI Analysis Data', availableFrom: 'student' },
  { name: 'Score History', availableFrom: 'student' },

  // Pro plan exclusives
  { name: 'Increased Usage Limits II', availableFrom: 'pro' },
  { name: 'Advanced Project Insights (Coming soon)', availableFrom: 'pro' },
  { name: 'Custom Agent Identity', availableFrom: 'pro' },
  
  // Ultimate plan exclusives
  { name: 'Increased Usage Limits III', availableFrom: 'ultimate' },
  { name: 'Adaptive Score Weights', availableFrom: 'ultimate' },
  { name: 'Interactive Growth Roadmap (coming soon)', availableFrom: 'ultimate' },
];

/**
 * Get all features available on a given plan (cumulative — includes all lower tiers).
 * @param {string} planId
 * @returns {string[]} Array of feature names
 */
export function getFeatures(planId) {
  const planTier = PLAN_TIER[planId] ?? PLAN_TIER.free;
  return ALL_FEATURES.filter((f) => PLAN_TIER[f.availableFrom] <= planTier).map((f) => f.name);
}

/**
 * Get only the exclusive features for a specific plan (not in the tier below).
 * @param {string} planId
 * @returns {string[]} Array of exclusive feature names
 */
export function getExclusiveFeatures(planId) {
  const idx = PLAN_ORDER.indexOf(planId);
  if (idx <= 0) return [];
  const prevPlanId = PLAN_ORDER[idx - 1];
  const prevFeatures = new Set(getFeatures(prevPlanId));
  return getFeatures(planId).filter((f) => !prevFeatures.has(f));
}

/**
 * Returns true when the given planId has access to In-Depth Statistics.
 * Student plan and above unlock the full raw-metrics view.
 * @param {string} planId
 * @returns {boolean}
 */
export function hasDetailedStats(planId) {
  return PLAN_TIER[planId] >= PLAN_TIER.student;
}

/**
 * Returns true when the given planId has access to persistent agent memory.
 * Student plan and above.
 * @param {string} planId
 * @returns {boolean}
 */
export function hasAgentMemory(planId) {
  return PLAN_TIER[planId] >= PLAN_TIER.student;
}

/**
 * Get the memory item limit for a given plan.
 * @param {string} planId
 * @returns {number}
 */
export function getMemoryLimit(planId) {
  return (PLANS[planId] ?? PLANS.free).memoryLimit
}

/**
 * Returns true when the given planId can customise the agent identity
 * (name, personality preset/custom, icon). Pro plan and above.
 * @param {string} planId
 * @returns {boolean}
 */
export function hasCustomAgent(planId) {
  return PLAN_TIER[planId] >= PLAN_TIER.pro;
}

/**
 * Returns true when the given planId has access to adaptive score weights
 * with per-statistic granularity. Ultimate plan only.
 * @param {string} planId
 * @returns {boolean}
 */
export function hasAdjustableWeights(planId) {
  return PLAN_TIER[planId] >= PLAN_TIER.ultimate;
}

/** Frequently asked questions (shared across all plans) */
export const FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — monthly plans cancel immediately. Yearly plans are billed upfront and non-refundable.',
  },
  {
    q: 'What counts as an "AI message"?',
    a: 'Every message to the AI agent or a Job Fit analysis counts as one AI message.',
  },
  {
    q: "What's a \"regeneration\"?",
    a: "When you want a fresh take on your analysis or projects. A full reanalysis counts as 1 regeneration. Regenerating just the analysis costs 0.8, and regenerating just projects costs 0.5.",
  },
  {
    q: 'Is the Student plan really just $3/mo?',
    a: 'Yep — $3/mo monthly, or $21/yr (42% off) if you go yearly. We built this at a hackathon. We get it.',
  },
];

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    badge: {
      label: 'Free',
      className: 'bg-surface text-muted-foreground border border-border',
    },
    // Per-period limits for each usage type
    limits: {
      [USAGE_TYPES.MESSAGE]: 5,
      [USAGE_TYPES.REANALYZE]: 1,
      [USAGE_TYPES.PROJECT_CHAT]: 1,
    },
    // AI models
    models: {
      primary: 'openrouter/free',
      fallback: null,
    },
    hasFallback: false,
    memoryLimit: 0,
    description: 'Basic features to try out the platform.',

    // ─── Pricing ───────────────────────────────────────────────────────────
    pricing: {
      monthlyPrice: 0,
      halfYearlyDiscount: null,
      yearlyDiscount: null,
    },

    // ─── UI Metadata ────────────────────────────────────────────────────────
    ui: {
      icon: 'Sparkles',
      iconColor: 'text-muted-foreground',
      iconBg: 'bg-surface',
      borderColor: 'border-border',
      badgeColor: 'bg-surface text-muted-foreground border border-border',
      tag: null,
      highlight: false,
      modelLabel: 'Free AI Model',
      cta: 'Get Started Free',
      ctaStyle: 'bg-surface hover:bg-track border border-border text-foreground',
    },
  },

  student: {
    id: 'student',
    name: 'Student',
    badge: {
      label: 'Student',
      className: 'bg-plan-student-bg text-accent border border-plan-student-border',
    },
    limits: {
      [USAGE_TYPES.MESSAGE]: 50,
      [USAGE_TYPES.REANALYZE]: 15,
      [USAGE_TYPES.PROJECT_CHAT]: 5,
    },
    models: {
      primary: 'x-ai/grok-4.1-fast',
      fallback: 'openrouter/free',
    },
    hasFallback: true,
    memoryLimit: 75,
    description: 'Built for students and hobbyists growing their portfolio.',
    // Student plan unlocks In-Depth Statistics.

    pricing: {
      monthlyPrice: 2.99,
      halfYearlyDiscount: 15,
      yearlyDiscount: 40,
    },

    ui: {
      icon: 'GraduationCap',
      iconColor: 'text-accent',
      iconBg: 'bg-plan-student-bg',
      borderColor: 'border-accent/40',
      badgeColor: 'bg-plan-student-bg text-accent border border-plan-student-border',
      tag: 'Best Value',
      highlight: false,
      modelLabel: 'Basic AI Model',
      cta: 'Get Student Plan',
      ctaStyle: 'bg-surface hover:bg-track border border-border text-foreground',
    },
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    badge: {
      label: 'Pro',
      className: 'bg-plan-pro-bg text-green-400 border border-primary/40',
    },
    limits: {
      [USAGE_TYPES.MESSAGE]: 250,
      [USAGE_TYPES.REANALYZE]: 50,
      [USAGE_TYPES.PROJECT_CHAT]: 20,
    },
    models: {
      primary: 'qwen/qwen3.5-397b-a17b',
      fallback: 'openrouter/free',
    },
    hasFallback: true,
    memoryLimit: 300,
    description: 'For developers serious about landing their next role.',

    pricing: {
      monthlyPrice: 11.99,
      halfYearlyDiscount: 10,
      yearlyDiscount: 30,
    },

    ui: {
      icon: 'Zap',
      iconColor: 'text-green-400',
      iconBg: 'bg-plan-pro-bg',
      borderColor: 'border-primary',
      badgeColor: 'bg-plan-pro-bg text-green-400 border border-primary/40',
      tag: 'Most Popular',
      highlight: true,
      modelLabel: 'Advanced AI Model',
      cta: 'Get Pro Plan',
      ctaStyle: 'bg-primary hover:bg-primary-hover text-foreground',
    },
  },

  ultimate: {
    id: 'ultimate',
    name: 'Ultimate',
    badge: {
      label: 'Ultimate',
      className: 'bg-plan-ultimate-bg text-orange-400 border border-plan-ultimate-accent/30',
    },
    limits: {
      [USAGE_TYPES.MESSAGE]: 1000,
      [USAGE_TYPES.REANALYZE]: 300,
      [USAGE_TYPES.PROJECT_CHAT]: 50,
    },
    models: {
      primary: 'google/gemini-3-flash-preview',
      fallback: 'openrouter/free',
    },
    hasFallback: true,
    memoryLimit: 500,
    description: 'Unlimited power for developers who refuse to stay cooked.',

    pricing: {
      monthlyPrice: 19.99,
      halfYearlyDiscount: 10,
      yearlyDiscount: 30,
    },

    ui: {
      icon: 'Crown',
      iconColor: 'text-orange-400',
      iconBg: 'bg-plan-ultimate-bg',
      borderColor: 'border-plan-ultimate-accent/40',
      badgeColor: 'bg-plan-ultimate-bg text-orange-400 border border-plan-ultimate-accent/30',
      tag: 'Best Results',
      highlight: false,
      modelLabel: 'State-of-the-art AI Model',
      cta: 'Get Ultimate Plan',
      ctaStyle: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-foreground',
    },
  },
};

/**
 * Calculate a billing period price from monthly base, duration in months, and discount percentage.
 * @param {number} monthlyPrice - Base monthly price
 * @param {number} months - Number of months (e.g., 6 for half-yearly, 12 for yearly)
 * @param {number} discountPercent - Discount applied as a percentage (0-100)
 * @returns {number} Floored final price
 */
function calculatePrice(monthlyPrice, months, discountPercent) {
  return Math.floor(Math.ceil(monthlyPrice) * months * (1 - discountPercent / 100)) - 0.01;
}

/**
 * Get a plan config by ID, defaulting to 'free' for unknown IDs.
 * @param {string} planId
 * @returns {Object}
 */
export function getPlan(planId) {
  return PLANS[planId] ?? PLANS.free;
}

/**
 * Get calculated pricing for a plan, with halfYearlyPrice and yearlyPrice computed.
 * @param {string} planId
 * @returns {Object} pricing object with calculated prices
 */
export function getPlanPricing(planId) {
  const plan = getPlan(planId);
  const { monthlyPrice, halfYearlyDiscount, yearlyDiscount } = plan.pricing;
  
  return {
    monthlyPrice,
    halfYearlyPrice: calculatePrice(monthlyPrice, 6, halfYearlyDiscount),
    halfYearlyDiscount,
    yearlyPrice: calculatePrice(monthlyPrice, 12, yearlyDiscount),
    yearlyDiscount,
  };
}

/**
 * Returns a human-readable label for a limit value.
 * @param {number|null} limit
 * @returns {string}
 */
export function formatLimit(limit) {
  return limit === null ? 'Unlimited' : String(limit);
}

/**
 * Map of Lucide icon names to actual imports.
 * Used by Pricing.jsx to dynamically instantiate icons from their string names.
 */
import { Sparkles, GraduationCap, Zap, Crown, Check, Info, MessageSquare, RefreshCw, Github, ArrowRight } from 'lucide-react';

export const ICON_MAP = {
  Sparkles,
  GraduationCap,
  Zap,
  Crown,
  Check,
  Info,
  MessageSquare,
  RefreshCw,
  Github,
  ArrowRight,
};

/**
 * Get a Lucide icon component by string name.
 * @param {string} iconName - Name of the icon (e.g., 'Sparkles')
 * @returns {React.Component|null}
 */
export function getIcon(iconName) {
  return ICON_MAP[iconName] || null;
}
