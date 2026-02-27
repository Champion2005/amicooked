// OpenRouter API configuration
import { formatEducation } from "@/utils/formatEducation";
import { getScoringInstructions, getChatInstructions, getAnalysisModeInstructions } from "@/config/agent-instructions";
import { hasDetailedStats } from "@/config/plans";
import { getRoastInstruction } from "@/config/preferences";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

// ─── Deterministic post-processing ───────────────────────────────────────────

const CATEGORY_WEIGHTS = {
  activity: 40,
  skillSignals: 30,
  growth: 15,
  collaboration: 15,
};

/** Normalise AI key aliases (e.g. skill_signals → skillSignals) */
const KEY_ALIASES = {
  skill_signals: "skillSignals",
  skillsignals: "skillSignals",
  skill: "skillSignals",
  skills: "skillSignals",
  skillsignal: "skillSignals",
  collab: "collaboration",
  collaborations: "collaboration",
  grow: "growth",
  activities: "activity",
};

function deriveLevelName(level) {
  if (level >= 9) return "Cooking";
  if (level >= 7) return "Toasted";
  if (level >= 5) return "Cooked";
  if (level >= 3) return "Well-Done";
  return "Burnt";
}

const REQUIRED_CATS = Object.keys(CATEGORY_WEIGHTS);

/**
 * Returns the list of category keys that are missing or have no valid numeric score.
 */
function missingCategories(rawCats) {
  const renamed = renameKeys(rawCats);
  return REQUIRED_CATS.filter((key) => {
    const cat = renamed[key];
    return !cat || typeof cat.score !== "number" || isNaN(cat.score);
  });
}

/** Apply KEY_ALIASES normalization to a raw categoryScores object */
function renameKeys(rawCats) {
  const out = {};
  for (const [k, v] of Object.entries(rawCats || {})) {
    const canonical = KEY_ALIASES[k.toLowerCase().replace(/[\s_-]/g, "")] || k;
    out[canonical] = v;
  }
  return out;
}

/** Weight constraint constants for Ultimate plan AI-adjustable weights */
const MIN_CATEGORY_WEIGHT = 15;
const MAX_CATEGORY_WEIGHT = 45;

/**
 * Validate and constrain AI-chosen category weights.
 * Returns null if the input is invalid (falls back to defaults).
 * @param {Object} rawWeights - e.g. { activity: 35, skillSignals: 30, growth: 20, collaboration: 15 }
 * @returns {Object|null} Normalized weights or null
 */
function normalizeWeights(rawWeights) {
  if (!rawWeights || typeof rawWeights !== 'object') return null;

  const normalized = {};
  for (const key of REQUIRED_CATS) {
    const alias = KEY_ALIASES[key.toLowerCase().replace(/[\s_-]/g, '')] || key;
    const val = rawWeights[key] ?? rawWeights[alias];
    if (typeof val !== 'number' || isNaN(val)) return null;
    normalized[key] = Math.min(MAX_CATEGORY_WEIGHT, Math.max(MIN_CATEGORY_WEIGHT, Math.round(val)));
  }

  // Ensure weights sum to 100 — redistribute any rounding error proportionally
  const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    const diff = 100 - sum;
    // Add/subtract the difference from the largest weight to minimize distortion
    const largestKey = Object.entries(normalized).sort((a, b) => b[1] - a[1])[0][0];
    normalized[largestKey] = Math.min(MAX_CATEGORY_WEIGHT, Math.max(MIN_CATEGORY_WEIGHT, normalized[largestKey] + diff));
  }

  // Final validation: all still in range and sum is 100
  const finalSum = Object.values(normalized).reduce((a, b) => a + b, 0);
  if (finalSum !== 100) return null;
  for (const w of Object.values(normalized)) {
    if (w < MIN_CATEGORY_WEIGHT || w > MAX_CATEGORY_WEIGHT) return null;
  }

  return normalized;
}

