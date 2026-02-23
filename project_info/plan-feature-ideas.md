# Plan Feature Ideas

> **Status:** These are unimplemented feature suggestions only.  
> Plans.js already lists them in each plan's `features` array to reflect hierarchy on pricing cards.  
> Implement them one at a time and remove this doc section when done.

---

## Feature Hierarchy Overview

Each paid plan inherits everything from the plan below it.

| Feature | Free | Student | Pro | Ultimate |
|---|:---:|:---:|:---:|:---:|
| GitHub Profile Analysis | ✅ | ✅ | ✅ | ✅ |
| Basic Score Breakdown | ✅ | ✅ | ✅ | ✅ |
| Job Fit Checker | ✅ | ✅ | ✅ | ✅ |
| Project Recommendations | ✅ | ✅ | ✅ | ✅ |
| AI Agent | ✅ | ✅ | ✅ | ✅ |
| Progress Tracking | ✅ | ✅ | ✅ | ✅ |
| Public Data Only — Always | ✅ | ✅ | ✅ | ✅ |
| **In-Depth Statistics** | ❌ | ✅ | ✅ | ✅ |
| **Score History** | ❌ | ✅ | ✅ | ✅ |
| **Career Roadmap** | ❌ | ✅ | ✅ | ✅ |
| **Job Description Matcher** | ❌ | ❌ | ✅ | ✅ |
| **Peer Benchmarking** | ❌ | ❌ | ✅ | ✅ |
| **Unlimited Project Chats** | ❌ | ❌ | ✅ | ✅ |
| **Multi-Profile Analysis** | ❌ | ❌ | ❌ | ✅ |
| **LinkedIn Optimization** | ❌ | ❌ | ❌ | ✅ |
| **API Access** | ❌ | ❌ | ❌ | ✅ |

> **In-Depth Statistics** is already implemented. The remaining 9 are proposals below.

---

## Student Plan — 3 Unique Features

> Already includes **In-Depth Statistics** (implemented). These are the remaining 2 + 1 bonus suggestion.

---

### 1. Score History

**What it is:**  
A time-series chart showing how the user's Cooked Score has changed across every analysis they've run. Displayed as a line graph on the Results page or a dedicated "History" tab.

**Why it's valuable:**  
Students want proof of improvement. Watching a score climb from 4 → 7 over 3 months is motivating and gives tangible evidence of portfolio growth.

**Implementation notes:**

- **Storage:** Every time `saveAnalysisResults()` is called, also append a record to a subcollection:  
  `users/{uid}/scoreHistory/{timestamp}` with `{ score, levelName, analyzedAt }`.
- **UI:** A small `recharts` or custom SVG line chart in the Results sidebar or a new "History" modal. Plotting `analyzedAt` (x) vs `cookedLevel` (y).
- **Firestore rule:** `scoreHistory` should be user-owned-only, matching the existing `results` subcollection pattern.
- **Gate:** Check `hasDetailedStats(plan)` before rendering the chart (same guard as In-Depth Statistics).
- **Plan gate field in plans.js:** Already reflected via `student+` features array.

**Effort estimate:** ~1–2 days  
**Dependencies:** `recharts` (or plain SVG), no new API calls needed.

---

### 2. Career Roadmap

**What it is:**  
An AI-generated 30/60/90 day action plan tailored to the user's career goal, experience level, and current GitHub weak points. Displayed as a structured checklist or timeline on the Results page.

**Why it's valuable:**  
Analysis tells you *what's wrong*. The Roadmap tells you *what to do next, in what order, and by when*. This turns a passive score into an active coaching tool — a strong Student differentiator.

**Implementation notes:**

- **Trigger:** Add a "Generate Roadmap" button in the Results page sidebar/main content that calls OpenRouter with a specialized prompt.
- **Prompt inputs:** `analysis.summary`, `analysis.recommendations`, `userProfile.careerGoal`, `userProfile.experienceYears`, `analysis.cookedLevel`, and top skill gap categories from `analysis.categoryScores`.
- **System prompt location:** Add a `ROADMAP_INSTRUCTIONS` constant in `src/config/agent-instructions.js` so it stays maintainable.
- **Response shape (JSON schema to request from the AI):**
  ```json
  {
    "day30": ["action 1", "action 2", "action 3"],
    "day60": ["action 1", "action 2"],
    "day90": ["action 1", "action 2"]
  }
  ```
- **Storage:** Save to `users/{uid}/roadmap/latest` in Firestore so it persists across sessions.
- **Usage counting:** Each generation counts against `USAGE_TYPES.REANALYZE` (or a new `USAGE_TYPES.ROADMAP` key — add to `plans.js` if you want separate tracking).
- **Gate:** Show a locked CTA for Free users linking to `/pricing`.

**Effort estimate:** ~2–3 days  
**Dependencies:** Already have OpenRouter service — just a new prompt. Add `ROADMAP_INSTRUCTIONS` to agent-instructions.js.

---

## Pro Plan — 3 Unique Features

> Includes all Student features plus these.

---

### 3. Job Description Matcher

