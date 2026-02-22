/**
 * Skills System for Analysis Agent
 * Pluggable skills that the agent can execute to perform specific analysis tasks.
 *
 * analyzeProfile and recommendProjects delegate directly to the canonical
 * openrouter.js functions so all scoring, normalisation, and prompt logic
 * lives in exactly one place.
 */

import { callOpenRouter, formatGitHubMetrics, analyzeCookedLevel, getRecommendedProjects } from './openrouter';
import { getChatInstructions, getAnalysisModeInstructions } from '@/config/agent-instructions';

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
    return await getRecommendedProjects(githubData, userProfile);
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

    const systemPrompt = getChatInstructions() + getAnalysisModeInstructions('PROGRESS_COMPARISON');

    const prompt = `Compare this user's current metrics to their previous analysis.

## PREVIOUS (${previousAnalysis.timestamp || 'Unknown date'})
- Level: ${previousAnalysis.cookedLevel}/10 (${previousAnalysis.levelName})
- Summary: ${previousAnalysis.summary}
- Recommendations: ${JSON.stringify(previousAnalysis.recommendations)}

## CURRENT
${formatGitHubMetrics(githubData, userProfile)}

Return JSON:
{
  "cookedLevel": <0-10>,
  "levelChange": <"positive" | "negative" | "neutral">,
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "regressions": ["<regression 1>"],
  "summary": "<2-3 sentences on progress>",
  "nextSteps": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
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
    const systemPrompt = getChatInstructions() + getAnalysisModeInstructions('LEARNING_PATH');

    const prompt = `Create a personalized learning roadmap for this user.

${formatGitHubMetrics(githubData, userProfile)}

Return JSON:
{
  "targetRole": "<role they're working toward>",
  "estimatedTimeframe": "<e.g., 3-6 months>",
  "phases": [
    {
      "phase": 1,
      "duration": "<e.g., 8 weeks>",
      "focus": "<phase theme>",
      "milestones": [
        {
          "title": "<milestone>",
          "skills": ["<skill 1>", "<skill 2>"],
          "deliverable": "<what to build>",
          "successCriteria": "<how to know it's done>"
        }
      ]
    }
  ],
  "resources": ["<resource 1>", "<resource 2>"]
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
 * Export all available skills
 */
export const skills = {
  analyzeProfile: analyzeProfileSkill,
  recommendProjects: recommendProjectsSkill,
  compareProgress: compareProgressSkill,
  generateLearningPath: generateLearningPathSkill,
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