/**
 * Normalize sub-metrics within a category.
 * Returns the array of normalized sub-metrics, or null if invalid.
 * @param {Array} subMetrics - Raw sub-metrics from AI
 * @returns {Array|null}
 */
function normalizeSubMetrics(subMetrics) {
  if (!Array.isArray(subMetrics) || subMetrics.length < 2) return null;

  const normalized = subMetrics.slice(0, 4).map(sm => ({
    name: String(sm.name || 'Unknown').trim().slice(0, 50),
    score: Math.min(100, Math.max(0, Math.round(Number(sm.score) || 0))),
    weight: Math.max(1, Math.round(Number(sm.weight) || 0)),
  }));

  // Normalize weights to sum to 100
  const weightSum = normalized.reduce((s, sm) => s + sm.weight, 0);
  if (weightSum === 0) return null;
  if (weightSum !== 100) {
    // Scale proportionally
    let remaining = 100;
    for (let i = 0; i < normalized.length - 1; i++) {
      normalized[i].weight = Math.max(1, Math.round((normalized[i].weight / weightSum) * 100));
      remaining -= normalized[i].weight;
    }
    normalized[normalized.length - 1].weight = Math.max(1, remaining);
  }

  return normalized;
}

/**
 * Validate and normalise the raw AI response:
 * - Renames aliased category keys
 * - Clamps scores to 0-100
 * - For any still-missing category, derives a fallback from the mean of
 *   present scores (never an arbitrary constant)
 * - Handles AI-chosen category weights for Ultimate plan (validates & constrains)
 * - Handles sub-metric breakdowns for Ultimate plan
 * - Computes cookedLevel and levelName deterministically
 */
function normalizeAnalysis(raw) {
  const renamed = renameKeys(raw.categoryScores || {});

  // Check for AI-chosen weights (Ultimate plan)
  const aiWeights = normalizeWeights(raw.categoryWeights);
  const effectiveWeights = aiWeights || { ...CATEGORY_WEIGHTS };

  // Collect the scores that ARE present and valid
  const presentScores = REQUIRED_CATS.map((key) => renamed[key]?.score)
    .filter((s) => typeof s === "number" && !isNaN(s))
    .map((s) => Math.min(100, Math.max(0, Math.round(s))));

  // Fallback = mean of present scores, or a neutral 50 if nothing at all came back
  const fallback =
    presentScores.length > 0
      ? Math.round(
          presentScores.reduce((a, b) => a + b, 0) / presentScores.length,
        )
      : 50;

  const categories = {};
  for (const key of REQUIRED_CATS) {
    const cat = renamed[key] || {};
    const weight = effectiveWeights[key];

    // Process sub-metrics if present
    const subMetrics = normalizeSubMetrics(cat.subMetrics);

    // If sub-metrics exist, compute category score as their weighted average
    let categoryScore;
    if (subMetrics) {
      const subWeightedSum = subMetrics.reduce((sum, sm) => sum + sm.score * sm.weight, 0);
      const subWeightTotal = subMetrics.reduce((sum, sm) => sum + sm.weight, 0);
      categoryScore = Math.min(100, Math.max(0, Math.round(subWeightedSum / subWeightTotal)));
    } else {
      const rawScore =
        typeof cat.score === "number" && !isNaN(cat.score) ? cat.score : fallback;
      categoryScore = Math.min(100, Math.max(0, Math.round(rawScore)));
    }

    categories[key] = {
      score: categoryScore,
      weight,
      notes: (cat.notes || "").trim(),
      ...(subMetrics ? { subMetrics } : {}),
    };
  }

  // Derive cookedLevel deterministically: weighted average of 0-100 scores → 0-10
  const weightedAvg = REQUIRED_CATS.reduce(
    (sum, key) => sum + categories[key].score * (effectiveWeights[key] / 100),
    0,
  );
  const cookedLevel = Math.min(10, Math.max(0, Math.round(weightedAvg / 10)));
  const levelName = deriveLevelName(cookedLevel);

  return {
    ...raw,
    cookedLevel,
    levelName,
    categoryScores: categories,
    ...(aiWeights ? { categoryWeights: aiWeights } : {}),
  };
}
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Default model used when no override is provided. */
export const DEFAULT_MODEL = "openrouter/free";

