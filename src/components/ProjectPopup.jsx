import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Lightbulb, BookOpen, MessageSquare, Wrench } from 'lucide-react';
import { callOpenRouter } from '@/services/openrouter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Popup modal for a recommended project — shows overview, tech stack, and AI chat.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.project - The selected project object from AI
 * @param {Object} props.githubData
 * @param {Object} props.userProfile
 * @param {Object} props.analysis
 */
export default function ProjectPopup({ isOpen, onClose, project, githubData, userProfile, analysis }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Reset state when project changes
  useEffect(() => {
    if (project) {
      setMessages([]);
      setQuestion('');
    }
  }, [project?.name]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !project) return null;

  const buildProjectSystemPrompt = () => {
    const parts = [
      `You are a helpful AI mentor for the AmICooked platform. The user is viewing a recommended project and has questions about it.`,
      `Be concise, encouraging, and practical. Provide specific, actionable answers.`,
      `\nProject they are asking about:`,
      `- Name: ${project.name}`,
      `- Overview: ${project.overview || 'N/A'}`,
      `- Skills: ${project.skill1}, ${project.skill2}, ${project.skill3}`,
      `- Alignment with user: ${project.alignment || 'N/A'}`,
    ];

    if (project.suggestedStack?.length) {
      parts.push(`- Suggested stack: ${project.suggestedStack.map(s => `${s.name} (${s.description})`).join(', ')}`);
    }

    if (userProfile) {
      parts.push(`\nUser Profile:`);
      if (userProfile.age) parts.push(`- Age: ${userProfile.age}`);
      if (userProfile.education) parts.push(`- Education: ${userProfile.education.replace(/_/g, ' ')}`);
      if (userProfile.experienceYears) parts.push(`- Experience: ${userProfile.experienceYears.replace(/_/g, ' ')}`);
      if (userProfile.careerGoal) parts.push(`- Career Goal: ${userProfile.careerGoal}`);
      if (userProfile.technicalInterests) parts.push(`- Technical Interests: ${userProfile.technicalInterests}`);
    }

    if (githubData) {
      parts.push(`\nGitHub Stats:`);
      parts.push(`- Repos: ${githubData.totalRepos}, Commits: ${githubData.totalCommits}`);
      parts.push(`- Top Languages: ${githubData.languages?.join(', ') || 'Unknown'}`);
    }

    return parts.join('\n');
  };

  const handleAsk = async () => {
    if (!question.trim() || loading) return;

    const userMsg = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    setLoading(true);
    try {
      // Build contextual prompt with conversation history
      let contextualPrompt = userMsg;
      if (messages.length > 0) {
        const recentHistory = messages.slice(-6)
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');
        contextualPrompt = `Previous conversation:\n${recentHistory}\n\nUser's latest message: ${userMsg}`;
      }

      const response = await callOpenRouter(contextualPrompt, buildProjectSystemPrompt());
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Project chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const stack = project.suggestedStack || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#238636]/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-[#238636]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{project.name}</h2>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1c2128] text-green-400">
                  {project.skill1}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1c2128] text-blue-400">
                  {project.skill2}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1c2128] text-yellow-400">
                  {project.skill3}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#30363d] transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Overview */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-[#58a6ff]" />
              <h3 className="text-sm font-semibold text-[#58a6ff] uppercase tracking-wide">
                Project Overview
              </h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {project.overview || 'This project will help you build practical skills and expand your portfolio.'}
            </p>
          </div>

          {/* Alignment */}
          {project.alignment && (
            <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-yellow-400">
                  Why This Fits You
                </h3>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {project.alignment}
              </p>
            </div>
          )}

          {/* Suggested Stack */}
          {stack.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-[#58a6ff]" />
                <h3 className="text-sm font-semibold text-[#58a6ff] uppercase tracking-wide">
                  Suggested Technologies
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-3 italic">
                These are just suggestions — feel free to use alternatives that you're curious about!
              </p>
              <div className="space-y-2">
                {stack.map((tech, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-[#0d1117] rounded-lg px-4 py-3 border border-[#30363d]"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#58a6ff] mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-white">{tech.name}</span>
                      <span className="text-gray-500 mx-1.5">—</span>
                      <span className="text-sm text-gray-400">{tech.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[#30363d]" />

          {/* Ask AI Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-[#58a6ff]" />
              <h3 className="text-sm font-semibold text-[#58a6ff] uppercase tracking-wide">
                Have More Questions? Ask AI
              </h3>
            </div>

            {/* Chat messages */}
            {messages.length > 0 && (
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto rounded-lg bg-[#0d1117] border border-[#30363d] p-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-[#238636] text-white'
                          : 'bg-[#1c2128] text-gray-300'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-sm max-w-none">
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#1c2128] rounded-lg px-3 py-2">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="e.g., How long would this take a beginner?"
                className="flex-1 px-4 py-2.5 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff] text-sm"
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || loading}
                className="px-4 py-2.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
