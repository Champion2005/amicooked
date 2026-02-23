import { useState, useEffect, useRef } from 'react';
import { auth } from '@/config/firebase';
import logo from '@/assets/amicooked_logo.png';
import { createAgent } from '@/services/agent';
import { createChat, addMessage, getUserChats } from '@/services/chat';
import { checkLimit, incrementUsage, getUsageSummary } from '@/services/usage';
import { USAGE_TYPES, formatLimit } from '@/config/plans';
import { 
  X, Send, MessageSquare, Plus, Loader2, ChevronLeft, Flame, Bookmark, AlertCircle, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import ChatMessage from '@/components/ChatMessage';
import { getRoastInstruction } from '@/config/preferences';

/**
 * Full-screen AI chat popup
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the popup is visible
 * @param {Function} props.onClose - Callback to close the popup
 * @param {string} props.initialQuery - Optional query to start a new chat with
 * @param {Object} props.githubData - GitHub data for AI context
 * @param {Object} props.userProfile - User profile for AI context
 * @param {Object} props.analysis - Analysis results for AI context
 * @param {string} [props.planId='free'] - User's plan ID; controls which metrics are exposed to the AI
 * @param {string} [props.roastIntensity='balanced'] - Roast intensity preference ID
 * @param {string} [props.nickname=''] - User's chosen nickname for AI addressing
 */
export default function ChatPopup({ isOpen, onClose, initialQuery, githubData, userProfile, analysis, onOpenSavedProjects, planId = 'free', roastIntensity = 'balanced', nickname = '' }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { id, title, messages }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [usageSummary, setUsageSummary] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const hasHandledInitialQuery = useRef(false);

  const userId = auth.currentUser?.uid;
  const toast = useToast();

  // Load chat history, usage summary, and initialise agent on open
  useEffect(() => {
    if (isOpen && userId && auth.currentUser) {
      loadChats();
      hasHandledInitialQuery.current = false;
      // Create agent and load persisted state (memory, identity) for paid plans
      agentRef.current = createAgent();
      // Pass the currentUser's UID to ensure it matches the signed-in user
      agentRef.current.initialize(githubData, userProfile, analysis, null, auth.currentUser.uid, planId, getRoastInstruction(roastIntensity), nickname);
      // Load usage so we can show the usage bar
      getUsageSummary(userId).then(setUsageSummary).catch(() => {});
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

  const getAIResponse = async (userMessage, onChunk, model) => {
    if (!agentRef.current) {
      agentRef.current = createAgent();
      await agentRef.current.initialize(githubData, userProfile, analysis, null, userId, planId);
    }
    const result = await agentRef.current.processMessage(userMessage, 'QUICK_CHAT', onChunk, model);
    return result.response;
  };

  const handleNewChatWithQuery = async (query) => {
    if (!query.trim() || loading) return;

    // Check usage limit before making the AI call
    const limitCheck = await checkLimit(userId, USAGE_TYPES.MESSAGE);
    if (!limitCheck.allowed) {
      toast.error(`You've used all ${formatLimit(limitCheck.limit)} messages for this period. Upgrade your plan to continue.`);
      return;
    }
    setUsingFallback(limitCheck.usingFallback);

    setLoading(true);
    try {
      const context = { githubData, userProfile, analysis };
      const chatId = await createChat(userId, query.trim(), context);

      const userTimestamp = new Date().toISOString();
      const newMessages = [
        { role: 'user', content: query.trim(), timestamp: userTimestamp }
      ];

      // Don't set assistant timestamp yet — wait until streaming completes
      const assistantMessage = { role: 'assistant', content: '' };
      setActiveChat({ id: chatId, title: query.trim().substring(0, 50), messages: [...newMessages, assistantMessage] });
      if (window.innerWidth < 640) setShowSidebar(false);

      // Get AI response via agent with streaming, using the resolved model
      let fullResponse = '';
      await getAIResponse(query.trim(), (chunk) => {
        fullResponse += chunk;
        // Update the assistant message in real-time as chunks arrive
        setActiveChat(prev => {
          if (!prev) return prev;
          const updated = [...prev.messages];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullResponse
          };
          return { ...prev, messages: updated };
        });
      }, limitCheck.model);

      // Set timestamp after streaming completes
      setActiveChat(prev => {
        if (!prev) return prev;
        const updated = [...prev.messages];
        updated[updated.length - 1].timestamp = new Date().toISOString();
        return { ...prev, messages: updated };
      });

      await addMessage(userId, chatId, 'assistant', fullResponse);
      await incrementUsage(userId, USAGE_TYPES.MESSAGE);
      // Refresh usage display
      getUsageSummary(userId).then(setUsageSummary).catch(() => {});
      await loadChats();
    } catch (error) {
      console.error('Error starting chat:', error);
      const errorMsg = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() };
      setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, errorMsg] } : null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading || !activeChat) return;

    // Check usage limit before making the AI call
    const limitCheck = await checkLimit(userId, USAGE_TYPES.MESSAGE);
    if (!limitCheck.allowed) {
      toast.error(`You've used all ${formatLimit(limitCheck.limit)} messages for this period. Upgrade your plan to continue.`);
      return;
    }
    setUsingFallback(limitCheck.usingFallback);

    const userMessage = input.trim();
    setInput('');

    const userTimestamp = new Date().toISOString();
    const newMessages = [
      ...activeChat.messages,
      { role: 'user', content: userMessage, timestamp: userTimestamp }
    ];
    setActiveChat(prev => ({ ...prev, messages: newMessages }));

    setLoading(true);
    try {
      await addMessage(userId, activeChat.id, 'user', userMessage);

      // Don't set assistant timestamp yet — wait until streaming completes
      const assistantMessage = { role: 'assistant', content: '' };
      const messagesWithAssistant = [...newMessages, assistantMessage];
      setActiveChat(prev => ({ ...prev, messages: messagesWithAssistant }));

      // Agent already holds conversation history for this session
      let fullResponse = '';
      await getAIResponse(userMessage, (chunk) => {
        fullResponse += chunk;
        // Update the assistant message in real-time as chunks arrive
        setActiveChat(prev => {
          if (!prev) return prev;
          const updated = [...prev.messages];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullResponse
          };
          return { ...prev, messages: updated };
        });
      }, limitCheck.model);

      // Set timestamp after streaming completes
      setActiveChat(prev => {
        if (!prev) return prev;
        const updated = [...prev.messages];
        updated[updated.length - 1].timestamp = new Date().toISOString();
        return { ...prev, messages: updated };
      });

      await addMessage(userId, activeChat.id, 'assistant', fullResponse);
      await incrementUsage(userId, USAGE_TYPES.MESSAGE);
      // Refresh usage display
      getUsageSummary(userId).then(setUsageSummary).catch(() => {});
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() };
      setActiveChat(prev => ({ ...prev, messages: [...prev.messages, errorMsg] }));
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
    // End previous session before switching to another chat
    agentRef.current?.endSession();
    setActiveChat({
      id: chat.id,
      title: chat.title,
      messages: chat.messages || []
    });
    // Sync agent memory with this chat's history so follow-up replies are consistent
    if (agentRef.current) {
      agentRef.current.memory.clearHistory();
      (chat.messages || []).slice(-10).forEach(m => {
        agentRef.current.memory.addMessage(m.role, m.content);
      });
    }
    if (window.innerWidth < 640) setShowSidebar(false);
  };

  const handleNewChat = () => {
    // End current session before starting a new one
    agentRef.current?.endSession();
    setActiveChat(null);
    if (window.innerWidth < 640) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
    setInput('');
    // Reset conversation history, keep context (githubData/analysis stay in agent)
    agentRef.current?.memory.clearHistory();
  };

  const handleClose = () => {
    // Extract memory from this session before closing
    agentRef.current?.endSession();
    setActiveChat(null);
    setShowSidebar(true);
    setInput('');
    onClose();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} ${timeStr}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Chat Header */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!showSidebar && (
            <button 
              onClick={() => setShowSidebar(true)}
              className="text-muted-foreground hover:text-foreground mr-1 sm:mr-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <img src={agentRef.current?.getIcon() || logo} alt="Agent" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-foreground truncate">{agentRef.current?.getDisplayName() || 'AI Agent'}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Ask anything about your profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            onClick={handleNewChat}
            variant="outline"
            size="sm"
            className="border-border text-gray-300 hover:text-foreground hover:bg-surface"
          >
            <Plus className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
          <button 
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chat History */}
        {showSidebar && (
          <div className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-80 border-r border-border bg-card flex flex-col shrink-0 z-10">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Chat History</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chatsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No chats yet</p>
                  <p className="text-muted-foreground text-xs mt-1">Start a conversation below</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectChat(chat)}
                      className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
                        activeChat?.id === chat.id
                          ? 'bg-surface border border-accent/30'
                          : 'hover:bg-surface border border-transparent'
                      }`}
                    >
                      <p className="text-sm text-foreground truncate">{chat.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
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
                {loading && activeChat.messages.length > 0 && activeChat.messages[activeChat.messages.length - 1]?.role === 'assistant' && !activeChat.messages[activeChat.messages.length - 1]?.content && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border bg-card p-3 sm:p-4">
                {/* Fallback model notice */}
                {usingFallback && (
                  <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-md px-3 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Free model active — <a href="/pricing" className="underline hover:text-amber-400">upgrade your plan</a> for better responses.</span>
                  </div>
                )}
                <div className="max-w-4xl mx-auto relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type your message..."
                    className="w-full pl-4 pr-12 py-3 rounded-md bg-background border border-border text-foreground text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
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
                {/* Usage bar */}
                {usageSummary && usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE] !== null && (
                  <div className="max-w-4xl mx-auto mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (usageSummary.usage[USAGE_TYPES.MESSAGE] ?? 0) >= usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE]
                            ? 'bg-red-500'
                            : 'bg-accent'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            ((usageSummary.usage[USAGE_TYPES.MESSAGE] ?? 0) / usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE]) * 100
                          )}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {usageSummary.usage[USAGE_TYPES.MESSAGE] ?? 0} / {usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE]} messages
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state when no chat is selected */
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Ask your Agent anything</h2>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Ask about your GitHub profile, get career advice, project ideas, or help understanding your Cooked Level.
                  </p>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto px-4 sm:px-0">
                    {[
                      'What are my biggest skill gaps?',
                      'What projects should I build next?',
                      'What skills am I missing?',
                      'Give me a 3-month learning roadmap'
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleNewChatWithQuery(suggestion)}
                        disabled={loading}
                        className="text-left px-4 py-3 rounded-lg border border-border bg-card hover:bg-surface text-sm text-gray-300 hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* New chat input */}
              <div className="border-t border-border bg-card p-3 sm:p-4">
                {/* Fallback model notice */}
                {usingFallback && (
                  <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-md px-3 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Free model active — <a href="/pricing" className="underline hover:text-amber-400">upgrade your plan</a> for better responses.</span>
                  </div>
                )}
                <div className="max-w-4xl mx-auto relative">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask something..."
                    className="w-full pl-4 pr-12 py-3 rounded-md bg-background border border-border text-foreground text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
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
                {/* Usage bar */}
                {usageSummary && usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE] !== null && (
                  <div className="max-w-4xl mx-auto mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (usageSummary.usage[USAGE_TYPES.MESSAGE] ?? 0) >= usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE]
                            ? 'bg-red-500'
                            : 'bg-accent'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            ((usageSummary.usage[USAGE_TYPES.MESSAGE] ?? 0) / usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE]) * 100
                          )}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {usageSummary.usage[USAGE_TYPES.MESSAGE] ?? 0} / {usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE]} messages
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
