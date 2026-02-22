/**
 * Usage tracking service
 *
 * Reads and writes rolling 30-day usage counters stored on the user's Firestore doc:
 *   users/{userId}.usage = { messages, reanalyzes, projectChats, periodStart }
 *
 * Security model:
 *   - Firestore rules prevent clients from lowering any counter (only increment allowed)
 *     unless they also advance periodStart (period reset).
 *   - The plan field can only be changed via the Firebase Admin SDK (server-side),
 *     preventing self-upgrading.
 */

import { db } from '@/config/firebase';
import { doc, getDoc, updateDoc, increment as firestoreIncrement } from 'firebase/firestore';
import { getPlan, PERIOD_DAYS, USAGE_TYPES } from '@/config/plans';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Returns the zeroed-out usage object for a freshly started period.
 */
function freshUsage() {
  return {
    [USAGE_TYPES.MESSAGE]: 0,
    [USAGE_TYPES.REANALYZE]: 0,
    [USAGE_TYPES.PROJECT_CHAT]: 0,
    periodStart: new Date().toISOString(),
  };
}

/**
 * Fetch the current user doc and resolve their plan + usage.
 * Automatically resets counters if the 30-day window has expired.
 *
 * @param {string} userId
 * @returns {Promise<{ plan: string, planConfig: Object, usage: Object }>}
 */
async function resolveUsage(userId) {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { plan: 'free', planConfig: getPlan('free'), usage: freshUsage() };
  }

  const data = snap.data();
  const plan = data.plan || 'free';
  const planConfig = getPlan(plan);

  const periodStart = data.usage?.periodStart
    ? new Date(data.usage.periodStart).getTime()
    : 0;
  const periodExpired = Date.now() - periodStart > PERIOD_DAYS * MS_PER_DAY;

  if (!data.usage || periodExpired) {
    // Start a new period — write the reset atomically
    const reset = freshUsage();
    await updateDoc(ref, { usage: reset });
    return { plan, planConfig, usage: reset };
  }

  return { plan, planConfig, usage: data.usage };
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether a user can perform an AI action and which model to use.
 *
 * Returns:
 *   { allowed: boolean, model: string|null, usingFallback: boolean,
 *     current: number, limit: number|null, plan: string, planConfig: Object }
 *
 * - allowed:       whether the call should proceed at all
 * - model:         model string to pass to callOpenRouter (null if blocked)
 * - usingFallback: true when the free plan serves a degraded free model instead of blocking
 * - current:       how many times this action has been used this period
 * - limit:         the plan's cap (null = unlimited)
 *
 * @param {string} userId
 * @param {string} usageType  One of USAGE_TYPES.*
 */
export async function checkLimit(userId, usageType) {
  try {
    const { plan, planConfig, usage } = await resolveUsage(userId);

    const limit = planConfig.limits[usageType] ?? null;
    const current = usage[usageType] ?? 0;

    // Unlimited
    if (limit === null) {
      return {
        allowed: true,
        model: planConfig.models.primary,
        usingFallback: false,
        current,
        limit,
        plan,
        planConfig,
      };
    }

    // Under limit
    if (current < limit) {
      return {
        allowed: true,
        model: planConfig.models.primary,
        usingFallback: false,
        current,
        limit,
        plan,
        planConfig,
      };
    }

    // Over limit — free plan switches model instead of blocking
    if (planConfig.hasFallback && planConfig.models.fallback) {
      return {
        allowed: true,
        model: planConfig.models.fallback,
        usingFallback: true,
        current,
        limit,
        plan,
        planConfig,
      };
    }

    // Over limit — paid plan, hard block
    return {
      allowed: false,
      model: null,
      usingFallback: false,
      current,
      limit,
      plan,
      planConfig,
    };
  } catch (err) {
    // If usage check fails (e.g. network), allow the call with the default model
    console.warn('[usage] checkLimit failed, allowing call as fallback:', err.message);
    return {
      allowed: true,
      model: getPlan('free').models.primary,
      usingFallback: false,
      current: 0,
      limit: null,
      plan: 'free',
      planConfig: getPlan('free'),
    };
  }
}

/**
 * Increment a usage counter after a successful AI call.
 * Uses Firestore's atomic increment so concurrent writes don't race.
 *
 * @param {string} userId
 * @param {string} usageType  One of USAGE_TYPES.*
 */
export async function incrementUsage(userId, usageType) {
  try {
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, {
      [`usage.${usageType}`]: firestoreIncrement(1),
    });
  } catch (err) {
    // Non-critical — log but don't crash the UI
    console.warn('[usage] incrementUsage failed:', err.message);
  }
}

/**
 * Fetch the full usage summary for display (e.g. Profile page).
 *
 * @param {string} userId
 * @returns {Promise<{ plan: string, planConfig: Object, usage: Object, periodStart: string }>}
 */
export async function getUsageSummary(userId) {
  try {
    const { plan, planConfig, usage } = await resolveUsage(userId);
    return { plan, planConfig, usage, periodStart: usage.periodStart };
  } catch (err) {
    console.warn('[usage] getUsageSummary failed:', err.message);
    return null;
  }
}
