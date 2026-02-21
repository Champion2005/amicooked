/**
 * AI Agent Service with Memory and Skills
 * Orchestrates analysis using comprehensive instructions, conversation memory, and pluggable skills
 */

import { callOpenRouter, formatGitHubMetrics } from './openrouter';
import { getAgentInstructions, getAnalysisModeInstructions } from '@/config/agent-instructions';
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
      ctx += `\n\n## CURRENT ANALYSIS RESULTS (pre-computed — do not re-score)`;
      ctx += `\n- Cooked Level: ${analysis.cookedLevel}/10 (${analysis.levelName})`;
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
   * Detect if user message requires skill execution
   * Returns array of skill names to execute
   */
  detectRequiredSkills(userMessage) {
    const message = userMessage.toLowerCase();
    const requiredSkills = [];

    // Simple keyword-based skill detection
    // In production, you might use the LLM to determine this
    if (message.includes('analyze') || message.includes('assessment') || message.includes('cooked level')) {
      requiredSkills.push('analyzeProfile');
    }
    
    if (message.includes('project') || message.includes('recommend')) {
      requiredSkills.push('recommendProjects');
    }
    
    if (message.includes('compare') || message.includes('progress')) {
      requiredSkills.push('compareProgress');
    }

    if (message.includes('learning path') || message.includes('roadmap')) {
      requiredSkills.push('generateLearningPath');
    }

    return requiredSkills;
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
      console.log(`Executing skill: ${skillName}`);
      const result = await skill.execute(context);
      return result;
    } catch (error) {
      console.error(`Error executing skill ${skillName}:`, error);
      return null;
    }
  }

  /**
   * Main agent loop: process user message with memory and skills
   */
  async processMessage(userMessage, mode = 'QUICK_CHAT') {
    // Add user message to memory
    this.memory.addMessage('user', userMessage);

    // Detect required skills
    const requiredSkills = this.detectRequiredSkills(userMessage);

    // Execute skills and collect results
    const skillResults = [];
    if (requiredSkills.length > 0) {
      const context = {
        githubData: this.memory.userContext?.githubData,
        userProfile: this.memory.userContext?.userProfile,
        previousAnalysis: this.memory.previousAnalysis
      };

      for (const skillName of requiredSkills) {
        const result = await this.executeSkill(skillName, context);
        if (result) {
          skillResults.push({
            skill: skillName,
            result
          });
        }
      }
    }

    // Build comprehensive prompt with instructions, memory, and skill results
    const systemPrompt = getAgentInstructions() + getAnalysisModeInstructions(mode);
    
    let prompt = '';
    
    // Add context if available
    if (this.memory.userContext) {
      prompt += this.memory.getFormattedContext() + '\n\n';
    }

    // Add previous analysis if in progress check mode
    if (mode === 'PROGRESS_CHECK' && this.memory.previousAnalysis) {
      prompt += `# PREVIOUS ANALYSIS\n${JSON.stringify(this.memory.previousAnalysis, null, 2)}\n\n`;
    }

    // Add conversation history
    if (this.memory.conversationHistory.length > 1) {
      prompt += `# CONVERSATION HISTORY\n${this.memory.getFormattedHistory()}\n\n`;
    }

    // Add skill results if any
    if (skillResults.length > 0) {
      prompt += '# SKILL EXECUTION RESULTS\n';
      skillResults.forEach(({ skill, result }) => {
        prompt += `## ${skill}\n${JSON.stringify(result, null, 2)}\n\n`;
      });
    }

    // Add current user message
    prompt += `# CURRENT USER MESSAGE\n${userMessage}\n\n`;
    prompt += 'Respond conversationally using the context and conversation history above. Reference the pre-computed Cooked Level and category scores — do not re-score the user. Be helpful, specific to their actual metrics, and give actionable advice.';

    // Call LLM
    const response = await callOpenRouter(prompt, systemPrompt);

    // Add assistant response to memory
    this.memory.addMessage('assistant', response);

    return {
      response,
      skillsUsed: requiredSkills,
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