if (!OPENROUTER_API_KEY) {
  console.error("Missing VITE_OPENROUTER_API_KEY environment variable");
}

/**
 * Format all GitHub metrics into a structured prompt section.
 * Covers every field the agent instructions score formula requires:
 *   Activity (40%) | Skill Signals (30%) | Growth (15%) | Collaboration (15%)
 */
export function formatGitHubMetrics(githubData, userProfile) {
  const ed = formatEducation(userProfile.education);
  const exp = userProfile.experienceYears?.replace(/_/g, " ") || "Unknown";

  // Normalise tag fields: accept both string[] (new) and legacy comma-separated string
  const skills = Array.isArray(userProfile.technicalSkills)
    ? userProfile.technicalSkills.join(', ')
    : (userProfile.technicalSkills || 'Not specified');
  const interests = Array.isArray(userProfile.technicalInterests)
    ? userProfile.technicalInterests.join(', ')
    : (userProfile.technicalInterests || '');

  return `
## USER PROFILE
- Age: ${userProfile.age}
- Education: ${ed}
- Experience: ${exp}
- Current Status: ${userProfile.currentRole || "Unknown"}
- Career Goal: ${userProfile.careerGoal || "Not specified"}
- Technical Skills: ${skills}${interests ? `\n- Technical Interests: ${interests}` : ""}${userProfile.learningStyle ? `\n- Learning Style: ${userProfile.learningStyle.replace(/_/g, ' ')}` : ""}${userProfile.collaborationPreference ? `\n- Work Approach: ${userProfile.collaborationPreference.replace(/_/g, ' ')}` : ""}${userProfile.jobUrgency ? `\n- Job Search Timeline: ${userProfile.jobUrgency.replace(/_/g, ' ')}` : ""}${userProfile.hobbies ? `\n- Hobbies: ${userProfile.hobbies}` : ""}

## GITHUB METRICS

### Activity (40% of score)
- Commits last 365 days: ${githubData.commitsLast365 ?? githubData.totalCommits}
- Commits last 90 days: ${githubData.commitsLast90 ?? "N/A"}
- Previous year commits: ${githubData.prevYearCommits ?? "N/A"}
- Active weeks %: ${githubData.activeWeeksPct ?? "N/A"}% (out of 52 weeks)
- Avg commits per active week: ${githubData.avgCommitsPerActiveWeek ?? "N/A"}
- Std deviation per week: ${githubData.stdDevPerWeek ?? "N/A"} (lower = more consistent)
- Longest inactive gap: ${githubData.longestInactiveGap ?? "N/A"} days
- Contribution streak: ${githubData.streak ?? 0} days

### Collaboration (15% of score)
- Total PRs created: ${githubData.totalPRs ?? 0}
- Merged PRs: ${githubData.mergedPRs ?? "N/A"}
- Open issues: ${githubData.openIssues ?? "N/A"}
- Closed issues: ${githubData.closedIssues ?? "N/A"}
- Issues closed ratio: ${githubData.issuesClosedRatio ?? "N/A"} (closed / opened+1)

### Skill Signals (30% of score)
- Total repositories: ${githubData.totalRepos}
- Unique languages: ${githubData.languageCount ?? githubData.languages?.length ?? "N/A"}
- Top languages: ${githubData.languages?.join(", ") || "Unknown"}
- Top language dominance: ${githubData.topLanguageDominancePct ?? "N/A"}% of codebase
- Tech domain breakdown (% codebase): ${
    githubData.categoryPercentages
      ? Object.entries(githubData.categoryPercentages)
          .map(([k, v]) => `${k}: ${v}%`)
          .join(", ")
      : "N/A"
  }
- Repos by dominant domain: ${
    githubData.repoCategoryBreakdown
      ? Object.entries(githubData.repoCategoryBreakdown)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : "N/A"
  }
- Stars received: ${githubData.totalStars}
- Forks: ${githubData.totalForks}

### Growth (15% of score)
- Commit velocity trend: ${githubData.commitVelocityTrend ?? "N/A"} (>1 = accelerating vs prior year)
- Activity momentum ratio: ${githubData.activityMomentumRatio ?? "N/A"} (~1 = steady, >1 = ramping up recently)
- Domain diversity change: ${githubData.domainDiversityChange ?? "N/A"} distinct tech domains added vs prior year
`.trim();
}

