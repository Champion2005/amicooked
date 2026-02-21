/**
 * Skills System for Analysis Agent
 * Pluggable skills that the agent can execute to perform specific analysis tasks
 */

import { callOpenRouter, formatGitHubMetrics } from './openrouter';
import { getAgentInstructions } from '@/config/agent-instructions';

/**
 * Skill: Analyze GitHub Profile
 * Generates comprehensive "Cooked Level" analysis with recommendations
 */
const analyzeProfileSkill = {
  name: 'analyzeProfile',
  description: 'Perform comprehensive GitHub profile analysis with Cooked Level scoring',
  
  async execute({ githubData, userProfile, previousAnalysis = null }) {
    const systemPrompt = getAgentInstructions();

    let prompt = `Analyze this GitHub profile and apply your full scoring formula (Activity 40%, Skill Signals 30%, Growth 15%, Collaboration 15%).

${formatGitHubMetrics(githubData, userProfile)}
`;

    if (previousAnalysis) {
      prompt += `\n## PREVIOUS ANALYSIS (for comparison)
- Previous Cooked Level: ${previousAnalysis.cookedLevel}/10 (${previousAnalysis.levelName})
- Previous Summary: ${previousAnalysis.summary}
- Date: ${previousAnalysis.timestamp || 'Unknown'}
- Prev Recommendations: ${JSON.stringify(previousAnalysis.recommendations)}

Note any improvements or regressions.
`;
    }

    prompt += `
Provide your analysis in this exact JSON format:
{
  "cookedLevel": <number 0-10>,
  "levelName": "<e.g., Toasted, Cooking, etc>",
  "summary": "<1-2 sentences honest assessment>",
  "recommendations": [
    "<specific actionable task 1>",
    "<specific actionable task 2>",
    "<specific actionable task 3>"
  ],
  "projectsInsight": "<1 sentence insight about recommended projects>",
  "languageInsight": "<1 sentence insight about their language stack>",
  "activityInsight": "<1 sentence insight about contribution patterns>"
}`;

    try {
      const response = await callOpenRouter(prompt, systemPrompt);
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result;
      }
      throw new Error('Could not parse analysis response');
    } catch (error) {
      console.error('Error in analyzeProfile skill:', error);
      throw error;
    }
  }
};

/**
 * Skill: Recommend Projects
 * Generates personalized project recommendations based on gaps and goals
 */
const recommendProjectsSkill = {
  name: 'recommendProjects',
  description: 'Generate tailored project recommendations to address skill gaps',
  
  async execute({ githubData, userProfile }) {
    const systemPrompt = `${getAgentInstructions()}

# ADDITIONAL CONTEXT FOR PROJECT RECOMMENDATIONS
Your task is to suggest 3-4 specific project ideas. Each project should:
- Target a clear skill gap or growth area identified from the full metrics below
- Be scoped appropriately (2-8 weeks for completion)
- Use 70% familiar technologies and 30% new ones
- Have clear learning outcomes
- Be portfolio-worthy

Focus on practical, achievable projects that will make the user more hireable.`;

    const prompt = `Generate project recommendations based on this user's complete profile and GitHub metrics:

${formatGitHubMetrics(githubData, userProfile)}

Suggest 3-4 projects that address their specific gaps. Return ONLY valid JSON:
[
  {
    "name": "<project name>",
    "skill1": "<skill/tech 1>",
    "skill2": "<skill/tech 2>",
    "skill3": "<skill/tech 3>",
    "overview": "<2-3 sentences: what is this project and what will they learn>",
    "alignment": "<1-2 sentences: why this fits their goals and interests>",
    "suggestedStack": [
      { "name": "<technology>", "description": "<what it's used for>" }
    ]
  }
]`;

    try {
      const response = await callOpenRouter(prompt, systemPrompt);
      
      // Parse JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (Array.isArray(result)) {
          return result;
        }
      }
      throw new Error('Could not parse project recommendations');
    } catch (error) {
      console.error('Error in recommendProjects skill:', error);
      throw error;
    }
  }
};

/**
 * Skill: Compare Progress
 * Analyzes improvement over time by comparing to previous analysis
 */
