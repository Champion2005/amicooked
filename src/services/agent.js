/**
 * AI Agent Service with Memory and Skills
 * Orchestrates analysis using comprehensive instructions, conversation memory, and pluggable skills
 */

import { callOpenRouter, formatGitHubMetricsForPlan, DEFAULT_MODEL } from './openrouter';
import { getChatInstructionsForPlan, getAnalysisModeInstructions } from '@/config/agent-instructions';
import { buildProjectSystemPrompt } from './projectChat';
import { getChat, addMessage } from './chat';
import { skills } from './skills';
import { loadAgentState, saveAgentState, addMemoryItem, MEMORY_TYPES } from './agentPersistence';
import { getPersonalityInstruction, CUSTOM_PERSONALITY_ID } from '@/config/agentPersonality';
import { hasAgentMemory, hasCustomAgent } from '@/config/plans';

/**
 * Agent memory structure
 * Stores conversation history and analysis context for consistent responses
 */
class AgentMemory {
  constructor() {
    this.conversationHistory = [];
    this.userContext = null; // GitHub data, profile, etc.
    this.previousAnalysis = null;
    /** @type {Array} Long-term memory items loaded from Firestore */
    this.longTermMemory = [];
    /** Whether persistent memory is enabled (paid plans only) */
    this.memoryEnabled = true;
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
   * @param {string} [planId='free'] - The user's plan ID for data-access gating
   */
  /**
   * @param {string} [roastIntensityInstruction=''] - Tone directive from getRoastInstruction()
   * @param {string} [nickname=''] - User's chosen nickname for personalized addressing
   */
  setContext(githubData, userProfile, analysis = null, planId = 'free', roastIntensityInstruction = '', nickname = '') {
    this.userContext = {
      githubData,
      userProfile,
      analysis,
      planId: planId || 'free',
      roastIntensityInstruction: roastIntensityInstruction || '',
      nickname: nickname || '',
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
   * Load long-term memory from a persisted state object.
   * @param {Object} savedState - The state loaded from Firestore
   */
  loadPersistentState(savedState) {
    if (!savedState) return;
    this.longTermMemory = savedState.memory || [];
    this.memoryEnabled = savedState.memoryEnabled !== false;
  }

  /**
   * Get formatted long-term memory for the AI prompt.
   * Returns empty string when memory is disabled or empty.
   */
  getFormattedLongTermMemory() {
    if (!this.memoryEnabled || this.longTermMemory.length === 0) return '';

    const sections = {
      insight: [],
      summary: [],
      goal: [],
      action: [],
      preference: [],
      skill: [],
      feedback: [],
      milestone: [],
      context: [],
    };

    for (const item of this.longTermMemory) {
      const bucket = sections[item.type];
      if (bucket) bucket.push(item.content);
    }

    let out = '\n\n## AGENT LONG-TERM MEMORY (from previous sessions)';
    if (sections.goal.length) out += '\n### User Goals\n' + sections.goal.map(g => `- ${g}`).join('\n');
    if (sections.insight.length) out += '\n### User Insights\n' + sections.insight.map(i => `- ${i}`).join('\n');
    if (sections.action.length) out += '\n### Tracked Actions\n' + sections.action.map(a => `- ${a}`).join('\n');
    if (sections.summary.length) out += '\n### Past Session Summaries\n' + sections.summary.map(s => `- ${s}`).join('\n');
    if (sections.preference.length) out += '\n### User Preferences\n' + sections.preference.map(p => `- ${p}`).join('\n');
    if (sections.skill.length) out += '\n### Known Skills\n' + sections.skill.map(s => `- ${s}`).join('\n');
    if (sections.feedback.length) out += '\n### User Feedback\n' + sections.feedback.map(f => `- ${f}`).join('\n');
    if (sections.milestone.length) out += '\n### Milestones & Progress\n' + sections.milestone.map(m => `- ${m}`).join('\n');
    if (sections.context.length) out += '\n### Background Context\n' + sections.context.map(c => `- ${c}`).join('\n');
    out += '\n\nUse this knowledge to provide continuity. Reference past goals, preferences, skills, milestones, and tracked progress when relevant.';
    return out;
  }

  /**
   * Get formatted context for AI — uses the canonical formatGitHubMetrics for consistency,
   * then appends pre-computed analysis results so the model never needs to re-score.
   */
  getFormattedContext() {
    if (!this.userContext) return '';

    const { githubData, userProfile, analysis } = this.userContext;
    let ctx = formatGitHubMetricsForPlan(githubData, userProfile, this.userContext.planId || 'free');

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
   * Load memory from a Firestore chat.
   * Preserves the planId that was set during initialize() so historical
   * chats stored before planId tracking never inadvertently escalate access.
   */
  async loadFromChat(userId, chatId) {
    // Capture planId before any context overwrite
    const existingPlanId = this.userContext?.planId || 'free';
    try {
      const chat = await getChat(userId, chatId);
      if (chat && chat.messages) {
        this.conversationHistory = chat.messages;
        if (chat.context) {
          // Merge planId so older stored contexts (which lack it) still enforce gating
          this.userContext = { ...chat.context, planId: existingPlanId };
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
    /** @type {string|null} Firebase UID of the agent's owner */
    this._uid = null;
    /** @type {string} Plan ID used for feature gating */
    this._planId = 'free';
    /** @type {Object|null} Persisted agent identity (Pro+) */
    this.identity = null;
  }

  /**
   * Initialize agent with user context.
   * If a persisted state exists in Firestore (paid plans), it is loaded
   * so memory and identity carry over between sessions.
   *
   * @param {Object}  githubData
   * @param {Object}  userProfile
   * @param {Object}  [analysis]
   * @param {string}  [chatId]
   * @param {string}  [userId]
   * @param {string}  [planId='free']
   * @param {string}  [roastIntensityInstruction='']
   * @param {string}  [nickname=''] - User's chosen nickname for personalized addressing
   */
  async initialize(githubData, userProfile, analysis = null, chatId = null, userId = null, planId = 'free', roastIntensityInstruction = '', nickname = '') {
    this._uid = userId;
    this._planId = planId;
    this.memory.setContext(githubData, userProfile, analysis, planId, roastIntensityInstruction, nickname);

    // Load persisted state for paid users
    if (userId && hasAgentMemory(planId)) {
      const saved = await loadAgentState(userId, planId);
      if (saved) {
        this.memory.loadPersistentState(saved);
        if (saved.identity && hasCustomAgent(planId)) {
          this.identity = saved.identity;
        }
      }
    }

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
   * @param {string} userMessage - The user's message
   * @param {string} mode - The processing mode (QUICK_CHAT, etc.)
   * @param {Function} onChunk - Optional callback for streaming chunks: (text) => void
   * @param {string} model - Optional model override (from plan config)
   */
  async processMessage(userMessage, mode = 'QUICK_CHAT', onChunk = null, model = DEFAULT_MODEL) {
    // Sanitize input: trim whitespace and enforce a max length to limit prompt injection surface
    const MAX_MSG_LENGTH = 2000;
    const sanitized = (typeof userMessage === 'string' ? userMessage : String(userMessage))
      .trim()
      .slice(0, MAX_MSG_LENGTH);

    this.memory.addMessage('user', sanitized);

    // Use plan-restricted chat instructions for free users, plus optional roast tone override
    const planId = this.memory.userContext?.planId || 'free';
    const intensityInstruction = this.memory.userContext?.roastIntensityInstruction || '';
    // Build personality instruction from identity (Pro+) or fall back to roast intensity
    let personalityInstruction = intensityInstruction;
    if (this.identity && hasCustomAgent(this._planId)) {
      const presetInst = getPersonalityInstruction(this.identity.personality);
      if (this.identity.personality === CUSTOM_PERSONALITY_ID && this.identity.customPersonality) {
        personalityInstruction = this.identity.customPersonality;
      } else if (presetInst) {
        personalityInstruction = presetInst;
      }
    }

    let systemPrompt = getChatInstructionsForPlan(planId, personalityInstruction) + getAnalysisModeInstructions(mode);

    // Inject nickname so the AI addresses the user personally
    const nickname = this.memory.userContext?.nickname;
    if (nickname) {
      systemPrompt += `\n\n# USER NICKNAME\nThe user\'s chosen nickname is "${nickname}". Address them by this name naturally in conversation.`;
    }

    let prompt = '';

    // Include pre-computed analysis + user context
    if (this.memory.userContext) {
      prompt += this.memory.getFormattedContext() + '\n\n';
    }

    // Include long-term memory for continuity (paid plans)
    const ltmBlock = this.memory.getFormattedLongTermMemory();
    if (ltmBlock) {
      prompt += ltmBlock + '\n\n';
    }

    // Include previous analysis for comparison modes
    if (mode === 'PROGRESS_COMPARISON' && this.memory.previousAnalysis) {
      prompt += `# PREVIOUS ANALYSIS\n${JSON.stringify(this.memory.previousAnalysis, null, 2)}\n\n`;
    }

    // Include conversation history for continuity
    if (this.memory.conversationHistory.length > 1) {
      prompt += `# CONVERSATION HISTORY\n${this.memory.getFormattedHistory()}\n\n`;
    }

    prompt += `# USER MESSAGE\n${sanitized}\n\nRespond based on the context above. Be specific to their actual metrics and give actionable advice.`;

    const response = await callOpenRouter(prompt, systemPrompt, onChunk, model);
    this.memory.addMessage('assistant', response);

    // Persist agent state after each exchange (paid plans)
    await this._persistState();

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
   * @param {Function} onChunk - Optional callback for streaming chunks: (text) => void
   * @param {string} model - Optional model override (from plan config)
   * @returns {{ response: string, memoryStatus: Object }}
   */
  async processProjectMessage(userMessage, project, onChunk = null, model = DEFAULT_MODEL) {
    // Sanitize input: trim whitespace and enforce a max length to limit prompt injection surface
    const MAX_MSG_LENGTH = 2000;
    const sanitized = (typeof userMessage === 'string' ? userMessage : String(userMessage))
      .trim()
      .slice(0, MAX_MSG_LENGTH);

    this.memory.addMessage('user', sanitized);

    const planId = this.memory.userContext?.planId || 'free';
    const systemPrompt = buildProjectSystemPrompt(
      project,
      this.memory.userContext?.userProfile,
      this.memory.userContext?.githubData,
      this.memory.userContext?.analysis,
      planId
    );

    let prompt = '';

    // Include conversation history for continuity
    if (this.memory.conversationHistory.length > 1) {
      prompt += `# CONVERSATION HISTORY\n${this.memory.getFormattedHistory()}\n\n`;
    }

    prompt += `# USER MESSAGE\n${sanitized}\n\nRespond based on the project context above. Be specific and actionable.`;

    const response = await callOpenRouter(prompt, systemPrompt, onChunk, model);
    this.memory.addMessage('assistant', response);

    // Persist agent state after each exchange (paid plans)
    await this._persistState();

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

  /**
   * Add an item to long-term memory and persist.
   * @param {{ type: string, content: string, meta?: Object }} item
   */
  async addMemory(item) {
    if (!this._uid || !hasAgentMemory(this._planId)) return;
    this.memory.longTermMemory = await addMemoryItem(this._uid, this._planId, item);
  }

  /**
   * Called at session boundaries (popup close, new chat, chat switch).
   * Fires-and-forgets an LLM extraction of goals/insights/summary from
   * the current conversation history into long-term Firestore memory.
   * Safe to call multiple times — no-ops when conditions aren't met.
   */
  endSession() {
    this._extractAndStoreMemory().catch(() => {});
  }

  /**
   * Use the LLM to extract structured memory items from the current
   * conversation history and persist them to Firestore.
   * Only runs for paid users with memory enabled and ≥4 messages.
   * @private
   */
  async _extractAndStoreMemory() {
    if (!this._uid || !hasAgentMemory(this._planId)) return;
    if (!this.memory.memoryEnabled) return;
    if (this.memory.conversationHistory.length < 1) return; // need at least 1 message

    const history = this.memory.getFormattedHistory();
    const systemPrompt = `You are a memory extraction system. Analyze this conversation between a user and their AI advisor about their GitHub developer profile.

Return ONLY valid JSON with this exact shape (use empty arrays if nothing relevant was found):
{
  "goals": ["<concise user-stated career or learning goal, max 150 chars>"],
  "insights": ["<key observation about the user's skills, habits, projects, or situation, max 150 chars>"],
  "summary": "<1-2 sentence summary of what was discussed and any conclusions>"
}

Only extract what the user clearly stated or strongly implied. Omit generic advice and obvious items. Be specific and concise.
Even for short conversations, extract any useful information. If the conversation is too brief to extract meaningful memory, return empty arrays and an empty summary.`;

    const prompt = `Extract structured memory from this conversation:\n\n${history}`;

    try {
      const response = await callOpenRouter(prompt, systemPrompt, null, DEFAULT_MODEL);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      const extracted = JSON.parse(jsonMatch[0]);

      const items = [];
      for (const goal of (extracted.goals || [])) {
        if (goal?.trim()) items.push({ type: MEMORY_TYPES.GOAL, content: goal.trim() });
      }
      for (const insight of (extracted.insights || [])) {
        if (insight?.trim()) items.push({ type: MEMORY_TYPES.INSIGHT, content: insight.trim() });
      }
      if (extracted.summary?.trim()) {
        items.push({ type: MEMORY_TYPES.SUMMARY, content: extracted.summary.trim() });
      }

      for (const item of items) {
        await this.addMemory(item);
      }
    } catch (err) {
      // Memory extraction is non-fatal — log a warning only
      console.warn('Session memory extraction skipped:', err.message);
    }
  }

  /**
   * Get the display name for this agent.
   * Falls back to 'AI Agent' for free/Student plans or uncustomised agents.
   */
  getDisplayName() {
    if (this.identity?.name && hasCustomAgent(this._planId)) {
      return this.identity.name;
    }
    return 'AI Agent';
  }

  /**
   * Get the agent icon URL/data URI. Returns null if no custom icon.
   */
  getIcon() {
    if (this.identity?.icon && hasCustomAgent(this._planId)) {
      return this.identity.icon;
    }
    return null;
  }

  /**
   * Save the current agent state to Firestore (no-op for free users).
   * @private
   */
  async _persistState() {
    if (!this._uid || !hasAgentMemory(this._planId)) return;
    try {
      await saveAgentState(this._uid, this._planId, {
        memory: this.memory.longTermMemory,
        memoryEnabled: this.memory.memoryEnabled,
        identity: this.identity,
      });
    } catch (err) {
      console.warn('Agent state save skipped:', err.message);
    }
  }
}

/**
 * Factory function to create a new agent instance.
 */
export function createAgent() {
  return new AnalysisAgent();
}

/**
 * Extract insights and goals from a completed analysis and store them in
 * the agent's long-term Firestore memory.
 *
 * Standalone — does not require an active agent instance.
 * Fire-and-forget from Results.jsx after a new analysis completes.
 *
 * @param {string} uid
 * @param {string} planId
 * @param {Object} analysis
 * @param {Object} [userProfile]
 * @returns {Promise<void>}
 */
export async function learnFromAnalysis(uid, planId, analysis, userProfile) {
  if (!uid || !analysis) return;
  // addMemoryItem internally gates on plan — safe to call for all plans
  try {
    const { cookedLevel, levelName, summary, recommendations } = analysis;

    // Core score/summary insight
    await addMemoryItem(uid, planId, {
      type: MEMORY_TYPES.INSIGHT,
      content: `Latest analysis: ${cookedLevel}/10 (${levelName}). ${summary}`.slice(0, 500),
      meta: { source: 'analysis', cookedLevel, levelName },
    });

    // Top recommendations stored as actionable items
    for (const rec of (recommendations || []).slice(0, 3)) {
      await addMemoryItem(uid, planId, {
        type: MEMORY_TYPES.ACTION,
        content: String(rec).slice(0, 500),
        meta: { source: 'analysis-recommendation' },
      });
    }

    // Career goal from profile
    if (userProfile?.careerGoal) {
      await addMemoryItem(uid, planId, {
        type: MEMORY_TYPES.GOAL,
        content: `Career goal: ${userProfile.careerGoal}`.slice(0, 500),
        meta: { source: 'profile' },
      });
    }

    // Role identity from profile
    if (userProfile?.currentRole) {
      await addMemoryItem(uid, planId, {
        type: MEMORY_TYPES.INSIGHT,
        content: `User identifies as: ${userProfile.currentRole}`.slice(0, 500),
        meta: { source: 'profile' },
      });
    }
  } catch (err) {
    console.warn('learnFromAnalysis skipped:', err.message);
  }
}
