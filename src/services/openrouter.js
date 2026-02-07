// OpenRouter API configuration
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
  console.error('Missing VITE_OPENROUTER_API_KEY environment variable');
}

/**
 * Call OpenRouter API with auto model selection
 * @param {string} prompt - The prompt to send to the AI
 * @param {string} systemPrompt - Optional system prompt for context
 * @returns {Promise<string>} - AI response text
 */
export async function callOpenRouter(prompt, systemPrompt = '') {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'amicooked'
      },
      body: JSON.stringify({
        model: 'openrouter/free', // Auto-select model based on prompt
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw error;
  }
}

/**
 * Generate "Cooked Level" and recommendations based on GitHub data
 * @param {Object} githubData - User's GitHub metrics
 * @param {string} userContext - User's education/career stage
 * @returns {Promise<Object>} - { cookedLevel, summary, recommendations }
 */
export async function analyzeCookedLevel(githubData, userContext) {
  const systemPrompt = `You are an expert technical recruiter analyzing GitHub profiles to determine employability. 
Your job is to be brutally honest and provide actionable feedback. The "Cooked Level" scale is:
- Low Score (0-2): "Cooking" / Ahead of the curve
- 3-4: "Cooked Rare" / Slightly behind
- 5-6: "Cooked Medium Rare" / Concerning gaps
- 7-8: "Cooked Medium Well" / Significant issues
- 9-10: "Cooked Well Done" / Unemployable without major changes`;

  const prompt = `Analyze this GitHub profile for a ${userContext}:

**Metrics:**
- Total Repositories: ${githubData.totalRepos}
- Total Commits (last year): ${githubData.totalCommits}
- Pull Requests: ${githubData.totalPRs}
- Code Reviews: ${githubData.totalReviews || 0}
- Stars Received: ${githubData.totalStars}
- Forks: ${githubData.totalForks}
- Top Languages: ${githubData.languages?.join(', ') || 'Unknown'}
- Contribution Streak: ${githubData.streak || 0} days
- Has README profiles: ${githubData.hasReadme ? 'Yes' : 'No'}

Provide your response in this exact JSON format:
{
  "cookedLevel": <number 0-10>,
  "levelName": "<e.g., Cooked Medium Rare>",
  "summary": "<2-3 sentence honest assessment>",
  "recommendations": [
    "<specific actionable task 1>",
    "<specific actionable task 2>",
    "<specific actionable task 3>"
  ]
}`;

  try {
    const response = await callOpenRouter(prompt, systemPrompt);
    // Parse JSON from response (handle potential markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse AI response');
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}
