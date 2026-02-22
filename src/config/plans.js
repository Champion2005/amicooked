/**
 * Plan definitions — single source of truth for all plan limits, models, and badges.
 * To add / change a plan, only edit this file.
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
  MESSAGE: 'messages',       // AI chat messages (ChatPopup)
  REANALYZE: 'reanalyzes',   // Full GitHub re-analyses (Dashboard)
  PROJECT_CHAT: 'projectChats', // Project-specific chat messages (ProjectPopup / SavedProjectsOverlay)
};

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
      [USAGE_TYPES.MESSAGE]: 20,
      [USAGE_TYPES.REANALYZE]: 3,
      [USAGE_TYPES.PROJECT_CHAT]: 3,
    },
    // AI models
    models: {
      primary: 'meta-llama/llama-4-scout',
      fallback: 'meta-llama/llama-3.3-70b-instruct:free', // used after limits hit
    },
    // Switch to fallback model instead of hard-blocking
    hasFallback: true,
    description: 'Basic features with monthly limits.',
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
      [USAGE_TYPES.PROJECT_CHAT]: 15,
    },
    models: {
      primary: 'meta-llama/llama-4-scout',
      fallback: null,
    },
    hasFallback: false,
    description: 'For students building their first real portfolio.',
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    badge: {
      label: 'Pro',
      className: 'bg-plan-pro-bg text-green-400 border border-primary/40',
    },
    limits: {
      [USAGE_TYPES.MESSAGE]: 200,
      [USAGE_TYPES.REANALYZE]: 50,
      [USAGE_TYPES.PROJECT_CHAT]: null, // unlimited
    },
    models: {
      primary: 'meta-llama/llama-4-maverick',
      fallback: null,
    },
    hasFallback: false,
    description: 'For developers serious about landing their next role.',
  },

  ultimate: {
    id: 'ultimate',
    name: 'Ultimate',
    badge: {
      label: 'Ultimate',
      className: 'bg-plan-ultimate-bg text-orange-400 border border-plan-ultimate-accent/30',
    },
    limits: {
      [USAGE_TYPES.MESSAGE]: null,      // unlimited
      [USAGE_TYPES.REANALYZE]: null,
      [USAGE_TYPES.PROJECT_CHAT]: null,
    },
    models: {
      primary: 'google/gemini-3.1-pro-preview',
      fallback: null,
    },
    hasFallback: false,
    description: 'Unlimited power for developers who refuse to stay cooked.',
  },
};

/**
 * Get a plan config by ID, defaulting to 'free' for unknown IDs.
 * @param {string} planId
 * @returns {Object}
 */
export function getPlan(planId) {
  return PLANS[planId] ?? PLANS.free;
}

/**
 * Returns a human-readable label for a limit value.
 * @param {number|null} limit
 * @returns {string}
 */
export function formatLimit(limit) {
  return limit === null ? 'Unlimited' : String(limit);
}
