# AI Agent System for Consistent Analysis

This directory now includes an **AI Agent system** with memory, skills, and comprehensive instructions for generating consistent, high-quality GitHub profile analysis.

## Key Components

### 1. **Agent Instructions** (`/config/agent-instructions.js`)
A comprehensive instructions file (similar to Copilot instructions but deeper) that defines:
- Detailed scoring rubrics for all Cooked Levels (0-10)
- Context-aware analysis rules (by education, experience, career goal)
- Gap identification patterns and priority matrix
- Recommendation generation framework with templates
- Output requirements and communication style guidelines

This ensures **consistent, accurate analysis** across all users.

### 2. **Agent Service** (`agent.js`)
The main orchestrator that coordinates:
- **Memory system**: Short-term conversation history + long-term persistent memory (Firestore)
- **Skills execution**: Can call different analysis skills as needed
- **Context awareness**: Maintains user profile, GitHub data, and previous analyses
- **Multi-turn conversations**: Handles follow-up questions with consistent context
- **Persistence**: Paid plans (Student+) save agent state to Firestore so it survives across sessions
- **Identity**: Pro+ users can customise agent name, personality, and icon

### 3. **Agent Persistence** (`agentPersistence.js`)
Manages saving/loading agent state to/from Firestore (`users/{uid}/agent/state`):
- Long-term memory (capped at 50 items): insights, chat summaries, goals, action tracking
- Agent identity: custom name, personality preset/custom, icon (base64)
- Memory toggle: users can enable/disable persistent memory
- Plan-gated: memory requires Student+, custom identity requires Pro+

### 4. **Agent Personality** (`/config/agentPersonality.js`)
Preset and custom personality options for Pro+ users:
- 6 presets: Coach, Mentor, Drill Sergeant, Hype Man, Strategist, Friend
- Custom option: user writes their own personality instruction
- Falls back to base prompt tone for non-Pro users

### 5. **Skills System** (`skills.js`)
Pluggable analysis capabilities:
- `analyzeProfile` - Full Cooked Level analysis with recommendations
- `recommendProjects` - Generate personalized project ideas
- `compareProgress` - Track improvements over time
- `generateLearningPath` - Create structured learning roadmaps
- `answerQuestion` - Context-aware Q&A about their profile

### 6. **OpenRouter Integration** (`openrouter.js`)
Updated to use comprehensive instructions for all LLM calls, ensuring consistency.

---

## Usage Examples

### Basic Analysis (Backwards Compatible)
```javascript
import { analyzeCookedLevel, RecommendedProjects } from '@/services/openrouter';

// Still works exactly as before
const analysis = await analyzeCookedLevel(githubData, userProfile);
const projects = await RecommendedProjects(githubData, userProfile);
```

### Using the Agent Directly
```javascript
import { createAgent } from '@/services/agent';

// Create agent instance
const agent = createAgent();

// Initialize with user context
await agent.initialize(githubData, userProfile);

// Perform analysis
const analysis = await agent.analyzeProfile();

// Get project recommendations
const projects = await agent.recommendProjects();
```

### Agent with Memory (Multi-turn Conversation)
```javascript
import { createAgent } from '@/services/agent';

// Create agent
const agent = createAgent();
await agent.initialize(githubData, userProfile);

// First interaction
const result1 = await agent.processMessage(
  "Analyze my GitHub profile",
  "INITIAL_ASSESSMENT"
);
console.log(result1.response);

// Follow-up question (agent remembers context)
const result2 = await agent.processMessage(
  "Which project should I start with?",
  "QUICK_CHAT"
);
console.log(result2.response);

// Check memory status
console.log(agent.getMemoryStatus());
// { messageCount: 4, hasContext: true, hasPreviousAnalysis: true }
```

### Loading Conversation from Firestore
```javascript
import { createAgent } from '@/services/agent';

// Load existing chat history
const agent = createAgent();
await agent.initialize(githubData, userProfile, chatId, userId);

// Agent now has full conversation context
const result = await agent.processMessage("What was my previous score?");
```

### Progress Tracking
```javascript
import { createAgent } from '@/services/agent';

// Create agent
const agent = createAgent();
await agent.initialize(githubData, userProfile);

// Store first analysis
const firstAnalysis = await agent.analyzeProfile();
// ... user works on projects for 2 months ...

// Later: compare progress
agent.memory.setPreviousAnalysis(firstAnalysis);
const progressReport = await agent.executeSkill('compareProgress', {
  githubData: updatedGithubData,
  userProfile,
  previousAnalysis: firstAnalysis
});

console.log(progressReport);
// {
//   cookedLevel: 7,
//   levelChange: "positive",
//   improvements: ["Added 3 new projects", "Increased commit frequency"],
//   summary: "Great progress! Your score improved from 5 to 7...",
//   nextSteps: [...]
// }
```

