// GitHub GraphQL API configuration
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * Fetch user's GitHub data using GraphQL
 * @param {string} accessToken - GitHub OAuth access token
 * @returns {Promise<Object>} - Aggregated GitHub metrics
 */
export async function fetchGitHubData(accessToken) {
  // Date range variables for year-over-year growth metrics
  const now = new Date();
  const prevYearEnd = new Date(now);
  prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
  const prevYearStart = new Date(prevYearEnd);
  prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);

  const currentYearFrom = prevYearEnd.toISOString();
  const prevYearFromISO = prevYearStart.toISOString();
  const prevYearToISO = prevYearEnd.toISOString();

  const query = `
    query($currentYearFrom: DateTime!, $prevYearFrom: DateTime!, $prevYearTo: DateTime!) {
      viewer {
        login
        name
        avatarUrl
        bio
        company
        location
        createdAt
        repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: CREATED_AT, direction: DESC}) {
          totalCount
          nodes {
            name
            description
            stargazerCount
            forkCount
            updatedAt
            createdAt
            repositoryTopics(first: 10) {
              nodes {
                topic {
                  name
                }
              }
            }
            primaryLanguage {
              name
            }
            languages(first: 10) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 1) {
                    totalCount
                  }
                }
              }
            }
          }
        }
        allPRs: pullRequests(first: 1) {
          totalCount
        }
        mergedPRs: pullRequests(states: MERGED, first: 1) {
          totalCount
        }
        openIssues: issues(states: [OPEN], first: 1) {
          totalCount
        }
        closedIssues: issues(states: [CLOSED], first: 1) {
          totalCount
        }
        currentYear: contributionsCollection(from: $currentYearFrom) {
          totalCommitContributions
          restrictedContributionsCount
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
        previousYear: contributionsCollection(from: $prevYearFrom, to: $prevYearTo) {
          totalCommitContributions
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

  const variables = {
    currentYearFrom,
    prevYearFrom: prevYearFromISO,
    prevYearTo: prevYearToISO,
  };

  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error('GraphQL query failed');
    }

    return processGitHubData(data.data.viewer);
  } catch (error) {
    console.error('GitHub API error:', error);
    throw error;
  }
}

/**
 * Process raw GitHub data into metrics matching the agent scoring formula:
 * Activity (40%) | Skill Signals (30%) | Growth (15%) | Collaboration (15%)
 */
function processGitHubData(viewer) {
  const repos = viewer.repositories.nodes;
  const calendarWeeks = viewer.currentYear.contributionCalendar.weeks;

  // ─── Flatten calendar into per-day and per-week arrays ───────────────────────
  const allDays = calendarWeeks.flatMap(week => week.contributionDays);
  const weeklyTotals = calendarWeeks.map(week =>
    week.contributionDays.reduce((s, d) => s + d.contributionCount, 0)
  );

  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // ─── ACTIVITY METRICS ────────────────────────────────────────────────────────
  const commitsLast365 = viewer.currentYear.totalCommitContributions;
  const commitsLast90 = allDays
    .filter(d => new Date(d.date) >= ninetyDaysAgo)
    .reduce((s, d) => s + d.contributionCount, 0);

  const activeWeeks = weeklyTotals.filter(c => c >= 1).length;
  const activeWeeksPct = parseFloat(((activeWeeks / 52) * 100).toFixed(1));

  const avgCommitsPerActiveWeek = activeWeeks > 0
    ? parseFloat((commitsLast365 / activeWeeks).toFixed(1))
    : 0;

  // Standard deviation of weekly commits
  const mean = weeklyTotals.reduce((s, v) => s + v, 0) / weeklyTotals.length || 0;
  const variance = weeklyTotals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / weeklyTotals.length || 0;
  const stdDevPerWeek = parseFloat(Math.sqrt(variance).toFixed(1));

  // Longest inactive gap in days (consecutive days with 0 commits within the calendar)
  let longestInactiveGap = 0;
  let currentGap = 0;
  for (const day of allDays) {
    if (day.contributionCount === 0) {
      currentGap++;
      longestInactiveGap = Math.max(longestInactiveGap, currentGap);
    } else {
      currentGap = 0;
    }
  }

  // ─── LANGUAGE CATEGORY MAP ───────────────────────────────────────────────────
  // Broad domains — AI uses these to infer what kind of work the user does
  // without us hard-coding FE/BE assumptions
  const categoryMap = {
    'JavaScript': 'web', 'TypeScript': 'web', 'HTML': 'web', 'CSS': 'web',
    'SCSS': 'web', 'Sass': 'web', 'Less': 'web', 'Vue': 'web', 'Svelte': 'web', 'Elm': 'web',
    'Ruby': 'web', 'PHP': 'web',
    'Python': 'general', 'Java': 'enterprise', 'C#': 'enterprise',
    'C': 'systems', 'C++': 'systems', 'Rust': 'systems', 'Go': 'systems', 'Assembly': 'systems', 'Zig': 'systems',
    'Swift': 'mobile', 'Kotlin': 'mobile', 'Dart': 'mobile', 'Objective-C': 'mobile',
    'R': 'data', 'Jupyter Notebook': 'data', 'MATLAB': 'data', 'Julia': 'data',
    'Shell': 'scripting', 'PowerShell': 'scripting', 'Lua': 'scripting', 'Perl': 'scripting', 'Makefile': 'scripting',
    'Haskell': 'functional', 'Elixir': 'functional', 'Erlang': 'functional',
    'Scala': 'functional', 'Clojure': 'functional', 'OCaml': 'functional', 'F#': 'functional',
  };

  // ─── AGGREGATE LANGUAGE BYTES ────────────────────────────────────────────────
  const langAgg = {};
  repos.forEach(repo => {
    (repo.languages?.edges || []).forEach(edge => {
      const name = edge.node.name;
      if (!langAgg[name]) {
        langAgg[name] = { name, color: edge.node.color, bytes: 0, repoCount: 0, lastUsed: null };
      }
      langAgg[name].bytes += edge.size;
      langAgg[name].repoCount += 1;
      if (!langAgg[name].lastUsed || repo.updatedAt > langAgg[name].lastUsed) {
        langAgg[name].lastUsed = repo.updatedAt;
      }
    });
  });

  const totalLanguageBytes = Object.values(langAgg).reduce((s, l) => s + l.bytes, 0);
  const languageBreakdown = Object.values(langAgg)
    .map(l => ({
      ...l,
      percentage: totalLanguageBytes > 0 ? parseFloat(((l.bytes / totalLanguageBytes) * 100).toFixed(2)) : 0,
      category: categoryMap[l.name] ?? 'other',
    }))
    .sort((a, b) => b.bytes - a.bytes);

  // ─── SKILL SIGNAL METRICS ────────────────────────────────────────────────────
  const languageCount = Object.keys(langAgg).length;
  const topLanguageDominancePct = languageBreakdown[0]?.percentage ?? 0;

  // Top languages by number of repos using them as primary language
  const languageCounts = {};
  repos.forEach(repo => {
    if (repo.primaryLanguage) {
      const lang = repo.primaryLanguage.name;
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
  });
  const topLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);

  // Repos grouped by their dominant tech domain (based on language byte composition)
  const repoCategoryBreakdown = {};
  repos.forEach(repo => {
    const edges = repo.languages?.edges || [];
    if (edges.length === 0) return;
    // Count bytes per category for this repo
    const catBytes = {};
    edges.forEach(e => {
      const cat = categoryMap[e.node.name] ?? 'other';
      catBytes[cat] = (catBytes[cat] || 0) + e.size;
    });
    // Dominant category = most bytes
    const dominant = Object.entries(catBytes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
    repoCategoryBreakdown[dominant] = (repoCategoryBreakdown[dominant] || 0) + 1;
  });

  // Bytes per category across all repos (for AI to understand tech domain distribution)
  const categoryByteBreakdown = {};
  languageBreakdown.forEach(l => {
    const cat = l.category;
    categoryByteBreakdown[cat] = (categoryByteBreakdown[cat] || 0) + l.bytes;
  });
  const totalCatBytes = Object.values(categoryByteBreakdown).reduce((s, v) => s + v, 0);
  const categoryPercentages = Object.fromEntries(
    Object.entries(categoryByteBreakdown)
      .map(([cat, bytes]) => [cat, parseFloat(((bytes / (totalCatBytes || 1)) * 100).toFixed(1))])
      .sort((a, b) => b[1] - a[1])
  );

  // ─── LANGUAGE DIVERSITY OVER TIME ────────────────────────────────────────────
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const twoYearsAgo = new Date(today);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const recentDomains = new Set();
  const olderDomains = new Set();
  repos.forEach(repo => {
    const isRecent = repo.updatedAt && new Date(repo.updatedAt) >= oneYearAgo;
    (repo.languages?.edges || []).forEach(edge => {
      const cat = categoryMap[edge.node.name] ?? 'other';
      if (isRecent) recentDomains.add(cat);
      else olderDomains.add(cat);
    });
  });
  // Positive = exploring more domains this year; negative = narrowing
  const domainDiversityChange = recentDomains.size - olderDomains.size;

  // ─── GROWTH METRICS ──────────────────────────────────────────────────────────
  const prevYearCommits = viewer.previousYear.totalCommitContributions;
  const commitVelocityTrend = parseFloat((commitsLast365 / (prevYearCommits + 1)).toFixed(2));
  const activityMomentumRatio = parseFloat(((commitsLast90 * 4) / (commitsLast365 + 1)).toFixed(2));

  // ─── COLLABORATION METRICS ───────────────────────────────────────────────────
  const totalPRs = viewer.allPRs.totalCount;
  const mergedPRs = viewer.mergedPRs.totalCount;
  const openIssues = viewer.openIssues.totalCount;
  const closedIssues = viewer.closedIssues.totalCount;
  const issuesClosedRatio = parseFloat((closedIssues / (openIssues + 1)).toFixed(2));

  // ─── TOTALS FROM REPOS ───────────────────────────────────────────────────────
  const totalCommitsInRepos = repos.reduce((sum, repo) => {
    return sum + (repo.defaultBranchRef?.target?.history?.totalCount || 0);
  }, 0);

  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazerCount, 0);
  const totalForks = repos.reduce((sum, repo) => sum + repo.forkCount, 0);

  // ─── STREAK ──────────────────────────────────────────────────────────────────
  const contributionDays = allDays.slice().reverse();
  let currentStreak = 0;
  for (const day of contributionDays) {
    if (day.contributionCount > 0) currentStreak++;
    else break;
  }

  return {
    // Identity
    username: viewer.login,
    name: viewer.name,
    avatarUrl: viewer.avatarUrl,
    bio: viewer.bio,
    company: viewer.company,
    location: viewer.location,
    accountCreated: viewer.createdAt,

    // Repository overview
    totalRepos: viewer.repositories.totalCount,
    totalCommitsInRepos,
    totalStars,
    totalForks,

    // ── ACTIVITY (40% of score) ──────────────────────────
    totalCommits: commitsLast365,      // commits in last 365 days
    commitsLast365,                    // alias for clarity
    commitsLast90,                     // for momentum ratio
    prevYearCommits,                   // commits in year before that
    activeWeeksPct,                    // (active weeks / 52) * 100
    avgCommitsPerActiveWeek,           // commits_365 / active_weeks
    stdDevPerWeek,                     // consistency indicator
    longestInactiveGap,                // days without a commit

    // PRs & Issues
    totalPRs,
    mergedPRs,
    openIssues,
    closedIssues,
    issuesClosedRatio,                 // closed / (opened + 1)

    // ── SKILL SIGNALS (30% of score) ─────────────────────
    languages: topLanguages,           // top 5 by repo count
    languageCount,                     // total unique languages
    topLanguageDominancePct,           // % bytes of top language
    repoCategoryBreakdown,             // repos per dominant tech domain
    categoryPercentages,               // % of total codebase per domain
    languageBreakdown,
    totalLanguageBytes,

    // ── GROWTH (15% of score) ────────────────────────────
    commitVelocityTrend,               // commitsLast365 / (prevYear + 1); >1 = accelerating
    activityMomentumRatio,             // (last90*4) / (last365+1); ~1 = steady, >1 = ramping
    domainDiversityChange,             // distinct tech domains added/lost vs prior year

    // ── COLLABORATION (15% of score) ────────────────────
    totalReviews: 0,                   // GraphQL doesn't expose review count directly

    // Calendar raw (for any custom UI)
    streak: currentStreak,
    totalContributions: viewer.currentYear.contributionCalendar.totalContributions,
    contributionCalendar: viewer.currentYear.contributionCalendar,
  };
}