/**
 * Free-plan version of formatGitHubMetrics.
 * Exposes only the 1-2 most important aggregate stats per category.
 * Detailed per-period and derived statistics are intentionally omitted —
 * they are gated behind the In-Depth Statistics feature (Student plan+).
 * The AI genuinely won't have the data to reveal, even under prompt injection.
 */
export function formatGitHubMetricsFree(githubData, userProfile) {
  const ed = formatEducation(userProfile.education);
  const exp = userProfile.experienceYears?.replace(/_/g, ' ') || 'Unknown';

  const skills = Array.isArray(userProfile.technicalSkills)
    ? userProfile.technicalSkills.join(', ')
    : (userProfile.technicalSkills || 'Not specified');
  const interests = Array.isArray(userProfile.technicalInterests)
    ? userProfile.technicalInterests.join(', ')
    : (userProfile.technicalInterests || '');

  // Cap language list to top 3 to avoid leaking full breadth data
  const topLanguages = (githubData.languages || []).slice(0, 3).join(', ') || 'Unknown';

  return `
## USER PROFILE
- Age: ${userProfile.age}
- Education: ${ed}
- Experience: ${exp}
- Current Status: ${userProfile.currentRole || 'Unknown'}
- Career Goal: ${userProfile.careerGoal || 'Not specified'}
- Technical Skills: ${skills}${interests ? `\n- Technical Interests: ${interests}` : ''}${userProfile.learningStyle ? `\n- Learning Style: ${userProfile.learningStyle.replace(/_/g, ' ')}` : ''}${userProfile.collaborationPreference ? `\n- Work Approach: ${userProfile.collaborationPreference.replace(/_/g, ' ')}` : ''}${userProfile.jobUrgency ? `\n- Job Search Timeline: ${userProfile.jobUrgency.replace(/_/g, ' ')}` : ''}${userProfile.hobbies ? `\n- Hobbies: ${userProfile.hobbies}` : ''}

## GITHUB METRICS (Free Plan — Summary View)

### Activity (40% of score)
- Commits last 365 days: ${githubData.commitsLast365 ?? githubData.totalCommits}
- Current streak: ${githubData.streak ?? 0} days

### Skill Signals (30% of score)
- Total repositories: ${githubData.totalRepos}
- Unique languages: ${githubData.languageCount ?? githubData.languages?.length ?? 'N/A'}
- Top languages: ${topLanguages}
- Stars received: ${githubData.totalStars}
- Forks: ${githubData.totalForks}

### Growth (15% of score)
- Commit velocity trend: ${githubData.commitVelocityTrend ?? 'N/A'} (>1 = accelerating vs prior year)

### Collaboration (15% of score)
- Total PRs: ${githubData.totalPRs ?? 0}
- Merged PRs: ${githubData.mergedPRs ?? 'N/A'}
`.trim();
}

/**
 * Route to the correct metrics formatter based on the user's plan.
 * Free plan: curated summary subset only.
 * Student plan and above: full metrics.
 * @param {Object} githubData
 * @param {Object} userProfile
 * @param {string} planId
 * @returns {string}
 */
