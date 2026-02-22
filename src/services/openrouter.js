// OpenRouter API configuration
import { formatEducation } from "@/utils/formatEducation";
import { getAgentInstructions, getChatInstructions, getAnalysisModeInstructions } from "@/config/agent-instructions";

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

/**
 * Validate and normalise the raw AI response:
 * - Renames aliased category keys
 * - Clamps scores to 0-100
 * - For any still-missing category, derives a fallback from the mean of
 *   present scores (never an arbitrary constant)
 * - Computes cookedLevel and levelName deterministically
 */
function normalizeAnalysis(raw) {
  const renamed = renameKeys(raw.categoryScores || {});

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
  for (const [key, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const cat = renamed[key] || {};
    const rawScore =
      typeof cat.score === "number" && !isNaN(cat.score) ? cat.score : fallback;
    categories[key] = {
      score: Math.min(100, Math.max(0, Math.round(rawScore))),
      weight,
      notes: (cat.notes || "").trim(),
    };
  }

  // Derive cookedLevel deterministically: weighted average of 0-100 scores → 0-10
  const weightedAvg = Object.entries(CATEGORY_WEIGHTS).reduce(
    (sum, [key, w]) => sum + categories[key].score * (w / 100),
    0,
  );
  const cookedLevel = Math.min(10, Math.max(0, Math.round(weightedAvg / 10)));
  const levelName = deriveLevelName(cookedLevel);

  return { ...raw, cookedLevel, levelName, categoryScores: categories };
}
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

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

  return `
## USER PROFILE
- Age: ${userProfile.age}
- Education: ${ed}
- Experience: ${exp}
- Current Status: ${userProfile.currentRole || "Unknown"}
- Career Goal: ${userProfile.careerGoal || "Not specified"}
- Technical Skills: ${userProfile.technicalSkills || "Not specified"}${userProfile.technicalInterests ? `\n- Technical Interests: ${userProfile.technicalInterests}` : ""}${userProfile.hobbies ? `\n- Hobbies: ${userProfile.hobbies}` : ""}

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
 * Call OpenRouter API with auto model selection
 * @param {string} prompt - The prompt to send to the AI
 * @param {string} systemPrompt - Optional system prompt for context
 * @returns {Promise<string>} - AI response text
 */
export async function callOpenRouter(prompt, systemPrompt = "") {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "amicooked",
      },
      body: JSON.stringify({
        model: "openrouter/free", // Auto-select model based on prompt
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenRouter API error:", error);
    throw error;
  }
}

/**
 * Generate "Cooked Level" and recommendations based on GitHub data
 * @param {Object} githubData - User's GitHub metrics
 * @param {Object} userProfile - User's profile data (age, education, interests, etc.)
 * @returns {Promise<Object>} - { cookedLevel, summary, recommendations }
 */
export async function analyzeCookedLevel(githubData, userProfile) {
  const systemPrompt = getAgentInstructions();

  const prompt = `Analyze this GitHub profile. Score all four categories (0-100) using the calibration anchors in your instructions.

${formatGitHubMetrics(githubData, userProfile)}

Return ONLY valid JSON in this format, with no extra text:
{
  "summary": "<1-2 sentence plain-English assessment>",
  "recommendations": ["<specific actionable task 1>", "<task 2>", "<task 3>"],
  "projectsInsight": "<1 sentence on how recommended projects help>",
  "languageInsight": "<1 sentence on language stack>",
  "activityInsight": "<1 sentence on contribution patterns>",
  "categoryScores": {
    "activity": { "score": <0-100>, "notes": "<1 sentence>" },
    "skillSignals": { "score": <0-100>, "notes": "<1 sentence>" },
    "growth": { "score": <0-100>, "notes": "<1 sentence>" },
    "collaboration": { "score": <0-100>, "notes": "<1 sentence>" }
  }
}

All 4 categoryScores REQUIRED.`;

  try {
    const response = await callOpenRouter(prompt, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    let parsed = jsonMatch ? safeParseJSON(jsonMatch[0]) : null;

    if (parsed) {
      const missing = missingCategories(parsed.categoryScores || {});

      // If some categories didn't come back, do one targeted retry for just those
      if (missing.length > 0) {
        console.warn(
          "[analysis] Missing categories after first pass:",
          missing,
          "— retrying",
        );
        const retryPrompt = `The previous analysis was missing scores for: ${missing.join(", ")}.

Using the same GitHub profile data below, return ONLY a JSON object with just the missing categoryScores keys — nothing else.

${formatGitHubMetrics(githubData, userProfile)}

Respond with ONLY this JSON (no extra text):
{
  "categoryScores": {
${missing.map((k) => `    "${k}": { "score": <integer 0-100>, "notes": "<1 sentence>" }`).join(",\n")}
  }
}`;

        try {
          const retryResp = await callOpenRouter(retryPrompt, systemPrompt);
          const retryMatch = retryResp.match(/\{[\s\S]*\}/);
          if (retryMatch) {
            const retryParsed = safeParseJSON(retryMatch[0]);
            if (retryParsed?.categoryScores) {
              // Merge retry scores into the original parsed object
              parsed = {
                ...parsed,
                categoryScores: {
                  ...(parsed.categoryScores || {}),
                  ...retryParsed.categoryScores,
                },
              };
            }
          }
        } catch (retryErr) {
          console.warn(
            "[analysis] Retry failed, normalizing with fallback:",
            retryErr,
          );
        }
      }

      return normalizeAnalysis(parsed);
    }

    throw new Error("Could not parse AI response");
  } catch (error) {
    console.error("AI analysis error:", error);
    throw error;
  }
}

/**
 * Get recommended projects from AI based on user profile and GitHub data
 * @param {Object} githubData - User's GitHub metrics
 * @param {Object} userProfile - User's profile data
 * @returns {Promise<Array>} - Array of project objects with detailed info
 */
export async function getRecommendedProjects(githubData, userProfile) {
  const systemPrompt = getChatInstructions() + getAnalysisModeInstructions("PROJECT_RECOMMENDATION");

  const prompt = `Suggest exactly 4 projects targeting this user's skill gaps.

${formatGitHubMetrics(githubData, userProfile)}

Return ONLY a JSON array of exactly 4 projects matching the format in your instructions. No trailing commas. Double quotes only.`;

  try {
    const response = await callOpenRouter(prompt, systemPrompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const result = safeParseJSON(jsonMatch[0]);
      if (result && Array.isArray(result) && result.length > 0)
        return result.slice(0, 4);
    }
    throw new Error("Could not parse AI project recommendations");
  } catch (error) {
    console.error("AI project recommendation error:", error);
    throw error;
  }
}
