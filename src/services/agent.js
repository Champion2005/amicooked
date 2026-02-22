/**
 * AI Agent Service with Memory and Skills
 * Orchestrates analysis using comprehensive instructions, conversation memory, and pluggable skills
 */

import { callOpenRouter, formatGitHubMetrics } from './openrouter';
import { getChatInstructions, getAnalysisModeInstructions } from '@/config/agent-instructions';
import { buildProjectSystemPrompt } from './projectChat';
import { getChat, addMessage } from './chat';
import { skills } from './skills';

/**
 * Agent memory structure
 * Stores conversation history and analysis context for consistent responses
 */
class AgentMemory {
  constructor() {
    this.conversationHistory = [];
    this.userContext = null; // GitHubdata, profile, etc.
    this.previousAnalysis = null;
  }

  /**
   * Add a message to conversation history
   */
  addMessage(role, content) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10 messages to avoid token limits
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  /**
   * Set user context (GitHub data, profile, and pre-computed analysis)
   */
  setContext(githubData, userProfile, analysis = null) {
    this.userContext = {
      githubData,
      userProfile,
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Store previous analysis for comparison
   */
  setPreviousAnalysis(analysis) {
    this.previousAnalysis = {
      ...analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get formatted conversation history for AI
   */
  getFormattedHistory() {
    return this.conversationHistory
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * Get formatted context for AI — uses the canonical formatGitHubMetrics for consistency,
   * then appends pre-computed analysis results so the model never needs to re-score.
   */
  getFormattedContext() {
    if (!this.userContext) return '';

    const { githubData, userProfile, analysis } = this.userContext;
    let ctx = formatGitHubMetrics(githubData, userProfile);

    if (analysis) {
      // Build a human-readable explanation of the level so the AI can't confuse the ordering
      const levelOrder = { Burnt: 1, 'Well-Done': 2, Cooked: 3, Toasted: 4, Cooking: 5 };
      const levelDescriptions = {
        Cooking: 'top tier (9-10/10) — highly competitive',
        Toasted: 'above average (7-8/10) — solid with some gaps',
        Cooked: 'below average (5-6/10) — needs focused effort',
        'Well-Done': 'significantly below average (3-4/10) — not yet competitive',
        Burnt: 'near-dormant (1-2/10) — essentially no activity',
      };
      const levelDesc = levelDescriptions[analysis.levelName] || '';
      ctx += `\n\n## CURRENT ANALYSIS RESULTS (pre-computed — do not re-score)`;
      ctx += `\n- Cooked Level: ${analysis.cookedLevel}/10 — Level Name: "${analysis.levelName}" (${levelDesc})`;
      ctx += `\n- Scale reminder: Burnt < Well-Done < Cooked < Toasted < Cooking (higher = better)`;
      ctx += `\n- Summary: ${analysis.summary}`;
      if (analysis.categoryScores) {
        ctx += `\n- Category Scores:`;
        for (const [key, cat] of Object.entries(analysis.categoryScores)) {
          ctx += `\n  - ${key}: ${cat.score}/100 (${cat.weight}% weight) — ${cat.notes}`;
        }
      }
      if (analysis.recommendations?.length) {
        ctx += `\n- Recommendations already given to user:`;
        analysis.recommendations.forEach(r => { ctx += `\n  • ${r}`; });
      }
    }

    return ctx;
  }

  /**
   * Load memory from a Firestore chat
   */
  async loadFromChat(userId, chatId) {
    try {
      const chat = await getChat(userId, chatId);
      if (chat && chat.messages) {
        this.conversationHistory = chat.messages;
        if (chat.context) {
          this.userContext = chat.context;
        }
      }
    } catch (error) {
      console.error('Error loading chat memory:', error);
    }
  }

  /**
   * Clear conversation history but keep context
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get a summary of what the agent "knows"
   */
  getSummary() {
    return {
      messageCount: this.conversationHistory.length,
      hasContext: !!this.userContext,
      hasPreviousAnalysis: !!this.previousAnalysis,
      lastActivity: this.conversationHistory.length > 0 
        ? this.conversationHistory[this.conversationHistory.length - 1].timestamp 
        : null
    };
  }
}

/**
 * AI Agent Class
 * Coordinates memory, skills, and LLM calls for intelligent analysis
 */
export class AnalysisAgent {
  constructor() {
    this.memory = new AgentMemory();
    this.availableSkills = skills;
  }

  /**
   * Initialize agent with user context
   */
  async initialize(githubData, userProfile, analysis = null, chatId = null, userId = null) {
    this.memory.setContext(githubData, userProfile, analysis);

    // Load existing conversation if chatId provided
    if (chatId && userId) {
      await this.memory.loadFromChat(userId, chatId);
    }
  }

  /**
   * Execute a skill and return the result
   */
  async executeSkill(skillName, context) {
    const skill = this.availableSkills[skillName];
    if (!skill) {
      console.warn(`Skill ${skillName} not found`);
      return null;
    }

    try {
      const result = await skill.execute(context);
      return result;
    } catch (error) {
      console.error(`Error executing skill ${skillName}:`, error);
      return null;
    }
  }

  /**
   * Main agent loop: process user message with context and memory.
   * Uses chat instructions (no scoring schema) — the LLM gets a clean
   * conversational prompt with pre-computed analysis already in context.
   */
  async processMessage(userMessage, mode = 'QUICK_CHAT') {
    this.memory.addMessage('user', userMessage);

    // Chat instructions — no scoring schema or JSON format requirements
    const systemPrompt = getChatInstructions() + getAnalysisModeInstructions(mode);

    let prompt = '';

    // Include pre-computed analysis + user context
    if (this.memory.userContext) {
      prompt += this.memory.getFormattedContext() + '\n\n';
    }

    // Include previous analysis for comparison modes
    if (mode === 'PROGRESS_COMPARISON' && this.memory.previousAnalysis) {
      prompt += `# PREVIOUS ANALYSIS\n${JSON.stringify(this.memory.previousAnalysis, null, 2)}\n\n`;
    }

    // Include conversation history for continuity
    if (this.memory.conversationHistory.length > 1) {
      prompt += `# CONVERSATION HISTORY\n${this.memory.getFormattedHistory()}\n\n`;
    }

    prompt += `# USER MESSAGE\n${userMessage}\n\nRespond based on the context above. Be specific to their actual metrics and give actionable advice.`;

    const response = await callOpenRouter(prompt, systemPrompt);
    this.memory.addMessage('assistant', response);

    return {
      response,
      memoryStatus: this.memory.getSummary()
    };
  }

  /**
   * Process a message in the context of a specific project.
   * Uses buildProjectSystemPrompt (which already includes chat instructions +
   * project details + user/GitHub context) and the agent's conversation memory
   * for multi-turn continuity.
   *
   * @param {string} userMessage - The user's message
   * @param {Object} project - The project being discussed
   * @returns {{ response: string, memoryStatus: Object }}
   */
  async processProjectMessage(userMessage, project) {
    this.memory.addMessage('user', userMessage);

    const systemPrompt = buildProjectSystemPrompt(
      project,
      this.memory.userContext?.userProfile,
      this.memory.userContext?.githubData,
      this.memory.userContext?.analysis
    );

    let prompt = '';

    // Include conversation history for continuity
    if (this.memory.conversationHistory.length > 1) {
      prompt += `# CONVERSATION HISTORY\n${this.memory.getFormattedHistory()}\n\n`;
    }

    prompt += `# USER MESSAGE\n${userMessage}\n\nRespond based on the project context above. Be specific and actionable.`;

    const response = await callOpenRouter(prompt, systemPrompt);
    this.memory.addMessage('assistant', response);

    return {
      response,
      memoryStatus: this.memory.getSummary()
    };
  }

  /**
   * Perform full profile analysis (specialized method)
   */
  async analyzeProfile() {
    if (!this.memory.userContext) {
      throw new Error('Agent not initialized with user context');
    }

    const mode = this.memory.previousAnalysis ? 'PROGRESS_CHECK' : 'INITIAL_ASSESSMENT';
    const result = await this.executeSkill('analyzeProfile', {
      githubData: this.memory.userContext.githubData,
      userProfile: this.memory.userContext.userProfile,
      previousAnalysis: this.memory.previousAnalysis
    });

    // Store this analysis for future comparisons
    if (result) {
      this.memory.setPreviousAnalysis(result);
    }

    return result;
  }

  /**
   * Generate project recommendations (specialized method)
   */
  async recommendProjects() {
    if (!this.memory.userContext) {
      throw new Error('Agent not initialized with user context');
    }

    return await this.executeSkill('recommendProjects', {
      githubData: this.memory.userContext.githubData,
      userProfile: this.memory.userContext.userProfile,
      previousAnalysis: this.memory.previousAnalysis
    });
  }

  /**
   * Get agent's memory status for debugging
   */
  getMemoryStatus() {
    return this.memory.getSummary();
  }

  /**
   * Clear conversation history but keep context
   */
  resetConversation() {
    this.memory.clearHistory();
  }
}

/**
 * Factory function to create a new agent instance
 */
export function createAgent() {
  return new AnalysisAgent();
}

/**
 * Convenience function: Analyze profile with agent
 */
export async function analyzeWithAgent(githubData, userProfile, previousAnalysis = null) {
  const agent = createAgent();
  await agent.initialize(githubData, userProfile, null);

  if (previousAnalysis) {
    agent.memory.setPreviousAnalysis(previousAnalysis);
  }

  return await agent.analyzeProfile();
}

/**
 * Convenience function: Get recommendations with agent
 */
export async function recommendWithAgent(githubData, userProfile) {
  const agent = createAgent();
  await agent.initialize(githubData, userProfile, null);
  return await agent.recommendProjects();
}
