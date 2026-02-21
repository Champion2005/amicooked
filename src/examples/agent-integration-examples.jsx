/**
 * Example: Integrating the Agent System into Results Page or Dashboard
 * 
 * This shows how to upgrade your existing Results/Dashboard pages to use
 * the new agent system for conversational, memory-enabled interactions.
 */

import { useState, useEffect } from 'react';
import { createAgent } from '@/services/agent';

/**
 * Example Hook: useAnalysisAgent
 * Manages an agent instance with memory for a user session
 */
function useAnalysisAgent(githubData, userProfile, userId) {
  const [agent, setAgent] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize agent when data is available
  useEffect(() => {
    async function initAgent() {
      if (!githubData || !userProfile) return;

      const newAgent = createAgent();
      await newAgent.initialize(githubData, userProfile);
      setAgent(newAgent);
      setIsInitialized(true);
    }

    initAgent();
  }, [githubData, userProfile]);

  // Method to send a message to the agent
  const sendMessage = async (message, mode = 'QUICK_CHAT') => {
    if (!agent || !isInitialized) {
      throw new Error('Agent not initialized');
    }

    setLoading(true);
    try {
      const result = await agent.processMessage(message, mode);
      return result;
    } finally {
      setLoading(false);
    }
  };

  // Method to perform analysis
  const performAnalysis = async () => {
    if (!agent || !isInitialized) {
      throw new Error('Agent not initialized');
    }

    setLoading(true);
    try {
      const analysis = await agent.analyzeProfile();
      return analysis;
    } finally {
      setLoading(false);
    }
  };

  // Method to get project recommendations
  const getRecommendations = async () => {
    if (!agent || !isInitialized) {
      throw new Error('Agent not initialized');
    }

    setLoading(true);
    try {
      const projects = await agent.recommendProjects();
      return projects;
    } finally {
      setLoading(false);
    }
  };

  return {
    agent,
    isInitialized,
    loading,
    sendMessage,
    performAnalysis,
    getRecommendations
  };
}

/**
 * Example Component: Enhanced Results Page with Agent
 */
function ResultsPageWithAgent({ githubData, userProfile, userId }) {
  const { 
    agent, 
    isInitialized, 
    loading, 
    sendMessage, 
    performAnalysis 
  } = useAnalysisAgent(githubData, userProfile, userId);

  const [analysis, setAnalysis] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  // Perform initial analysis when agent is ready
  useEffect(() => {
    if (isInitialized && !analysis) {
      performAnalysis().then(result => {
        setAnalysis(result);
        // Add initial analysis to chat
        setChatMessages([{
          role: 'assistant',
          content: `Your Cooked Level is ${result.cookedLevel}/10 (${result.levelName}). ${result.summary}`
        }]);
      });
    }
  }, [isInitialized]);

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    // Add user message to chat
    const userMsg = { role: 'user', content: inputMessage };
    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');

    // Get agent response
    const result = await sendMessage(inputMessage);
    
    // Add response to chat
    const assistantMsg = { role: 'assistant', content: result.response };
    setChatMessages(prev => [...prev, assistantMsg]);
  };

  return (
    <div className="results-page">
      {/* Analysis Results Display */}
      {analysis && (
        <div className="analysis-section">
          <h2>Your Cooked Level: {analysis.cookedLevel}/10</h2>
          <p className="level-name">{analysis.levelName}</p>
          <p className="summary">{analysis.summary}</p>
          
          <div className="recommendations">
            <h3>Recommendations</h3>
            <ul>
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="insights">
            <p><strong>Projects:</strong> {analysis.projectsInsight}</p>
            <p><strong>Languages:</strong> {analysis.languageInsight}</p>
            <p><strong>Activity:</strong> {analysis.activityInsight}</p>
          </div>
        </div>
      )}

      {/* Chat Interface with Memory */}
      <div className="chat-section">
        <h3>Ask me anything about your analysis</h3>
        
        <div className="chat-messages">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
            </div>
          ))}
          {loading && <div className="message assistant">Thinking...</div>}
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-form">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about your score, recommendations, or next steps..."
            disabled={loading || !isInitialized}
          />
          <button type="submit" disabled={loading || !isInitialized}>
            Send
          </button>
        </form>

        {/* Example quick questions */}
        <div className="quick-questions">
          <button onClick={() => setInputMessage("Which project should I start with?")}>
            Which project first?
          </button>
          <button onClick={() => setInputMessage("How can I improve my score?")}>
            How to improve?
          </button>
          <button onClick={() => setInputMessage("What are my biggest gaps?")}>
            Biggest gaps?
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Example: Progress Tracking Component
 */