**What it is:**  
A text area where users paste any job description. The AI compares it against their GitHub profile and returns: a percentage match score, a list of matched skills, and a list of missing skills with suggestions for how to fill the gaps.

**Why it's valuable:**  
Job hunting is the core use case of this app. This feature closes the loop between "I have these skills" and "this role needs these skills." Pro users are serious about job hunting — this is their most practical tool.

**Implementation notes:**

- **UI:** New tab or expandable section in Results page: "Job Fit Checker" (already mentioned in features — this upgrades it from a basic check to a deep matcher). Or add it as a new panel below the salary card.
- **Inputs to AI:** job description text (user-pasted, sanitize + cap at 3,000 chars), `githubData.languages`, `githubData.categoryPercentages`, `analysis.categoryScores`, `userProfile.skills`.
- **System prompt:** Add `JOB_MATCH_INSTRUCTIONS` to `src/config/agent-instructions.js`.
- **Response shape:**
  ```json
  {
    "matchScore": 72,
    "matchedSkills": ["Python", "React", "REST APIs"],
    "missingSkills": [
      { "skill": "Docker", "suggestion": "Containerize one of your existing projects" }
    ],
    "verdict": "Strong fit — close the Docker gap and you're well-positioned."
  }
  ```
- **Usage:** Count against `USAGE_TYPES.MESSAGE` so it shares the Pro monthly limit.
- **Gate:** Block for Free/Student with a plan-upgrade prompt at the UI level (check plan from `usageSummary`).
- **Security:** Trim and cap user-pasted JD at 3,000 characters before inserting into any prompt.

**Effort estimate:** ~2 days  
**Dependencies:** Existing OpenRouter service, existing usage tracking.

---

### 4. Peer Benchmarking

**What it is:**  
A comparison panel showing how the user's key metrics (commits/month, streak, PR merge rate, language diversity) stack up against anonymized averages for developers in their target role/experience bracket.

**Why it's valuable:**  
Context is everything. A 50/100 score is meaningless without knowing whether the average junior developer scores 40 or 60. Benchmarks make progress feel real and provide motivation to close specific gaps.

**Implementation notes:**

- **Data approach (hackathon-friendly):** Hardcode a curated set of realistic benchmark ranges per role/experience level in `src/config/benchmarks.js`. This avoids needing real aggregate data.  
  Example structure:
  ```js
  export const BENCHMARKS = {
    'junior-frontend': {
      avgCommitsPerMonth: { low: 15, mid: 35, high: 60 },
      currentStreak: { low: 3, mid: 10, high: 30 },
      mergedPRs: { low: 5, mid: 20, high: 50 },
    },
    // ...
  }
  ```
- **UI:** A bar or gauge chart per metric, showing the user's value vs the `low/mid/high` range for their bracket. Use Tailwind's width utilities for the bar segments.
- **Bracket selection:** Derive role from `userProfile.careerGoal` and experience from `userProfile.experienceYears`. Map these to a benchmark key.
- **No new network calls:** Entirely client-side computation against the hardcoded `BENCHMARKS` config.
- **Gate:** Render only if `plan === 'pro' || plan === 'ultimate'`. Freshly verify from Firestore (same pattern as In-Depth Statistics gate).

**Effort estimate:** ~1–2 days  
**Dependencies:** No new packages needed. Add `src/config/benchmarks.js`.

---

### 5. Unlimited Project Chats

**What it is:**  
Remove the monthly cap on project-specific AI conversations (`USAGE_TYPES.PROJECT_CHAT`) for Pro and Ultimate users.

**Why it's valuable:**  
Pro users are actively building projects from the AI's recommendations. Hitting a chat limit mid-conversation is extremely frustrating at this tier. This is a straightforward limit removal that has outsized perceived value.

**Implementation notes:**

- **In plans.js:** Set `limits[USAGE_TYPES.PROJECT_CHAT]: null` for both `pro` and `ultimate` plans (null = unlimited per existing convention).
- **Usage service:** `src/services/usage.js` already treats `null` limits as unlimited — no new logic needed.
- **UI:** The AI Usage overlay already renders "Unlimited" when limit is `null`. The feature works automatically once limits are set to `null`.
- **Note:** The `PROJECT_CHAT` limit is currently `15` for Pro and `50` for Ultimate — change both to `null`.

**Effort estimate:** 5 minutes (just a `plans.js` edit)  
**Dependencies:** None.

---

## Ultimate Plan — 3 Unique Features

> Includes all Pro features plus these.

---

### 6. Multi-Profile Analysis

