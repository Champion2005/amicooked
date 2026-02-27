import { useState, useEffect, useRef } from "react";
import { auth } from "@/config/firebase";
import {
  getSavedProjects,
  unsaveProject,
  addProjectMessage,
  getSavedProject,
  saveProject,
  isProjectSaved,
  slugify,
} from "@/services/savedProjects";
import { createAgent } from "@/services/agent";
import { checkLimit, incrementUsage, getUsageSummary } from "@/services/usage";
import { USAGE_TYPES, formatLimit } from "@/config/plans";
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
  Star,
  CheckSquare,
  Square,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import ChatMessage from "@/components/ChatMessage";

/**
 * Full-screen overlay for My Projects — sidebar list + main chat area
 * with recommended projects section at the top.
 */
export default function SavedProjectsOverlay({
  isOpen,
  onClose,
  githubData,
  userProfile,
  analysis,
  recommendedProjects = [],
  initialProjectId = null,
  planId = 'free',
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState(null); // full project doc with messages
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // project to confirm-delete
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false); // selection mode active
  const [selectedProjects, setSelectedProjects] = useState(new Set()); // selected project IDs
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null); // 'selected' or 'all'
  const [showDeleteMenu, setShowDeleteMenu] = useState(false); // dropdown menu
  const [recommendedSaveStatus, setRecommendedSaveStatus] = useState({}); // {projectName: boolean}
  const [recommendedProjectsData, setRecommendedProjectsData] = useState([]); // Enriched with updatedAt
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [usageSummary, setUsageSummary] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const agentRef = useRef(null);
  const userId = auth.currentUser?.uid;
  const toast = useToast();

  // Load projects when overlay opens; end session when it closes
  useEffect(() => {
    if (!isOpen) {
      agentRef.current?.endSession();
      return;
    }
    if (!userId) return;
    loadProjects();
    loadRecommendedSaveStatus();
    getUsageSummary(userId).then(setUsageSummary).catch(() => {});
    setShowSidebar(true);
    // Reset active project if no initial selection
    if (!initialProjectId) {
      setActiveProject(null);
    }
  }, [isOpen, userId]);
  
  // Handle initial project selection
  useEffect(() => {
    if (isOpen && initialProjectId && recommendedProjects.length > 0) {
      const project = recommendedProjects.find((p) => slugify(p.name) === initialProjectId);
      if (project) {
        handleSelectRecommendedProject(project);
      }
    }
  }, [isOpen, initialProjectId, recommendedProjects]);
  
  // Auto-select most recent project when opening without specific selection
  useEffect(() => {
    if (!isOpen || initialProjectId || activeProject) return;
    
    // Wait for data to load
    if (loading || !userId) return;
    
    // Find most recent project across both recommended and saved
    const allProjects = [...recommendedProjectsData, ...projects];
    
    if (allProjects.length === 0) return;
    
    // Sort by most recent (updatedAt descending, nulls last)
    const sorted = allProjects.sort((a, b) => {
      if (!a.updatedAt && !b.updatedAt) return 0;
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    
    const mostRecent = sorted[0];
    
    // Select the most recent project
    if (mostRecent) {
      // Check if it's a recommended project or saved project
      const isRecommended = recommendedProjectsData.some(p => p.name === mostRecent.name);
      if (isRecommended) {
        handleSelectRecommendedProject(mostRecent);
      } else {
        handleSelectProject(mostRecent);
      }
    }
  }, [isOpen, initialProjectId, activeProject, loading, recommendedProjectsData, projects, userId]);
  
  // Reload recommended save status when recommended projects change
  useEffect(() => {
    if (isOpen && userId && recommendedProjects.length > 0) {
      loadRecommendedSaveStatus();
    }
  }, [recommendedProjects, isOpen, userId]);

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
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendedSaveStatus = async () => {
    if (!userId || !recommendedProjects.length) return;
    const statusMap = {};
    const enrichedProjects = [];
    
    await Promise.all(
      recommendedProjects.map(async (rec) => {
        const slugId = slugify(rec.name);
        const savedProj = await getSavedProject(userId, slugId);
        statusMap[rec.name] = savedProj !== null;

        // Enrich with updatedAt for sorting
        enrichedProjects.push({
          ...rec,
          id: slugId,
          updatedAt: savedProj?.updatedAt || null,
          messages: savedProj?.messages || []
        });
      })
    );
    
    // Sort by most recent (updatedAt descending, nulls last)
    enrichedProjects.sort((a, b) => {
      if (!a.updatedAt && !b.updatedAt) return 0;
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    
    setRecommendedSaveStatus(statusMap);
    setRecommendedProjectsData(enrichedProjects);
  };

  const initAgentForProject = (projectMessages) => {
    agentRef.current = createAgent();
    agentRef.current.initialize(githubData, userProfile, analysis, null, userId, planId);
    // Seed agent memory with existing conversation history
    if (projectMessages?.length) {
      projectMessages.slice(-10).forEach(m => {
        agentRef.current.memory.addMessage(m.role, m.content);
      });
    }
  };

  const handleSelectRecommendedProject = async (proj) => {
    if (!proj) return;
    
    // Check if this recommended project is saved
    const slugId = slugify(proj.name);
    const isSaved = await isProjectSaved(userId, proj.name);
    
    if (isSaved) {
      // Load saved project with chat history
      const savedProj = await getSavedProject(userId, slugId);
      setActiveProject(savedProj || { ...proj, id: slugId, messages: [] });
      initAgentForProject(savedProj?.messages);
    } else {
      // Show project info but no persisted chat yet
      setActiveProject({ ...proj, id: slugId, messages: [] });
      initAgentForProject([]);
    }
    
    if (window.innerWidth < 640) setShowSidebar(false);
    setInfoExpanded(true);
  };

  const handleToggleRecommendedBookmark = async (proj) => {
    if (!userId || savingBookmark) return;
    
    const isSaved = recommendedSaveStatus[proj.name];
    setSavingBookmark(true);
    
    try {
      if (isSaved) {
        // Unsave
        await unsaveProject(userId, slugify(proj.name));
        setRecommendedSaveStatus(prev => ({ ...prev, [proj.name]: false }));
        
        // If this project is currently active and we just unsaved it, clear its messages
        if (activeProject?.name === proj.name) {
          setActiveProject(prev => ({ ...prev, messages: [] }));
        }
        
        // Reload projects list
        await loadProjects();
      } else {
        // Check project save limit before creating a new saved project
        const saveCheck = await checkLimit(userId, USAGE_TYPES.PROJECT_CHAT);
        if (!saveCheck.allowed) {
          toast.error(`You've reached the project limit (${formatLimit(saveCheck.limit)}) for your plan. Upgrade to save more projects.`);
          return;
        }
        // Save
        await saveProject(userId, proj);
        await incrementUsage(userId, USAGE_TYPES.PROJECT_CHAT);
        setRecommendedSaveStatus(prev => ({ ...prev, [proj.name]: true }));
        
        // Reload projects list
        await loadProjects();
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleSelectProject = async (proj) => {
    // Fetch fresh data to get latest messages
    const fresh = await getSavedProject(userId, proj.id);
    setActiveProject(fresh || proj);
    initAgentForProject(fresh?.messages || proj.messages);
    if (window.innerWidth < 640) setShowSidebar(false);
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

  const handleToggleSelectProject = (projectId) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleStartBulkDelete = (mode) => {
    setBulkDeleteTarget(mode);
    setShowDeleteMenu(false);
  };

  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteTarget) return;
    
    const projectsToDelete = bulkDeleteTarget === 'all' 
      ? projects 
      : projects.filter(p => selectedProjects.has(p.id));
    
    try {
      // Delete all projects in parallel
      await Promise.all(
        projectsToDelete.map(proj => unsaveProject(userId, proj.id))
      );
      
      // Update state
      const deletedIds = new Set(projectsToDelete.map(p => p.id));
      setProjects(prev => prev.filter(p => !deletedIds.has(p.id)));
      
      // Clear active project if it was deleted
      if (activeProject && deletedIds.has(activeProject.id)) {
        setActiveProject(null);
        setShowSidebar(true);
      }
      
      // Reset selection state
      setSelectedProjects(new Set());
      setBulkDeleteMode(false);
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setBulkDeleteTarget(null);
    }
  };

  const handleCancelBulkMode = () => {
    setBulkDeleteMode(false);
    setSelectedProjects(new Set());
    setShowDeleteMenu(false);
  };

  const handleBack = () => {
    setShowSidebar(true);
  };

  // ── Chat ──
  const handleSendMessage = async () => {
    if (!input.trim() || chatLoading || !activeProject) return;

    // Check the shared message limit (PROJECT_CHAT limit governs project saves, not messages)
    const limitCheck = await checkLimit(userId, USAGE_TYPES.MESSAGE);

    if (!limitCheck.allowed) {
      toast.error(`You've used all ${formatLimit(limitCheck.limit)} AI messages for this period. Upgrade your plan to continue.`);
      return;
    }

    setUsingFallback(limitCheck.usingFallback);

    const userMsg = input.trim();
    setInput("");

    const userTimestamp = new Date().toISOString();
    const newMessages = [
      ...(activeProject.messages || []),
      { role: "user", content: userMsg, timestamp: userTimestamp },
    ];
    setActiveProject((prev) => ({ ...prev, messages: newMessages }));

    // Auto-save recommended project on first chat
    const isSaved = await isProjectSaved(userId, activeProject.name);
    if (!isSaved && activeProject.name) {
      // Check project save limit before creating a new saved project
      const saveCheck = await checkLimit(userId, USAGE_TYPES.PROJECT_CHAT);
      if (!saveCheck.allowed) {
        toast.error(`You've reached the project limit (${formatLimit(saveCheck.limit)}) for your plan. Upgrade to save more projects.`);
        return;
      }
      try {
        await saveProject(userId, activeProject);
        await incrementUsage(userId, USAGE_TYPES.PROJECT_CHAT);
        setRecommendedSaveStatus(prev => ({ ...prev, [activeProject.name]: true }));
        await loadProjects(); // Refresh projects list
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }

    setChatLoading(true);
    try {
      // Persist user message
      await addProjectMessage(userId, activeProject.id, "user", userMsg);

      // Build contextual prompt
      if (!agentRef.current) {
        initAgentForProject(newMessages.slice(0, -1));
      }
      
      // Don't set assistant timestamp yet — wait until streaming completes
      const assistantMessage = { role: "assistant", content: "" };
      setActiveProject((prev) => ({ ...prev, messages: [...newMessages, assistantMessage] }));

      // Stream the response using the resolved model
      let fullResponse = '';
      await agentRef.current.processProjectMessage(userMsg, activeProject, (chunk) => {
        fullResponse += chunk;
        // Update the assistant message in real-time as chunks arrive
        setActiveProject(prev => {
          const updated = [...prev.messages];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullResponse
          };
          return { ...prev, messages: updated };
        });
      }, limitCheck.model);

      // Set timestamp after streaming completes
      setActiveProject(prev => {
        const updated = [...prev.messages];
        updated[updated.length - 1].timestamp = new Date().toISOString();
        return { ...prev, messages: updated };
      });

      // Persist AI response
      await addProjectMessage(userId, activeProject.id, "assistant", fullResponse);
      // Increment the shared message counter
      await incrementUsage(userId, USAGE_TYPES.MESSAGE);
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
      if (window.innerWidth > 768) inputRef.current?.focus();
      // Refresh usage summary after sending a message
      getUsageSummary(userId).then(setUsageSummary).catch(() => {});
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr} ${timeStr}`;
  };

  if (!isOpen) return null;

  const stack = activeProject?.suggestedStack || [];
  const messages = activeProject?.messages || [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background-dark px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {!showSidebar && (
              <button
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground mr-1 sm:mr-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-400/10 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
                {activeProject ? activeProject.name : "My Projects"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
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
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
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
                {/* Only show delete button for saved projects in list (not for current recommended projects) */}
                {!recommendedProjects.some(rec => rec.name === activeProject.name) && (
                  <button
                    onClick={() => setDeleteTarget(activeProject)}
                    className="p-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — Projects List */}
          {showSidebar && (
            <div className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-80 border-r border-border bg-background flex flex-col shrink-0 z-10">
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : (
                  <>
                    {/* Recommended Projects Section */}
                    {recommendedProjects && recommendedProjects.length > 0 && (
                      <div className="border-b border-border">
                        <div className="p-4 pb-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                              Recommended Projects
                            </h2>
                          </div>
                          <div className="space-y-1">
                            {recommendedProjectsData.map((rec, idx) => (
                              <div key={idx} className="group relative">
                                <button
                                  onClick={() => handleSelectRecommendedProject(rec)}
                                  className={`w-full text-left px-3 py-3 pr-9 rounded-md transition-colors ${
                                    activeProject?.name === rec.name
                                      ? "bg-surface border border-accent/30"
                                      : "hover:bg-surface border border-transparent"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                    <p className="text-sm text-foreground truncate">
                                      {rec.name}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1.5 ml-5.5">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-background border border-border text-green-400">
                                      {rec.skill1}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-background border border-border text-blue-400">
                                      {rec.skill2}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-background border border-border text-yellow-400">
                                      {rec.skill3}
                                    </span>
                                  </div>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleRecommendedBookmark(rec);
                                  }}
                                  disabled={savingBookmark}
                                  className={`absolute right-2 top-3 p-1 rounded transition-colors ${
                                    recommendedSaveStatus[rec.name]
                                      ? 'text-yellow-400 hover:text-yellow-500'
                                      : 'text-muted-foreground hover:text-yellow-400 opacity-0 group-hover:opacity-100'
                                  }`}
                                  title={recommendedSaveStatus[rec.name] ? 'Saved' : 'Save project'}
                                >
                                  <Bookmark className={`w-3.5 h-3.5 ${recommendedSaveStatus[rec.name] ? 'fill-current' : ''}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Saved Projects Section */}
                    <div>
                      <div className="p-4 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                              Saved
                            </h2>
                            {usageSummary && usageSummary.planConfig.limits[USAGE_TYPES.PROJECT_CHAT] !== null && (
                              <span className="text-[10px] text-muted-foreground">
                                {projects.length}/{formatLimit(usageSummary.planConfig.limits[USAGE_TYPES.PROJECT_CHAT])}
                              </span>
                            )}
                          </div>
                          
                          {/* Delete menu - only show if there are saved projects */}
                          {projects.length > 0 && (
                            <div className="relative">
                              {bulkDeleteMode ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {selectedProjects.size} selected
                                  </span>
                                  <button
                                    onClick={handleCancelBulkMode}
                                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-surface transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleStartBulkDelete('selected')}
                                    disabled={selectedProjects.size === 0}
                                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-400/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                                    title="Delete options"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  
                                  {showDeleteMenu && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setShowDeleteMenu(false)}
                                      />
                                      <div className="absolute right-0 top-8 z-20 w-48 bg-background border border-border rounded-lg shadow-xl py-1">
                                        <button
                                          onClick={() => {
                                            setBulkDeleteMode(true);
                                            setShowDeleteMenu(false);
                                          }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface hover:text-foreground transition-colors text-left"
                                        >
                                          <CheckSquare className="w-4 h-4" />
                                          Select Projects
                                        </button>
                                        <button
                                          onClick={() => handleStartBulkDelete('all')}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors text-left"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Delete All Saved
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {projects.length === 0 ? (
                          <div className="text-center py-8 px-4">
                            <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground text-xs">
                              No saved projects
                            </p>
                            <p className="text-muted-foreground text-[10px] mt-1">
                              Bookmark projects to save them
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {projects.map((proj) => (
                              <div key={proj.id} className="group relative">
                                <button
                                  onClick={() => bulkDeleteMode ? handleToggleSelectProject(proj.id) : handleSelectProject(proj)}
                                  className={`w-full text-left px-3 py-3 ${bulkDeleteMode ? 'pr-3' : 'pr-8'} rounded-md transition-colors ${
                                    activeProject?.id === proj.id && !bulkDeleteMode
                                      ? "bg-surface border border-accent/30"
                                      : "hover:bg-surface border border-transparent"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {bulkDeleteMode ? (
                                      selectedProjects.has(proj.id) ? (
                                        <CheckSquare className="w-4 h-4 text-accent shrink-0" />
                                      ) : (
                                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                                      )
                                    ) : (
                                      <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0" />
                                    )}
                                    <p className="text-sm text-foreground truncate">
                                      {proj.name}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 ml-5.5">
                                    <p className="text-xs text-muted-foreground">
                                      {proj.messages?.length || 0} messages
                                    </p>
                                    {proj.savedAt && (
                                      <span className="text-xs text-muted-foreground">
                                        · {formatTime(proj.savedAt)}
                                      </span>
                                    )}
                                  </div>
                                </button>
                                {!bulkDeleteMode && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget(proj);
                                    }}
                                    className="absolute right-2 top-3 p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete project"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            {activeProject ? (
              <>
                {/* Collapsible project info */}
                {infoExpanded && (
                  <div className="px-4 sm:px-5 py-4 space-y-4 border-b border-border overflow-y-auto max-h-[50vh] shrink-0 bg-background">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-accent" />
                        <h3 className="text-xs font-semibold text-accent uppercase tracking-wide">
                          Overview
                        </h3>
                      </div>
                      <p className="text-foreground text-sm leading-relaxed">
                        {activeProject.overview ||
                          "Build practical skills and expand your portfolio."}
                      </p>
                    </div>

                    {activeProject.alignment && (
                      <div className="bg-background rounded-lg p-3 border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                          <h3 className="text-xs font-semibold text-yellow-400">
                            Why This Fits You
                          </h3>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {activeProject.alignment}
                        </p>
                      </div>
                    )}

                    {stack.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="w-3.5 h-3.5 text-accent" />
                          <h3 className="text-xs font-semibold text-accent uppercase tracking-wide">
                            Suggested Stack
                          </h3>
                        </div>
                        <div className="space-y-1.5">
                          {stack.map((tech, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 bg-background rounded-lg px-3 py-2 border border-border"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                              <div className="text-sm">
                                <span className="font-medium text-foreground">
                                  {tech.name}
                                </span>
                                <span className="text-muted-foreground mx-1">—</span>
                                <span className="text-muted-foreground">
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-green-400">
                        {activeProject.skill1}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-blue-400">
                        {activeProject.skill2}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-yellow-400">
                        {activeProject.skill3}
                      </span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">
                          Chat about {activeProject.name}
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-md mb-6">
                          Get help planning, building, or learning the
                          technologies for this project.
                        </p>
                        {/* Starter suggestion buttons removed to reduce UI clutter */}
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
                      {chatLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
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
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-border bg-background p-3 sm:p-4 shrink-0">
                  {/* Fallback model notice */}
                  {usingFallback && (
                    <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-md px-3 py-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Free model active — <a href="/pricing" className="underline hover:text-amber-400">upgrade</a> for better responses.</span>
                    </div>
                  )}
                  <div className="max-w-4xl mx-auto relative">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={`Ask about ${activeProject.name}...`}
                      className="w-full pl-4 pr-12 py-3 rounded-md bg-background border border-border text-foreground text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-foreground/60 hover:text-foreground disabled:text-foreground/20 transition-colors"
                    >
                      {chatLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {/* Message usage bar */}
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
                        {Math.round(((usageSummary.usage[USAGE_TYPES.MESSAGE] ?? 0) / usageSummary.planConfig.limits[USAGE_TYPES.MESSAGE]) * 100)}% used
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Empty state — no project selected */
              !showSidebar && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-background border border-border flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Select a Project
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md">
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
          <div className="relative bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Delete Project?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete{" "}
              <span className="text-foreground font-medium">
                "{deleteTarget.name}"
              </span>{" "}
              and its entire chat history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-md border border-border text-foreground hover:bg-surface text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-foreground text-sm transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setBulkDeleteTarget(null)}
          />
          <div className="relative bg-card border border-border rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">
              {bulkDeleteTarget === 'all' 
                ? `Delete All ${projects.length} Projects?` 
                : `Delete ${selectedProjects.size} Project${selectedProjects.size !== 1 ? 's' : ''}?`}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              This will permanently delete the following projects and their entire chat histories:
            </p>
            <div className="max-h-48 overflow-y-auto mb-4 bg-background rounded-lg border border-border p-3">
              <ul className="space-y-1.5">
                {(bulkDeleteTarget === 'all'
                  ? projects 
                  : projects.filter(p => selectedProjects.has(p.id))
                ).map((proj) => (
                  <li key={proj.id} className="flex items-start gap-2 text-sm">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span className="text-foreground font-medium">{proj.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-md border border-border text-foreground hover:bg-surface text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-foreground text-sm transition-colors"
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