function ProgressTracker({ userId, githubData, userProfile }) {
  const [previousAnalysis, setPreviousAnalysis] = useState(null);
  const [progressReport, setProgressReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load previous analysis from localStorage or Firestore
  useEffect(() => {
    const stored = localStorage.getItem(`analysis_${userId}`);
    if (stored) {
      setPreviousAnalysis(JSON.parse(stored));
    }
  }, [userId]);

  const checkProgress = async () => {
    if (!previousAnalysis) {
      alert('No previous analysis found. Complete your first analysis!');
      return;
    }

    setLoading(true);
    try {
      const agent = createAgent();
      await agent.initialize(githubData, userProfile);
      agent.memory.setPreviousAnalysis(previousAnalysis);

      const report = await agent.executeSkill('compareProgress', {
        githubData,
        userProfile,
        previousAnalysis
      });

      setProgressReport(report);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="progress-tracker">
      <h2>Track Your Progress</h2>
      
      {previousAnalysis ? (
        <>
          <p>Last analyzed: {new Date(previousAnalysis.timestamp).toLocaleDateString()}</p>
          <p>Previous score: {previousAnalysis.cookedLevel}/10</p>
          <button onClick={checkProgress} disabled={loading}>
            {loading ? 'Analyzing...' : 'Check My Progress'}
          </button>
        </>
      ) : (
        <p>Complete your first analysis to start tracking progress!</p>
      )}

      {progressReport && (
        <div className="progress-report">
          <h3>Progress Report</h3>
          <p className="level-change">
            Score Change: {progressReport.cookedLevel}/10 ({progressReport.levelChange})
          </p>
          
          <div className="improvements">
            <h4>✅ Improvements:</h4>
            <ul>
              {progressReport.improvements.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {progressReport.regressions?.length > 0 && progressReport.regressions[0] !== 'None' && (
            <div className="regressions">
              <h4>⚠️ Areas needing attention:</h4>
              <ul>
                {progressReport.regressions.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="next-steps">
            <h4>Next Steps:</h4>
            <ul>
              {progressReport.nextSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>

          <p className="summary">{progressReport.summary}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example: Integrating into your existing ChatPopup component
 */
function EnhancedChatPopup({ githubData, userProfile, userId, isOpen, onClose }) {
  const { sendMessage, loading, isInitialized } = useAnalysisAgent(githubData, userProfile, userId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    const userQuestion = input;
    setInput('');

    // Get agent response with memory
    const result = await sendMessage(userQuestion);
    setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
  };

  if (!isOpen) return null;

  return (
    <div className="chat-popup-overlay">
      <div className="chat-popup">
        <div className="chat-header">
          <h3>AI Career Advisor</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="chat-body">
          {!isInitialized ? (
            <p>Initializing agent...</p>
          ) : (
            <>
              {messages.length === 0 && (
                <p className="welcome-message">
                  Ask me anything about your GitHub profile, career recommendations, or learning path!
                </p>
              )}
              
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  {msg.content}
                </div>
              ))}
              
              {loading && <div className="typing-indicator">Thinking...</div>}
            </>
          )}
        </div>

        <form className="chat-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={loading || !isInitialized}
          />
          <button type="submit" disabled={loading || !isInitialized}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export {
  useAnalysisAgent,
  ResultsPageWithAgent,
  ProgressTracker,
  EnhancedChatPopup
};
