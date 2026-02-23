/**
 * User-facing preference definitions.
 *
 * Purely client-side personalisation settings — unrelated to plan gating (see plans.js).
 * All values are saved under `users/{uid}.preferences` in Firestore.
 */

/**
 * Roast intensity levels — controls AI tone during analysis and chat.
 * @typedef {{ id: string, label: string, emoji: string, description: string, instruction: string }} RoastOption
 */
export const ROAST_INTENSITY_OPTIONS = [
  {
    id: 'mild',
    label: 'Mild',
    emoji: '😌',
    description: 'Diplomatic — leads with positives, softens criticism',
    instruction:
      'Use a diplomatic, encouraging tone throughout. Lead with strengths before mentioning weaknesses. Frame every gap as an area of opportunity rather than a failure. Avoid blunt or harsh language.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    emoji: '🎯',
    description: 'Honest but direct — the default experience',
    // No extra instruction; the base prompt tone already covers this
    instruction: '',
  },
  {
    id: 'brutal',
    label: 'Brutal',
    emoji: '🔥',
    description: 'No filter — maximum roast, zero sugarcoating',
    instruction:
      'Be brutally blunt. Do not sugarcoat weaknesses. Call out every gap, missed opportunity, and red flag directly and without softening — while remaining factually accurate. Hold nothing back.',
  },
];

/** Default roast intensity if the user has not set one */
export const DEFAULT_ROAST_INTENSITY = 'balanced';

/** Cooked level at or above which the confetti celebration fires */
export const CONFETTI_SCORE_THRESHOLD = 7;

/** Max length for the developer nickname field */
export const DEV_NICKNAME_MAX_LENGTH = 20;

/**
 * Returns the tone instruction string for a given intensity ID.
 * Returns an empty string for 'balanced' (no modification to the base prompt).
 *
 * @param {string} [intensityId]
 * @returns {string}
 */
export function getRoastInstruction(intensityId) {
  const opt = ROAST_INTENSITY_OPTIONS.find((o) => o.id === intensityId);
  return opt?.instruction ?? '';
}