### Custom Skills
```javascript
import { executeSkill } from '@/services/skills';

// Generate a learning roadmap
const roadmap = await executeSkill('generateLearningPath', {
  githubData,
  userProfile
});

console.log(roadmap);
// {
//   targetRole: "Full-Stack Developer",
//   estimatedTimeframe: "4-6 months",
//   phases: [
//     { phase: 1, duration: "8 weeks", focus: "Backend fundamentals", ... }
//   ]
// }
```

---

## Analysis Modes

The agent supports different analysis modes for different contexts:

- **`INITIAL_ASSESSMENT`** - First-time comprehensive analysis
- **`PROGRESS_CHECK`** - Follow-up analysis comparing to previous
- **`QUICK_CHAT`** - Answer specific follow-up questions
- **`PROJECT_RECOMMENDATION`** - Deep dive into project suggestions

Pass the mode as the second parameter to `processMessage()`:

```javascript
await agent.processMessage(userMessage, "PROGRESS_CHECK");
```

---

## Key Benefits

### ✅ Consistency
All analyses use the same comprehensive instructions file, ensuring quality and accuracy across all users.

### ✅ Memory
The agent remembers conversation history and previous analyses, enabling intelligent follow-up conversations.

### ✅ Modularity
Skills are pluggable - you can easily add new analysis capabilities without changing the core agent.

### ✅ Context-Aware
Adjusts analysis based on user's education, experience, career goals, and interests.

### ✅ Backwards Compatible
Existing code using `analyzeCookedLevel()` and `RecommendedProjects()` still works without changes.

---

## Extending the System

### Adding a New Skill

1. Create skill object in `skills.js`:
```javascript
const myNewSkill = {
  name: 'myNewSkill',
  description: 'What this skill does',
  
  async execute({ githubData, userProfile, previousAnalysis }) {
    // Your skill logic here
    const result = await callOpenRouter(prompt, systemPrompt);
    return result;
  }
};
```

2. Add to exports:
```javascript
export const skills = {
  ...existingSkills,
  myNewSkill: myNewSkill
};
```

3. Use it:
```javascript
const result = await agent.executeSkill('myNewSkill', context);
```

### Updating Instructions

Edit `/config/agent-instructions.js` to refine:
- Scoring criteria
- Recommendation templates
- Analysis rules
- Communication tone

All agent calls will automatically use the updated instructions.

---

## Migration Guide

### Old Code:
```javascript
import { analyzeCookedLevel } from '@/services/openrouter';
const result = await analyzeCookedLevel(githubData, userProfile);
```

### New Code (with memory):
```javascript
import { createAgent } from '@/services/agent';

const agent = createAgent();
await agent.initialize(githubData, userProfile);
const result = await agent.analyzeProfile();

// Now you can also do follow-ups:
const followUp = await agent.processMessage("Tell me more about the first recommendation");
```

**No breaking changes** - old code continues to work, but new code gets memory and skills!

---

## Architecture Diagram

```
User Request
     ↓
┌────────────────────────────────────┐
│      Agent (agent.js)              │
│  - Manages memory & context        │
│  - Detects required skills         │
│  - Orchestrates LLM calls          │
└────────────┬───────────────────────┘
             ↓
     ┌───────┴───────┐
     ↓               ↓
┌─────────┐    ┌──────────────┐
│ Skills  │    │ Instructions │
│ System  │    │ (Deep Rules) │
└─────────┘    └──────────────┘
     ↓               ↓
     └───────┬───────┘
             ↓
     ┌──────────────┐
     │  OpenRouter  │
     │  (LLM API)   │
     └──────────────┘
             ↓
       AI Response
```

---

## Testing the System

```javascript
import { createAgent } from '@/services/agent';

// Test basic analysis
const agent = createAgent();
await agent.initialize(mockGithubData, mockUserProfile);

const analysis = await agent.analyzeProfile();
console.assert(analysis.cookedLevel >= 0 && analysis.cookedLevel <= 10);
console.assert(analysis.recommendations.length >= 3);

// Test memory
await agent.processMessage("What's my score?");
const status = agent.getMemoryStatus();
console.assert(status.messageCount > 0);
console.assert(status.hasContext === true);
```

---

## Questions?

Check the inline documentation in:
- `/config/agent-instructions.js` - Full analysis framework
- `agent.js` - Agent API and methods
- `skills.js` - Available skills and how to add more