const compareProgressSkill = {
  name: 'compareProgress',
  description: 'Compare current profile to previous analysis and identify improvements',
  
  async execute({ githubData, userProfile, previousAnalysis }) {
    if (!previousAnalysis) {
      return {
        error: 'No previous analysis available for comparison',
        suggestion: 'This is your first analysis. Complete some projects and return for a progress check!'
      };
    }

    const systemPrompt = `${getAgentInstructions()}

# PROGRESS COMPARISON MODE
You are comparing the user's current state to their previous analysis. Focus on:
- What improved (be encouraging!)
- What regressed or stagnated (be constructive)
- Whether they followed previous recommendations
- New gaps that emerged
- Adjusted recommendations based on progress`;

    const prompt = `Compare this user's progress:

## PREVIOUS ANALYSIS (${previousAnalysis.timestamp || 'Recent'})
- Cooked Level: ${previousAnalysis.cookedLevel}/10 (${previousAnalysis.levelName})
- Summary: ${previousAnalysis.summary}
- Recommendations Given: ${JSON.stringify(previousAnalysis.recommendations)}

## CURRENT FULL METRICS
${formatGitHubMetrics(githubData, userProfile)}

Provide a progress report in JSON format:
{
  "cookedLevel": <new score 0-10>,
  "levelChange": <"positive" | "negative" | "neutral">,
  "improvements": ["<specific improvement 1>", "<improvement 2>"],
  "regressions": ["<regression 1>"],
  "summary": "<2-3 sentences on overall progress>",
  "nextSteps": ["<updated recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}`;

    try {
      const response = await callOpenRouter(prompt, systemPrompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Could not parse progress comparison');
    } catch (error) {
      console.error('Error in compareProgress skill:', error);
      throw error;
    }
  }
};

/**
 * Skill: Generate Learning Path
 * Creates a structured roadmap for skill development
 */
const generateLearningPathSkill = {
  name: 'generateLearningPath',
  description: 'Create a structured learning roadmap based on user goals and current skills',
  
  async execute({ githubData, userProfile }) {
    const systemPrompt = `${getAgentInstructions()}

# LEARNING PATH GENERATION
Create a structured 3-6 month learning roadmap. Break it into phases:
- Phase 1 (Month 1-2): Foundational skills or immediate gaps
- Phase 2 (Month 3-4): Intermediate projects and depth
- Phase 3 (Month 5-6): Advanced skills and portfolio polish

Each phase should have 2-3 milestones with clear success criteria.`;

    const prompt = `Create a learning roadmap for this user based on their full profile and GitHub metrics:

${formatGitHubMetrics(githubData, userProfile)}

Generate a 3-phase learning path in JSON:
{
  "targetRole": "<role they're working toward>",
  "estimatedTimeframe": "<e.g., 3-6 months>",
  "phases": [
    {
      "phase": 1,
      "duration": "<e.g., 8 weeks>",
      "focus": "<theme of this phase>",
      "milestones": [
        {
          "title": "<milestone name>",
          "skills": ["<skill 1>", "<skill 2>"],
          "deliverable": "<what to build/achieve>",
          "successCriteria": "<how to know it's done>"
        }
      ]
    }
  ],
  "resources": ["<recommended learning resource 1>", "<resource 2>"]
}`;

    try {
      const response = await callOpenRouter(prompt, systemPrompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Could not parse learning path');
    } catch (error) {
      console.error('Error in generateLearningPath skill:', error);
      throw error;
    }
  }
};

/**
 * Skill: Answer Specific Question
 * Provides context-aware answers to user questions about their profile
 */
const answerQuestionSkill = {
  name: 'answerQuestion',
  description: 'Answer specific questions about profile, recommendations, or career advice',
  
  async execute({ question, githubData, userProfile, previousAnalysis }) {
    const systemPrompt = `${getAgentInstructions()}

# QUESTION ANSWERING MODE
Answer the user's specific question using their profile context. Be:
- Concise but complete
- Data-driven (reference their actual metrics)
- Actionable (give next steps if relevant)
- Consistent with any previous analysis or recommendations`;

    let contextInfo = '';
    if (previousAnalysis) {
      contextInfo = `\n## PREVIOUS ANALYSIS\n- Cooked Level: ${previousAnalysis.cookedLevel}/10\n- Key Recommendations: ${JSON.stringify(previousAnalysis.recommendations)}\n`;
    }

    const prompt = `User asks: "${question}"

${formatGitHubMetrics(githubData, userProfile)}
${contextInfo}
Answer their question directly, referencing their actual metrics where relevant.`;

    try {
      const response = await callOpenRouter(prompt, systemPrompt);
      return { answer: response };
    } catch (error) {
      console.error('Error in answerQuestion skill:', error);
      throw error;
    }
  }
};

/**
 * Export all available skills
 */
export const skills = {
  analyzeProfile: analyzeProfileSkill,
  recommendProjects: recommendProjectsSkill,
  compareProgress: compareProgressSkill,
  generateLearningPath: generateLearningPathSkill,
  answerQuestion: answerQuestionSkill
};

/**
 * Get list of available skills with descriptions
 */
export function getAvailableSkills() {
  return Object.values(skills).map(skill => ({
    name: skill.name,
    description: skill.description
  }));
}

/**
 * Execute a skill by name (utility function)
 */
export async function executeSkill(skillName, context) {
  const skill = skills[skillName];
  if (!skill) {
    throw new Error(`Skill '${skillName}' not found`);
  }
  return await skill.execute(context);
}
