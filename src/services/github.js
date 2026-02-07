// GitHub GraphQL API configuration
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * Fetch user's GitHub data using GraphQL
 * @param {string} accessToken - GitHub OAuth access token
 * @returns {Promise<Object>} - Aggregated GitHub metrics
 */
export async function fetchGitHubData(accessToken) {
  const query = `
    query {
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
            primaryLanguage {
              name
            }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 100) {
                    totalCount
                  }
                }
              }
            }
          }
        }
        pullRequests(first: 100) {
          totalCount
        }
        issues(first: 100) {
          totalCount
        }
        contributionsCollection {
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
      }
    }
  `;

  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
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
 * Process raw GitHub data into useful metrics
 * @param {Object} viewer - GitHub viewer data
 * @returns {Object} - Processed metrics
 */
function processGitHubData(viewer) {
  const repos = viewer.repositories.nodes;
  
  // Calculate total commits across all repos
  const totalCommitsInRepos = repos.reduce((sum, repo) => {
    const commits = repo.defaultBranchRef?.target?.history?.totalCount || 0;
    return sum + commits;
  }, 0);

  // Extract languages
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

  // Calculate current streak
  const contributionDays = viewer.contributionsCollection.contributionCalendar.weeks
    .flatMap(week => week.contributionDays)
    .reverse();

  let currentStreak = 0;
  for (const day of contributionDays) {
    if (day.contributionCount > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Total stars and forks
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazerCount, 0);
  const totalForks = repos.reduce((sum, repo) => sum + repo.forkCount, 0);

  return {
    username: viewer.login,
    name: viewer.name,
    avatarUrl: viewer.avatarUrl,
    bio: viewer.bio,
    company: viewer.company,
    location: viewer.location,
    accountCreated: viewer.createdAt,
    totalRepos: viewer.repositories.totalCount,
    totalCommits: viewer.contributionsCollection.totalCommitContributions,
    totalCommitsInRepos,
    totalPRs: viewer.pullRequests.totalCount,
    totalIssues: viewer.issues.totalCount,
    totalStars,
    totalForks,
    languages: topLanguages,
    streak: currentStreak,
    totalContributions: viewer.contributionsCollection.contributionCalendar.totalContributions,
    contributionCalendar: viewer.contributionsCollection.contributionCalendar
  };
}
