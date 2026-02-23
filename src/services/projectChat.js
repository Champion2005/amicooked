/**
 * Shared project chat utilities
 * Builds the system prompt used by SavedProjectsOverlay
 * when chatting about a specific project.
 */

import { getChatInstructionsForPlan, getAnalysisModeInstructions } from '@/config/agent-instructions';
import { formatGitHubMetricsForPlan } from '@/services/openrouter';

/**
 * Build a system prompt for project-specific AI chat.
 * Uses the full agent instructions as a foundation, then appends
 * project and user context so the model stays consistent with
 * the rest of the platform.
 *
 * @param {Object} project - The project being discussed
 * @param {Object} [userProfile] - Optional user profile data
 * @param {Object} [githubData] - Optional GitHub metrics
 * @param {Object} [analysis] - Optional pre-computed analysis (cooked level, scores, etc.)
 * @param {string} [planId='free'] - User's plan ID; controls which metrics are exposed to the AI
 * @returns {string}
 */
export function buildProjectSystemPrompt(project, userProfile, githubData, analysis, planId = 'free') {
  if (!project) return '';

  const parts = [
    getChatInstructionsForPlan(planId),
    getAnalysisModeInstructions('PROJECT_CHAT'),
    '',
    '# PROJECT CONTEXT',
    `## Project Details`,
    `- Name: ${project.name}`,
    `- Overview: ${project.overview || 'N/A'}`,
    `- Skills: ${project.skill1}, ${project.skill2}, ${project.skill3}`,
    `- Alignment: ${project.alignment || 'N/A'}`,
  ];

  if (project.suggestedStack?.length) {
    parts.push(`- Stack: ${project.suggestedStack.map(s => `${s.name} (${s.description})`).join(', ')}`);
  }

  // Use plan-aware metrics formatter — free users only see summary data
  if (githubData && userProfile) {
    parts.push('', formatGitHubMetricsForPlan(githubData, userProfile, planId));
  }

  // Include pre-computed analysis so the AI knows the user's cooked level
  if (analysis) {
    parts.push('', '## CURRENT ANALYSIS (pre-computed — do not re-score)');
    parts.push(`- Cooked Level: ${analysis.cookedLevel}/10 (${analysis.levelName})`);
    parts.push(`- Scale: Burnt < Well-Done < Cooked < Toasted < Cooking (higher = better)`);
    if (analysis.summary) parts.push(`- Summary: ${analysis.summary}`);
    if (analysis.categoryScores) {
      for (const [key, cat] of Object.entries(analysis.categoryScores)) {
        parts.push(`- ${key}: ${cat.score}/100`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Format recent conversation history into a contextual prompt.
 * Used by SavedProjectsOverlay to avoid duplication.
 *
 * @param {Array} messages - Array of { role, content } message objects
 * @param {string} latestMessage - The user's latest message
 * @param {number} [limit=6] - Max recent messages to include as context
 * @returns {string} Contextual prompt with history prepended
 */
export function formatConversationContext(messages, latestMessage, limit = 6) {
  if (!messages || messages.length === 0) return latestMessage;

  const recent = messages
    .slice(-limit)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  return `Previous conversation:\n${recent}\n\nUser's latest message: ${latestMessage}`;
}
