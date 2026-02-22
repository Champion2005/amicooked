import { useState, useRef, useEffect } from 'react';
import {
  X, Send, Loader2, Lightbulb, BookOpen, MessageSquare, Wrench,
  Bookmark, ChevronDown, ChevronUp
} from 'lucide-react';
import { createAgent } from '@/services/agent';
import { auth } from '@/config/firebase';
import {
  saveProject, unsaveProject, isProjectSaved,
  addProjectMessage, getSavedProject, slugify
} from '@/services/savedProjects';
import ChatMessage from '@/components/ChatMessage';

/**
 * ProjectPopup — modal for a project with collapsible info header,
 * full-height persisted chat, and bookmark toggle.
 */
export default function ProjectPopup({
  isOpen, onClose, project,
  githubData, userProfile, analysis,
  onSaveChange,
  initiallyExpanded = true,
}) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(initiallyExpanded);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const userId = auth.currentUser?.uid;

  // Sync state & create fresh agent when project changes
  useEffect(() => {
    if (!project || !isOpen) return;
    setQuestion('');
    setInfoExpanded(initiallyExpanded);
    loadProjectState();

    // Create a fresh agent with full context for this project
    agentRef.current = createAgent();
    agentRef.current.initialize(githubData, userProfile, analysis);
  }, [project?.name, isOpen]);

  const loadProjectState = async () => {
    if (!userId || !project) return;
    const isSaved = await isProjectSaved(userId, project.name);
    setSaved(isSaved);
    if (isSaved) {
      const slugId = slugify(project.name);
      const doc = await getSavedProject(userId, slugId);
      if (doc?.messages?.length) {
        setMessages(doc.messages);
        // Seed agent memory with existing conversation
        if (agentRef.current) {
          agentRef.current.memory.clearHistory();
          doc.messages.slice(-10).forEach(m => {
            agentRef.current.memory.addMessage(m.role, m.content);
          });
        }
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when info section collapses
  useEffect(() => {
    if (!infoExpanded && inputRef.current) inputRef.current.focus();
  }, [infoExpanded]);

  if (!isOpen || !project) return null;

  // Bookmark toggle
  const handleToggleSave = async () => {
    if (!userId || savingBookmark) return;
    if (saved) {
      setShowDeleteConfirm(true);
      return;
    }
    setSavingBookmark(true);
    try {
      await saveProject(userId, project);
      setSaved(true);
      onSaveChange?.();
    } catch (err) {
      console.error('Bookmark error:', err);
    } finally {
      setSavingBookmark(false);
    }
  };

  const confirmUnsave = async () => {
    setShowDeleteConfirm(false);
    setSavingBookmark(true);
    try {
      await unsaveProject(userId, slugify(project.name));
      setSaved(false);
      setMessages([]);
      onSaveChange?.();
    } catch (err) {
      console.error('Unsave error:', err);
    } finally {
      setSavingBookmark(false);
    }
  };

  // Auto-save on first chat message
  const ensureSaved = async () => {
    if (saved || !userId) return;
    try {
      await saveProject(userId, project);
      setSaved(true);
      onSaveChange?.();
    } catch { /* non-critical */ }
  };

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    const userMsg = question.trim();
    setQuestion('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);

    // Auto-save project on first chat
    await ensureSaved();

    setLoading(true);
    try {
      if (!agentRef.current) {
        agentRef.current = createAgent();
        await agentRef.current.initialize(githubData, userProfile, analysis);
      }
      const result = await agentRef.current.processProjectMessage(userMsg, project);
      const response = result.response;
      const updatedMessages = [...newMessages, { role: 'assistant', content: response }];
      setMessages(updatedMessages);

      // Persist both messages
      const projectId = slugify(project.name);
      if (userId) {
        await addProjectMessage(userId, projectId, 'user', userMsg).catch(() => {});
        await addProjectMessage(userId, projectId, 'assistant', response).catch(() => {});
      }
    } catch (error) {
      console.error('Project chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
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
      <div className="relative w-full max-w-2xl h-[92vh] sm:h-[85vh] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden mx-2 sm:mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground truncate">{project.name}</h2>
              <div className="flex gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-green-400">{project.skill1}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-blue-400">{project.skill2}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-yellow-400">{project.skill3}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleToggleSave}
              disabled={savingBookmark}
              className={`p-1.5 rounded-md transition-colors ${
                saved
                  ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-400/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-border'
              }`}
              title={saved ? 'Unsave project' : 'Save project'}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setInfoExpanded(v => !v)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-border transition-colors"
              title={infoExpanded ? 'Collapse info' : 'Expand info'}
            >
              {infoExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-border transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible project info */}
        {infoExpanded && (
          <div className="px-4 sm:px-5 py-4 space-y-4 border-b border-border overflow-y-auto max-h-[45vh] shrink-0 bg-background">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-accent" />
                <h3 className="text-xs font-semibold text-accent uppercase tracking-wide">Overview</h3>
              </div>
              <p className="text-foreground text-sm leading-relaxed">
                {project.overview || 'Build practical skills and expand your portfolio.'}
              </p>
            </div>

            {project.alignment && (
              <div className="bg-card rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                  <h3 className="text-xs font-semibold text-yellow-400">Why This Fits You</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{project.alignment}</p>
              </div>
            )}

            {stack.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-3.5 h-3.5 text-accent" />
                  <h3 className="text-xs font-semibold text-accent uppercase tracking-wide">Suggested Stack</h3>
                </div>
                <div className="space-y-1.5">
                  {stack.map((tech, i) => (
                    <div key={i} className="flex items-start gap-2 bg-card rounded-lg px-3 py-2 border border-border">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-foreground">{tech.name}</span>
                        <span className="text-muted-foreground mx-1">—</span>
                        <span className="text-muted-foreground">{tech.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat area — fills remaining space */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm">Ask anything about this project</p>
                <p className="text-xs text-muted-foreground">e.g. "How long would this take a beginner?"</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
              />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 sm:px-5 py-3 border-t border-border bg-card shrink-0">
            <div className="relative">
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
                placeholder="Ask about this project..."
                className="w-full pl-4 pr-12 py-3 rounded-md bg-background border border-border text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-foreground/60 hover:text-foreground disabled:text-foreground/20 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Unsave Project?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete <span className="text-foreground font-medium">"{project?.name}"</span> and its entire chat history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-md border border-border text-foreground hover:bg-surface text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnsave}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-foreground text-sm transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


