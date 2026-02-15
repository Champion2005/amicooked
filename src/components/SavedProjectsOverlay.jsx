import { useState, useEffect, useRef } from "react";
import { auth } from "@/config/firebase";
import {
  getSavedProjects,
  unsaveProject,
  addProjectMessage,
  getSavedProject,
} from "@/services/savedProjects";
import { callOpenRouter } from "@/services/openrouter";
import { formatEducation } from "@/utils/formatEducation";
import {
  X,
  Bookmark,
  Lightbulb,
  MessageSquare,
  Trash2,
  Loader2,
  FolderOpen,
  Send,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import ChatMessage from "@/components/ChatMessage";

/**
 * Full-screen overlay for saved projects — sidebar list + main chat area
 * mirroring the ChatPopup layout.
 */
export default function SavedProjectsOverlay({
  isOpen,
  onClose,
  githubData,
  userProfile,
  analysis,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState(null); // full project doc with messages
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // project to confirm-delete
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const userId = auth.currentUser?.uid;

  // Load projects when overlay opens
  useEffect(() => {
    if (isOpen && userId) {
      loadProjects();
      setActiveProject(null);
      setShowSidebar(true);
    }
  }, [isOpen, userId]);

  // Browser-back to close
  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ savedProjectsOpen: true }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeProject?.messages]);

  // Focus input when selecting a project
  useEffect(() => {
    if (activeProject && inputRef.current) inputRef.current.focus();
  }, [activeProject?.id]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getSavedProjects(userId);
      setProjects(data);
    } catch (err) {
      console.error("Failed to load saved projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = async (proj) => {
    // Fetch fresh data to get latest messages
    const fresh = await getSavedProject(userId, proj.id);
    setActiveProject(fresh || proj);
    setInfoExpanded(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await unsaveProject(userId, deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      if (activeProject?.id === deleteTarget.id) {
        setActiveProject(null);
        setShowSidebar(true);
      }
    } catch (err) {
      console.error("Unsave error:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBack = () => {
    setShowSidebar(true);
  };

  // ── Chat ──
  const buildSystemPrompt = () => {
    if (!activeProject) return "";
    const parts = [
      "You are a helpful AI mentor for the AmICooked platform. The user is working on a saved project and has questions about it.",
      "Be concise, encouraging, and practical. Provide specific, actionable answers.",
      `\nProject:`,
      `- Name: ${activeProject.name}`,
      `- Overview: ${activeProject.overview || "N/A"}`,
      `- Skills: ${activeProject.skill1}, ${activeProject.skill2}, ${activeProject.skill3}`,
      `- Alignment: ${activeProject.alignment || "N/A"}`,
    ];
    if (activeProject.suggestedStack?.length) {
      parts.push(
        `- Stack: ${activeProject.suggestedStack.map((s) => `${s.name} (${s.description})`).join(", ")}`,
      );
    }
    if (userProfile) {
      parts.push("\nUser Profile:");
      if (userProfile.age) parts.push(`- Age: ${userProfile.age}`);
      if (userProfile.education)
        parts.push(`- Education: ${formatEducation(userProfile.education)}`);
      if (userProfile.experienceYears)
        parts.push(
          `- Experience: ${userProfile.experienceYears.replace(/_/g, " ")}`,
        );
      if (userProfile.careerGoal)
        parts.push(`- Career Goal: ${userProfile.careerGoal}`);
    }
    if (githubData) {
      parts.push("\nGitHub Stats:");
      parts.push(
        `- Repos: ${githubData.totalRepos}, Commits: ${githubData.totalCommits}`,
      );
      parts.push(
        `- Top Languages: ${githubData.languages?.join(", ") || "Unknown"}`,
      );
    }
    return parts.join("\n");
  };

  const handleSendMessage = async () => {
    if (!input.trim() || chatLoading || !activeProject) return;
    const userMsg = input.trim();
    setInput("");

    const newMessages = [
      ...(activeProject.messages || []),
      { role: "user", content: userMsg, timestamp: new Date().toISOString() },
    ];
    setActiveProject((prev) => ({ ...prev, messages: newMessages }));

    setChatLoading(true);
    try {
      // Persist user message
      await addProjectMessage(userId, activeProject.id, "user", userMsg);

      // Build contextual prompt
      let contextualPrompt = userMsg;
      if (newMessages.length > 1) {
        const recent = newMessages
          .slice(-6, -1)
          .map(
            (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
          )
          .join("\n");
        contextualPrompt = `Previous conversation:\n${recent}\n\nUser's latest message: ${userMsg}`;
      }

      const response = await callOpenRouter(
        contextualPrompt,
        buildSystemPrompt(),
      );

      // Persist AI response
      await addProjectMessage(userId, activeProject.id, "assistant", response);

      const updatedMessages = [
        ...newMessages,
        {
          role: "assistant",
          content: response,
          timestamp: new Date().toISOString(),
        },
      ];
      setActiveProject((prev) => ({ ...prev, messages: updatedMessages }));
    } catch (error) {
      console.error("Project chat error:", error);
      setActiveProject((prev) => ({
        ...prev,
        messages: [
          ...(prev.messages || []),
          {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
            timestamp: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      setChatLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    setInput(suggestion);
    // Auto-send after a tick so input is set
    setTimeout(() => {
      const fakeInput = suggestion;
      setInput("");
      // Inline send
      const go = async () => {
        if (!activeProject) return;
        const newMessages = [
          ...(activeProject.messages || []),
          {
            role: "user",
            content: fakeInput,
            timestamp: new Date().toISOString(),
          },
        ];
        setActiveProject((prev) => ({ ...prev, messages: newMessages }));
        setChatLoading(true);
        try {
          await addProjectMessage(userId, activeProject.id, "user", fakeInput);
          let contextualPrompt = fakeInput;
          if (newMessages.length > 1) {
            const recent = newMessages
              .slice(-6, -1)
              .map(
                (m) =>
                  `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
              )
              .join("\n");
            contextualPrompt = `Previous conversation:\n${recent}\n\nUser's latest message: ${fakeInput}`;
          }
          const response = await callOpenRouter(
            contextualPrompt,
            buildSystemPrompt(),
          );
          await addProjectMessage(
            userId,
            activeProject.id,
            "assistant",
            response,
          );
          setActiveProject((prev) => ({
            ...prev,
            messages: [
              ...(prev.messages || []),
              {
                role: "assistant",
                content: response,
                timestamp: new Date().toISOString(),
              },
            ],
          }));
        } catch {
          setActiveProject((prev) => ({
            ...prev,
            messages: [
              ...(prev.messages || []),
              {
                role: "assistant",
                content: "Sorry, something went wrong.",
                timestamp: new Date().toISOString(),
              },
            ],
          }));
        } finally {
          setChatLoading(false);
        }
      };
      go();
    }, 0);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!isOpen) return null;

  const stack = activeProject?.suggestedStack || [];
  const messages = activeProject?.messages || [];

  const suggestions = activeProject
    ? [
        `How do I get started with ${activeProject.name}?`,
        `What should I build first?`,
        `How long would this take a beginner?`,
        `What resources should I use to learn ${activeProject.skill1}?`,
      ]
    : [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col">
        {/* Header */}
        <header className="border-b border-[#30363d] bg-[#161b22] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {!showSidebar && (
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white mr-1 sm:mr-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-400/10 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">
                {activeProject ? activeProject.name : "Saved Projects"}
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                {activeProject
                  ? `${activeProject.skill1} · ${activeProject.skill2} · ${activeProject.skill3}`
                  : `${projects.length} project${projects.length !== 1 ? "s" : ""} saved`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {activeProject && (
              <>
                <button
                  onClick={() => setInfoExpanded((v) => !v)}
                  className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#1c2128] transition-colors"
                  title={
                    infoExpanded ? "Hide project info" : "Show project info"
                  }
                >
                  {infoExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setDeleteTarget(activeProject)}
                  className="p-2 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-[#1c2128]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — Saved Projects List */}
          {showSidebar && (
            <div className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-80 border-r border-[#30363d] bg-[#161b22] flex flex-col shrink-0 z-10">
              <div className="p-4 border-b border-[#30363d]">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Your Saved Projects
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#58a6ff]" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <FolderOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No saved projects yet
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      Bookmark a project to save it here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {projects.map((proj) => (
                      <div key={proj.id} className="group relative">
                        <button
                          onClick={() => handleSelectProject(proj)}
                          className={`w-full text-left px-3 py-3 pr-8 rounded-md transition-colors ${
                            activeProject?.id === proj.id
                              ? "bg-[#1c2128] border border-[#58a6ff]/30"
                              : "hover:bg-[#1c2128] border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-3.5 h-3.5 text-[#238636] shrink-0" />
                            <p className="text-sm text-white truncate">
                              {proj.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-5.5">
                            <p className="text-xs text-gray-500">
                              {proj.messages?.length || 0} messages
                            </p>
                            {proj.savedAt && (
                              <span className="text-xs text-gray-600">
                                · {formatTime(proj.savedAt)}
                              </span>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(proj);
                          }}
                          className="absolute right-2 top-3 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeProject ? (
              <>
                {/* Collapsible project info */}
                {infoExpanded && (
                  <div className="px-4 sm:px-5 py-4 space-y-4 border-b border-[#30363d] overflow-y-auto max-h-[40vh] shrink-0 bg-[#0d1117]">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#58a6ff]" />
                        <h3 className="text-xs font-semibold text-[#58a6ff] uppercase tracking-wide">
                          Overview
                        </h3>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {activeProject.overview ||
                          "Build practical skills and expand your portfolio."}
                      </p>
                    </div>

                    {activeProject.alignment && (
                      <div className="bg-[#161b22] rounded-lg p-3 border border-[#30363d]">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                          <h3 className="text-xs font-semibold text-yellow-400">
                            Why This Fits You
                          </h3>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {activeProject.alignment}
                        </p>
                      </div>
                    )}

                    {stack.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="w-3.5 h-3.5 text-[#58a6ff]" />
                          <h3 className="text-xs font-semibold text-[#58a6ff] uppercase tracking-wide">
                            Suggested Stack
                          </h3>
                        </div>
                        <div className="space-y-1.5">
                          {stack.map((tech, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 bg-[#161b22] rounded-lg px-3 py-2 border border-[#30363d]"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] mt-1.5 shrink-0" />
                              <div className="text-sm">
                                <span className="font-medium text-white">
                                  {tech.name}
                                </span>
                                <span className="text-gray-500 mx-1">—</span>
                                <span className="text-gray-400">
                                  {tech.description}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#161b22] border border-[#30363d] text-green-400">
                        {activeProject.skill1}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#161b22] border border-[#30363d] text-blue-400">
                        {activeProject.skill2}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#161b22] border border-[#30363d] text-yellow-400">
                        {activeProject.skill3}
                      </span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-8 h-8 text-gray-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-white mb-1">
                          Chat about {activeProject.name}
                        </h2>
                        <p className="text-gray-400 text-sm max-w-md mb-6">
                          Get help planning, building, or learning the
                          technologies for this project.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto px-4 sm:px-0">
                          {suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion)}
                              disabled={chatLoading}
                              className="text-left px-4 py-3 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-[#1c2128] text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <ChatMessage
                          key={idx}
                          role={msg.role}
                          content={msg.content}
                          timestamp={msg.timestamp}
                          formatTime={formatTime}
                        />
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-[#30363d] bg-[#161b22] p-3 sm:p-4 shrink-0">
                  <div className="max-w-4xl mx-auto relative">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={`Ask about ${activeProject.name}...`}
                      className="w-full pl-4 pr-12 py-3 rounded-full bg-[#0d1117] border border-[#30363d] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!input.trim() || chatLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white disabled:text-white/20 transition-colors"
                    >
                      {chatLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty state — no project selected */
              !showSidebar && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="w-10 h-10 text-gray-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      Select a Project
                    </h2>
                    <p className="text-gray-400 text-sm max-w-md">
                      Choose a saved project from the sidebar to view its
                      details and continue chatting.
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Delete Project?
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete{" "}
              <span className="text-white font-medium">
                "{deleteTarget.name}"
              </span>{" "}
              and its entire chat history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-md border border-[#30363d] text-gray-300 hover:bg-[#1c2128] text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
