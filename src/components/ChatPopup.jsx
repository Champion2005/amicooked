import { useState, useEffect, useRef } from 'react';
import { auth } from '@/config/firebase';
import logo from '@/assets/amicooked_logo.png';
import { callOpenRouter } from '@/services/openrouter';
import { createChat, addMessage, getUserChats } from '@/services/chat';
import { 
  X, Send, MessageSquare, Plus, Loader2, ChevronLeft, Flame, Bookmark 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatEducation } from '@/utils/formatEducation';
import ChatMessage from '@/components/ChatMessage';

/**
 * Full-screen AI chat popup
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the popup is visible
 * @param {Function} props.onClose - Callback to close the popup
 * @param {string} props.initialQuery - Optional query to start a new chat with
 * @param {Object} props.githubData - GitHub data for AI context
 * @param {Object} props.userProfile - User profile for AI context
 * @param {Object} props.analysis - Analysis results for AI context
 */
export default function ChatPopup({ isOpen, onClose, initialQuery, githubData, userProfile, analysis, onOpenSavedProjects }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { id, title, messages }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasHandledInitialQuery = useRef(false);

  const userId = auth.currentUser?.uid;

  // Load chat history on open
  useEffect(() => {
    if (isOpen && userId) {
      loadChats();
      hasHandledInitialQuery.current = false;
    }
  }, [isOpen, userId]);

  // Push history state when popup opens so browser back closes it
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ chatOpen: true }, '');

    const handlePopState = (e) => {
      // Browser back was pressed — close the popup instead of navigating away
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  // Handle initial query (when user types in header bar and clicks Ask)
  useEffect(() => {
    if (isOpen && initialQuery && !hasHandledInitialQuery.current && !chatsLoading) {
      hasHandledInitialQuery.current = true;
      handleNewChatWithQuery(initialQuery);
    }
  }, [isOpen, initialQuery, chatsLoading]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  // Focus input when active chat changes
  useEffect(() => {
    if (activeChat && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeChat?.id]);

  const loadChats = async () => {
    try {
      setChatsLoading(true);
      const userChats = await getUserChats(userId);
      setChats(userChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setChatsLoading(false);
    }
  };

  const buildSystemPrompt = () => {
    const parts = [
      `You are an AI assistant for the AmICooked platform, helping developers improve their GitHub profiles and career prospects.`,
      `Be concise, helpful, and brutally honest when needed. Use a casual but professional tone.`
    ];

    if (analysis) {
      parts.push(`\nThe user's current Cooked Level is ${analysis.cookedLevel}/10 (${analysis.levelName}).`);
      parts.push(`AI Summary: ${analysis.summary}`);
    }

    if (userProfile) {
      parts.push(`\nUser Profile:`);
      if (userProfile.age) parts.push(`- Age: ${userProfile.age}`);
      if (userProfile.education) parts.push(`- Education: ${formatEducation(userProfile.education)}`);
      if (userProfile.experienceYears) parts.push(`- Experience: ${userProfile.experienceYears.replace(/_/g, ' ')}`);
      if (userProfile.careerGoal) parts.push(`- Career Goal: ${userProfile.careerGoal}`);
      if (userProfile.technicalInterests) parts.push(`- Technical Interests: ${userProfile.technicalInterests}`);
      if (userProfile.currentRole) parts.push(`- Current Status: ${userProfile.currentRole}`);
    }

    if (githubData) {
      parts.push(`\nGitHub Stats:`);
      parts.push(`- Repos: ${githubData.totalRepos}, Commits: ${githubData.totalCommits}, PRs: ${githubData.totalPRs}`);
      parts.push(`- Stars: ${githubData.totalStars}, Streak: ${githubData.streak} days`);
      parts.push(`- Top Languages: ${githubData.languages?.join(', ') || 'Unknown'}`);
    }

    return parts.join('\n');
  };

  const getAIResponse = async (messages) => {
    const systemPrompt = buildSystemPrompt();

    // Build conversation history for the API
    const conversationMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Use callOpenRouter but we need the full conversation, so build the prompt
    const lastUserMessage = conversationMessages[conversationMessages.length - 1].content;
    
    // Include recent conversation context in the prompt
    let contextualPrompt = lastUserMessage;
    if (conversationMessages.length > 1) {
      const recentHistory = conversationMessages.slice(-6, -1)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      contextualPrompt = `Previous conversation:\n${recentHistory}\n\nUser's latest message: ${lastUserMessage}`;
    }

    return await callOpenRouter(contextualPrompt, systemPrompt);
  };

  const handleNewChatWithQuery = async (query) => {
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const context = { githubData, userProfile, analysis };
      const chatId = await createChat(userId, query.trim(), context);

      const newMessages = [
        { role: 'user', content: query.trim(), timestamp: new Date().toISOString() }
      ];

      setActiveChat({ id: chatId, title: query.trim().substring(0, 50), messages: newMessages });
      if (window.innerWidth < 640) setShowSidebar(false);

      // Get AI response
      const response = await getAIResponse(newMessages);
      
      await addMessage(userId, chatId, 'assistant', response);
      
      const updatedMessages = [
        ...newMessages,
        { role: 'assistant', content: response, timestamp: new Date().toISOString() }
      ];
      setActiveChat(prev => ({ ...prev, messages: updatedMessages }));
      
      // Refresh chat list
      await loadChats();
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading || !activeChat) return;

    const userMessage = input.trim();
    setInput('');

    const newMessages = [
      ...activeChat.messages,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
    ];
    setActiveChat(prev => ({ ...prev, messages: newMessages }));

    setLoading(true);
    try {
      await addMessage(userId, activeChat.id, 'user', userMessage);

      const response = await getAIResponse(newMessages);
      
      await addMessage(userId, activeChat.id, 'assistant', response);
      
      const updatedMessages = [
        ...newMessages,
        { role: 'assistant', content: response, timestamp: new Date().toISOString() }
      ];
      setActiveChat(prev => ({ ...prev, messages: updatedMessages }));
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessages = [
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() }
      ];
      setActiveChat(prev => ({ ...prev, messages: errorMessages }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChat({
      id: chat.id,
      title: chat.title,
      messages: chat.messages || []
    });
    if (window.innerWidth < 640) setShowSidebar(false);
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setShowSidebar(true);
    setInput('');
  };

  const handleClose = () => {
    setActiveChat(null);
    setShowSidebar(true);
    setInput('');
    onClose();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col">
      {/* Chat Header */}
      <header className="border-b border-[#30363d] bg-[#161b22] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!showSidebar && (
            <button 
              onClick={() => setShowSidebar(true)}
              className="text-gray-400 hover:text-white mr-1 sm:mr-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <img src={logo} alt="AmICooked" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-white truncate">AmICooked Bot</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Ask anything about your profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            onClick={handleNewChat}
            variant="outline"
            size="sm"
            className="border-[#30363d] text-gray-300 hover:text-white hover:bg-[#1c2128]"
          >
            <Plus className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-[#1c2128]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chat History */}
        {showSidebar && (
          <div className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-80 border-r border-[#30363d] bg-[#161b22] flex flex-col shrink-0 z-10">
            <div className="p-4 border-b border-[#30363d]">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Chat History</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chatsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#58a6ff]" />
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No chats yet</p>
                  <p className="text-gray-600 text-xs mt-1">Start a conversation below</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectChat(chat)}
                      className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
                        activeChat?.id === chat.id
                          ? 'bg-[#1c2128] border border-[#58a6ff]/30'
                          : 'hover:bg-[#1c2128] border border-transparent'
                      }`}
                    >
                      <p className="text-sm text-white truncate">{chat.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(chat.updatedAt)} · {chat.messages?.length || 0} messages
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* My Projects shortcut */}
            {onOpenSavedProjects && (
              <div className="px-3 py-3">
                <button
                  onClick={onOpenSavedProjects}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-yellow-400/80 hover:text-yellow-400 hover:bg-yellow-400/5 border border-transparent hover:border-yellow-400/20 transition-colors"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>My Projects</span>
                </button>
              </div>
            )}


          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activeChat ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5">
                {activeChat.messages.map((msg, idx) => (
                  <ChatMessage
                    key={idx}
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    formatTime={formatTime}
                  />
                ))}
                {loading && (
                  <div className="flex justify-center">
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-[#30363d] bg-[#161b22] p-3 sm:p-4">
                <div className="max-w-4xl mx-auto relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type your message..."
                    className="w-full pl-4 pr-12 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white disabled:text-white/20 transition-colors"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state when no chat is selected */
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-gray-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Ask AI Anything</h2>
                  <p className="text-gray-400 text-sm max-w-md">
                    Ask about your GitHub profile, get career advice, project ideas, or help understanding your Cooked Level.
                  </p>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto px-4 sm:px-0">
                    {[
                      'How can I improve my GitHub profile?',
                      'What projects should I build next?',
                      'How do I stand against my peers?',
                      'What skills am I missing?'
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleNewChatWithQuery(suggestion)}
                        disabled={loading}
                        className="text-left px-4 py-3 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-[#1c2128] text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* New chat input */}
              <div className="border-t border-[#30363d] bg-[#161b22] p-3 sm:p-4">
                <div className="max-w-4xl mx-auto relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask something..."
                    className="w-full pl-4 pr-12 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                        e.preventDefault();
                        handleNewChatWithQuery(input);
                        setInput('');
                      }
                    }}
                    disabled={loading}
                  />
                  <button
                    onClick={() => {
                      if (input.trim()) {
                        handleNewChatWithQuery(input);
                        setInput('');
                      }
                    }}
                    disabled={!input.trim() || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white disabled:text-white/20 transition-colors"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
