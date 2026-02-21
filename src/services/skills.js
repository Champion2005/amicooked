/**
 * Skills System for Analysis Agent
 * Pluggable skills that the agent can execute to perform specific analysis tasks.
 *
 * analyzeProfile and recommendProjects delegate directly to the canonical
 * openrouter.js functions so all scoring, normalisation, and prompt logic
 * lives in exactly one place.
 */

import { callOpenRouter, formatGitHubMetrics, analyzeCookedLevel, RecommendedProjects } from './openrouter';
import { getAgentInstructions } from '@/config/agent-instructions';

/**
 * Skill: Analyze GitHub Profile
 * Delegates to the canonical analyzeCookedLevel which runs normalizeAnalysis.
 */
const analyzeProfileSkill = {
  name: 'analyzeProfile',
  description: 'Perform comprehensive GitHub profile analysis with Cooked Level scoring',

  async execute({ githubData, userProfile }) {
    return await analyzeCookedLevel(githubData, userProfile);
  }
};

/**
 * Skill: Recommend Projects
 * Delegates to the canonical RecommendedProjects function.
 */
const recommendProjectsSkill = {
  name: 'recommendProjects',
  description: 'Generate tailored project recommendations to address skill gaps',

  async execute({ githubData, userProfile }) {
    return await RecommendedProjects(githubData, userProfile);
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