**What it is:**  
Users can analyze up to 3 GitHub profiles in a single session — their own and two others (e.g., teammates, competitors, or candidates they're reviewing). Results appear side-by-side in a comparison view.

**Why it's valuable:**  
Engineering leads doing code reviews, CTOs evaluating candidates, or developers benchmarking against their dream-job colleagues — this is a power-user feature that justifies the top-tier price. It's also a natural viral loop (people share their profile with others to compare).

**Implementation notes:**

- **UI:** A new "Compare Profiles" button on the Dashboard that lets the user add 1–2 additional GitHub usernames. Fetch via the existing `src/services/github.js` with their OAuth token.
- **Analysis:** Run the full analysis pipeline for each additional profile (re-using `src/services/agent.js`). Each additional analysis counts against `USAGE_TYPES.REANALYZE`.
- **Results view:** A side-by-side card layout (3 columns on desktop, stacked on mobile) for the Results page, showing the Cooked Score, category scores, and top 3 metrics per profile.
- **Storage:** Store comparison sessions at `users/{uid}/comparisons/{sessionId}` in Firestore.
- **Gate:** Check that `verifiedPlan === 'ultimate'` (fresh Firestore read) before allowing the additional profile fetch.
- **Privacy note:** Only public GitHub data is fetched — consistent with the "Public Data Only — Always" commitment. Make this clear in the UI.

**Effort estimate:** ~3–4 days  
**Dependencies:** Existing `github.js` and `agent.js` services. May need an additional OpenRouter budget consideration (3× the AI calls per session).

---

### 7. LinkedIn Optimization

**What it is:**  
An AI-generated list of specific improvements for the user's LinkedIn profile based on their GitHub analysis — headline rewrites, skills section gaps, about section suggestions, and project descriptions to add.

**Why it's valuable:**  
GitHub and LinkedIn are read in tandem by recruiters. Making both consistent and strong dramatically improves hiring outcomes. This is a unique, sticky feature that Ultimate users will return to repeatedly.

**Implementation notes:**

- **Inputs to AI:** `analysis.summary`, `analysis.categoryScores`, `githubData.languages`, `userProfile.careerGoal`, `userProfile.skills`, `userProfile.experienceYears`.
- **No LinkedIn API needed:** The user manually pastes their current LinkedIn headline and/or about section into a text area (cap at 2,000 chars, sanitize). The AI rewrites or supplements it.
- **System prompt:** Add `LINKEDIN_INSTRUCTIONS` to `src/config/agent-instructions.js`. Key directive: ground all suggestions in actual GitHub evidence (e.g., "Add 'Python' to your skills — it appears in 60% of your codebase").
- **Response shape:**
  ```json
  {
    "headline": "Full-Stack Developer | React · Python · 3+ yrs open source",
    "about": "...",
    "skillsToAdd": ["Docker", "GraphQL"],
    "projectsToHighlight": ["repo-name-1", "repo-name-2"]
  }
  ```
- **UI:** A modal or full-screen overlay (similar to the stats popup pattern already in Results.jsx).
- **Usage:** Count against `USAGE_TYPES.MESSAGE`. One generation per session is reasonable.
- **Gate:** Fresh Firestore plan check — `ultimate` only.

**Effort estimate:** ~2 days  
**Dependencies:** Existing OpenRouter service.

---

### 8. API Access

**What it is:**  
A personal API key that lets Ultimate users programmatically retrieve their latest analysis results as JSON — enabling integrations with portfolio sites, job trackers, Notion databases, or custom dashboards.

**Why it's valuable:**  
Technical power users (the Ultimate audience) want to own and pipe their data. A simple read-only API key that returns their latest Cooked Score and category scores is low implementation effort but high perceived value for developers.

**Implementation notes:**

- **Key generation:** When an Ultimate user opts in, generate a random 32-byte hex token server-side (ideally via a Firebase Cloud Function). Store a bcrypt hash of it in Firestore at `users/{uid}/apiKey/hash`. Return the plaintext key once — never store it.
- **Read endpoint:** A Firebase Cloud Function at `GET /api/v1/analysis` that accepts the API key as a Bearer token, verifies against the stored hash, checks the user's plan, and returns the latest `results/latest` document from Firestore.
- **Response:**
  ```json
  {
    "cookedLevel": 7,
    "levelName": "Toasted",
    "analyzedAt": "2026-02-18T14:23:00Z",
    "categoryScores": { ... }
  }
  ```
- **UI:** A new "API Access" section in the usage overlay or a dedicated "Developer" settings page, showing the key (masked), a regenerate button, and a copy button.
- **Rate limiting:** Enforce 60 requests/hour per key server-side in the Cloud Function.
- **Firestore rules:** The `/users/{uid}/apiKey` document should not be readable by the client directly (key verification happens server-side only).

**Effort estimate:** ~3–4 days  
**Dependencies:** Firebase Cloud Functions (not yet set up). This is the most complex feature and may warrant its own epic.

---

## Implementation Priority Suggestion

If you're shipping features one at a time, this order gives the most user value per effort:

1. **Unlimited Project Chats** (Pro) — 5 minutes, pure config change
2. **Score History** (Student) — 1–2 days, high motivational value
3. **Job Description Matcher** (Pro) — 2 days, core use case
4. **Career Roadmap** (Student) — 2–3 days, strong differentiator
5. **Peer Benchmarking** (Pro) — 1–2 days, no API calls needed
6. **LinkedIn Optimization** (Ultimate) — 2 days, unique angle
7. **Multi-Profile Analysis** (Ultimate) — 3–4 days, viral potential
8. **API Access** (Ultimate) — 3–4 days, requires Cloud Functions setup