export function formatGitHubMetricsForPlan(githubData, userProfile, planId) {
  return hasDetailedStats(planId)
    ? formatGitHubMetrics(githubData, userProfile)
    : formatGitHubMetricsFree(githubData, userProfile);
}

/**
 * Attempt to parse JSON from an AI response, with progressive sanitization
 */
function safeParseJSON(raw) {
  // Attempt 1: parse as-is
  try {
    return JSON.parse(raw);
  } catch {}

  // Attempt 2: fix trailing commas
  let cleaned = raw.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Attempt 3: remove control characters that break JSON strings
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch) =>
    ch === "\n" || ch === "\r" || ch === "\t" ? ch : "",
  );
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Attempt 4: use a regex to extract well-formed key-value pairs
  // Replace any unescaped backslashes that aren't valid JSON escapes
  cleaned = cleaned.replace(/\\(?!["\\bfnrtu/])/g, "\\\\");
  try {
    return JSON.parse(cleaned);
  } catch {}

  return null;
}

/**
 * Call OpenRouter API with optional model override.
 * @param {string} prompt - The prompt to send to the AI
 * @param {string} systemPrompt - Optional system prompt for context
 * @param {Function} onChunk - Optional callback for streaming chunks: (text) => void
 * @param {string} model - Optional model override (defaults to DEFAULT_MODEL)
 * @returns {Promise<string>} - AI response text
 */
export async function callOpenRouter(prompt, systemPrompt = "", onChunk = null, model = DEFAULT_MODEL) {
  const useStreaming = !!onChunk;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "amicooked",
    },
    body: JSON.stringify({
      model,
      stream: useStreaming,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  // Streaming mode
  if (useStreaming) {
    let fullText = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                onChunk(content);
              }
            } catch (e) {
              // Ignore JSON parse errors for malformed SSE lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }

  // Non-streaming mode
  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Phase 1: Ask the AI for category scores only.
 * Returns a normalized categoryScores object.
 */
async function fetchCategoryScores(githubData, userProfile, model = DEFAULT_MODEL, planId = 'free') {
  const systemPrompt = getScoringInstructions(planId);
  const metricsBlock = formatGitHubMetrics(githubData, userProfile);

  const prompt = `Score all four categories (0-100) for this GitHub profile using the calibration anchors in your instructions.

${metricsBlock}

Return ONLY the JSON object with categoryScores. No extra text.`;

  const response = await callOpenRouter(prompt, systemPrompt, null, model);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  let parsed = jsonMatch ? safeParseJSON(jsonMatch[0]) : null;

  if (!parsed) throw new Error("Phase 1: Could not parse scoring response");

  // Retry for any missing categories
  const missing = missingCategories(parsed.categoryScores || {});
  if (missing.length > 0) {
    console.warn("[scoring] Missing categories:", missing, "— retrying");
    const retryPrompt = `The previous response was missing scores for: ${missing.join(", ")}.

Using this GitHub profile data, return ONLY a JSON object with the missing categoryScores keys.

${metricsBlock}

Respond with ONLY this JSON (no extra text):
{
  "categoryScores": {
${missing.map((k) => `    "${k}": { "score": <integer 0-100>, "notes": "<1 sentence>" }`).join(",\n")}
  }
}`;
    try {
      const retryResp = await callOpenRouter(retryPrompt, systemPrompt, null, model);
      const retryMatch = retryResp.match(/\{[\s\S]*\}/);
      if (retryMatch) {
        const retryParsed = safeParseJSON(retryMatch[0]);
        if (retryParsed?.categoryScores) {
          parsed = {
            ...parsed,
            categoryScores: { ...(parsed.categoryScores || {}), ...retryParsed.categoryScores },
          };
        }
      }
    } catch (retryErr) {
      console.warn("[scoring] Retry failed, will fall back in normalization:", retryErr);
    }
  }

  // For Ultimate plan, the response may include categoryWeights at the top level
  const result = { categoryScores: parsed.categoryScores || {} };
  if (parsed.categoryWeights) result.categoryWeights = parsed.categoryWeights;
  return result;
}

/**
 * Phase 2: Given pre-computed category scores, ask the AI for the
 * summary, recommendations, and insights.
 * @param {string} [intensityId] - Roast intensity preference ID (from preferences.js)
 * @param {string} [nickname=''] - User's chosen nickname for personalized addressing
 * @param {{ cookedLevel: number, levelName: string }} [preComputedLevel] - Pre-computed level from Phase 1 scores
 * @param {string} [memoryBlock=''] - Formatted long-term memory for past analysis context
 */
async function fetchSynthesis(githubData, userProfile, categoryScores, onChunk = null, model = DEFAULT_MODEL, intensityId, nickname = '', preComputedLevel = null, memoryBlock = '') {
  const roastInstruction = getRoastInstruction(intensityId);
  let systemPrompt = getChatInstructions(roastInstruction) + getAnalysisModeInstructions("SYNTHESIS");
  if (nickname) {
    systemPrompt += `\n\n# USER NICKNAME\nThe user's chosen nickname is "${nickname}". Address them by this name naturally in your summary and recommendations.`;
  }
  const metricsBlock = formatGitHubMetrics(githubData, userProfile);

  // Format the pre-computed scores for the prompt
  const scoresBlock = Object.entries(categoryScores)
    .map(([k, v]) => `  ${k}: ${v?.score ?? "?"}  — ${v?.notes ?? ""}`)
    .join("\n");

  // Build the authoritative level block so the AI never has to guess
  let levelBlock = '';
  if (preComputedLevel) {
    levelBlock = `\n## FINAL COMPUTED LEVEL (authoritative — use this exact level name)
- Cooked Level: ${preComputedLevel.cookedLevel}/10
- Level Name: "${preComputedLevel.levelName}"
- Scale (worst → best): Burnt (1-2) → Well-Done (3-4) → Cooked (5-6) → Toasted (7-8) → Cooking (9-10)
- IMPORTANT: Your summary MUST use the level name "${preComputedLevel.levelName}" when referring to the user's level. Do NOT use any other level name.\n`;
  }

  // Include memory context for past analysis references (growth/setback)
  let memorySection = '';
  if (memoryBlock) {
    memorySection = `\n## PAST ANALYSIS MEMORY\n${memoryBlock}\nUse this to reference growth or setback compared to past analyses. Always ground references in the CURRENT analysis level above.\n`;
  }

  const prompt = `Using the pre-computed category scores and final computed level below, generate the summary, recommendations, and insights for this GitHub profile.

## PRE-COMPUTED CATEGORY SCORES (do NOT re-score)
${scoresBlock}
${levelBlock}${memorySection}
${metricsBlock}

Return ONLY this JSON (no extra text):
{
  "summary": "<2-3 sentence honest assessment — MUST reference the exact level name from FINAL COMPUTED LEVEL above>",
  "recommendations": ["<specific task with tech + timeline>", "<task 2>", "<task 3>"],
  "projectsInsight": "<1 sentence on how recommended projects help>",
  "languageInsight": "<1 sentence on their language stack>",
  "activityInsight": "<1 sentence on contribution patterns>"
}`;

  const response = await callOpenRouter(prompt, systemPrompt, null, model);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? safeParseJSON(jsonMatch[0]) : null;
  if (!parsed) throw new Error("Phase 2: Could not parse synthesis response");
  return parsed;
}

/**
 * Generate "Cooked Level" and recommendations based on GitHub data.
 * Two-phase approach: score first, then synthesize summary/recommendations/insights.
 * @param {Object} githubData - User's GitHub metrics
 * @param {Object} userProfile - User's profile data (age, education, interests, etc.)
 * @param {Function} onSynthesisChunk - Optional callback for streaming synthesis chunks
 * @param {string} model - Optional model override
 * @param {string} [intensityId] - Roast intensity preference ID (from preferences.js)
 * @param {string} [nickname=''] - User's chosen nickname for personalized addressing
 * @returns {Promise<Object>} - { cookedLevel, levelName, summary, recommendations, categoryScores, ... }
 */
export async function analyzeCookedLevel(githubData, userProfile, onSynthesisChunk = null, model = DEFAULT_MODEL, intensityId, nickname = '', planId = 'free', memoryBlock = '') {
  try {
    // Phase 1 — Scoring
    const scoringResult = await fetchCategoryScores(githubData, userProfile, model, planId);
    const rawCategoryScores = scoringResult.categoryScores || scoringResult;

    // Pre-compute the authoritative level from Phase 1 scores BEFORE Phase 2
    // so the synthesis prompt can reference the correct level name.
    const preNormalized = normalizeAnalysis({
      categoryScores: rawCategoryScores,
      ...(scoringResult.categoryWeights ? { categoryWeights: scoringResult.categoryWeights } : {}),
    });
    const preComputedLevel = {
      cookedLevel: preNormalized.cookedLevel,
      levelName: preNormalized.levelName,
    };

    // Phase 2 — Synthesis (summary, recommendations, insights) with optional streaming
    // Pass pre-computed level so the AI uses the exact correct level name in the summary.
    const synthesis = await fetchSynthesis(githubData, userProfile, rawCategoryScores, onSynthesisChunk, model, intensityId, nickname, preComputedLevel, memoryBlock);

    // Combine and normalize (final normalization is deterministic and will produce the same level)
    const combined = {
      ...synthesis,
      categoryScores: rawCategoryScores,
      ...(scoringResult.categoryWeights ? { categoryWeights: scoringResult.categoryWeights } : {}),
    };
    return normalizeAnalysis(combined);
  } catch (error) {
    console.error("AI analysis error:", error);
    throw error;
  }
}

/**
 * Get recommended projects from AI based on user profile and GitHub data
 * @param {Object} githubData - User's GitHub metrics
 * @param {Object} userProfile - User's profile data
 * @param {Function} onChunk - Optional callback for streaming chunks
 * @param {string} model - Optional model override
 * @returns {Promise<Array>} - Array of project objects with detailed info
 */
export async function getRecommendedProjects(githubData, userProfile, onChunk = null, model = DEFAULT_MODEL) {
  const systemPrompt = getChatInstructions() + getAnalysisModeInstructions("PROJECT_RECOMMENDATION");

  const prompt = `Suggest exactly 4 projects targeting this user's skill gaps.

${formatGitHubMetrics(githubData, userProfile)}

Return ONLY a JSON array of exactly 4 projects matching the format in your instructions. No trailing commas. Double quotes only.
REMINDER: skill1, skill2, skill3 must be specific technologies/frameworks (e.g. "React", "PostgreSQL", "Docker"), NOT broad topics like "Fullstack Development" or "API Development".`;

  try {
    const response = await callOpenRouter(prompt, systemPrompt, onChunk, model);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const result = safeParseJSON(jsonMatch[0]);
      if (result && Array.isArray(result) && result.length > 0) {
        // Enforce 3-6 items in suggestedStack for every project
        const normalized = result.slice(0, 4).map((project) => {
          const stack = Array.isArray(project.suggestedStack) ? project.suggestedStack : [];
          // Trim to 6 max
          const trimmed = stack.slice(0, 6);
          // Pad to 3 min with generic fallback entries
          while (trimmed.length < 3) {
            trimmed.push({ name: "Documentation", description: "Project documentation and README" });
          }
          return { ...project, suggestedStack: trimmed };
        });
        return normalized;
      }
    }
    throw new Error("Could not parse AI project recommendations");
  } catch (error) {
    console.error("AI project recommendation error:", error);
    throw error;
  }
}
