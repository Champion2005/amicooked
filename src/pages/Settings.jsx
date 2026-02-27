import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/config/firebase";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  getUserPreferences,
  saveUserPreferences,
} from "@/services/userProfile";
import { getUsageSummary } from "@/services/usage";
import { deleteAccount, resetAllData } from "@/services/accountDeletion";
import {
  loadAgentState,
  saveAgentIdentity,
  clearAgentMemory,
  toggleAgentMemory,
  deleteMemoryItem,
  AGENT_ICON_MAX_BYTES,
} from "@/services/agentPersistence";
import { hasAgentMemory, hasCustomAgent, getMemoryLimit } from "@/config/plans";
import {
  PERSONALITY_PRESETS,
  CUSTOM_PERSONALITY_ID,
  CUSTOM_PERSONALITY_MAX_LENGTH,
  AGENT_NAME_MAX_LENGTH,
  DEFAULT_AGENT_NAME,
} from "@/config/agentPersonality";
import {
  ROAST_INTENSITY_OPTIONS,
  DEFAULT_ROAST_INTENSITY,
} from "@/config/preferences";
import { USAGE_TYPES, formatLimit, PERIOD_DAYS } from "@/config/plans";
import logo from "@/assets/amicooked_logo.png";
import {
  ArrowLeft,
  User,
  LogOut,
  Trash2,
  Zap,
  CreditCard,
  Loader2,
  AlertTriangle,
  X,
  BrainCircuit,
  Lock,
  Eye,
  EyeOff,
  Upload,
  RotateCcw,
  Copy,
} from "lucide-react";

// ─── Confirmation Modal ───────────────────────────────────────────────────────

/**
 * Generic modal overlay used for sign-out and delete confirmations.
 * @param {{ isOpen: boolean, onClose: () => void, children: React.ReactNode }} props
 */
function Modal({ isOpen, onClose, children }) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();

  // ── Auth — resolved reactively so auth.currentUser is never stale ───────────
  const [user, setUser] = useState(undefined); // undefined = still loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
    });
    return unsub;
  }, []);

  // Redirect once we know the user is not signed in
  useEffect(() => {
    if (user === null) navigate("/");
  }, [user, navigate]);
  const [prefLoading, setPrefLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);

  // ── Preferences form state ──────────────────────────────────────────────────
  const [roastIntensity, setRoastIntensity] = useState(DEFAULT_ROAST_INTENSITY);

  // ── Usage ───────────────────────────────────────────────────────────────────
  const [usageSummary, setUsageSummary] = useState(null);

  // ── Agent ───────────────────────────────────────────────────────────────────
  const [agentLoading, setAgentLoading] = useState(true);
  const [agentState, setAgentState] = useState(null);
  const [agentName, setAgentName] = useState("");
  const [agentPersonality, setAgentPersonality] = useState("");
  const [customPersonality, setCustomPersonality] = useState("");
  const [agentIcon, setAgentIcon] = useState(null);
  const [agentMemoryEnabled, setAgentMemoryEnabled] = useState(true);
  const [savingAgent, setSavingAgent] = useState(false);
  const [showMemoryView, setShowMemoryView] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [deletingMemoryIdx, setDeletingMemoryIdx] = useState(null);
  const [expandedMemoryIdx, setExpandedMemoryIdx] = useState(null);
  const iconInputRef = useRef(null);

  // ── Sign-out confirmation ───────────────────────────────────────────────────
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // ── Delete confirmation (two-step) ──────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState("warn"); // 'warn' | 'confirm'
  const [deleteInput, setDeleteInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ── Reset data confirmation (two-step) ──────────────────────────────────────
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState("warn"); // 'warn' | 'confirm'
  const [resetInput, setResetInput] = useState("");
  const [resettingData, setResettingData] = useState(false);

  // ── Load saved preferences ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getUserPreferences(user.uid)
      .then((prefs) => {
        setRoastIntensity(prefs.roastIntensity ?? DEFAULT_ROAST_INTENSITY);
      })
      .catch(() => {
        toast.error("Could not load your preferences.");
      })
      .finally(() => setPrefLoading(false));
  }, [user]);

  // ── Load usage summary ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    getUsageSummary(user.uid)
      .then(setUsageSummary)
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, [user]);

  // ── Load agent state ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !usageSummary) {
      setAgentLoading(false);
      return;
    }
    const planId = usageSummary.plan || "free";
    loadAgentState(user.uid, planId)
      .then((state) => {
        setAgentState(state);
        if (state) {
          setAgentName(state.identity?.name || "");
          setAgentPersonality(state.identity?.personality || "");
          setCustomPersonality(state.identity?.customPersonality || "");
          setAgentIcon(state.identity?.icon || null);
          setAgentMemoryEnabled(state.memoryEnabled !== false);
        }
      })
      .catch(() => {})
      .finally(() => setAgentLoading(false));
  }, [user, usageSummary]);

  // ── Scroll to #usage anchor on mount ──────────────────────────────────────
  useEffect(() => {
    if (window.location.hash === '#usage') {
      const el = document.getElementById('usage');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Auto-save roast intensity when the user picks a new level */
  const handleRoastIntensityChange = async (id) => {
    setRoastIntensity(id);
    if (!user) return;
    try {
      await saveUserPreferences(user.uid, { roastIntensity: id });
      if (id === 'mild') {
        toast.error('Mild? Really?');
      } else if (id === 'brutal') {
        toast.warning('Good luck!');
      } else {
        toast.success('Roast intensity updated.');
      }
    } catch {
      toast.error('Failed to save roast intensity.');
    }
  };

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    try {
      await signOut(auth);
      sessionStorage.removeItem("github_token");
      navigate("/");
    } catch {
      toast.error("Sign-out failed. Please try again.");
    }
  };

  // ── Agent handlers ─────────────────────────────────────────────────────────

  const planId = usageSummary?.plan || "free";
  const canMemory = hasAgentMemory(planId);
  const canCustom = hasCustomAgent(planId);

  const handleSaveAgentIdentity = async () => {
    if (!user || !canCustom) return;
    setSavingAgent(true);
    try {
      await saveAgentIdentity(user.uid, planId, {
        name: agentName.trim().slice(0, AGENT_NAME_MAX_LENGTH),
        personality: agentPersonality,
        customPersonality:
          agentPersonality === CUSTOM_PERSONALITY_ID
            ? customPersonality.trim().slice(0, CUSTOM_PERSONALITY_MAX_LENGTH)
            : "",
        icon: agentIcon,
      });
      toast.success("Agent identity saved.");
    } catch {
      toast.error("Failed to save agent identity.");
    } finally {
      setSavingAgent(false);
    }
  };

  const handleToggleMemory = async (enabled) => {
    if (!user || !canMemory) return;
    setAgentMemoryEnabled(enabled);
    try {
      await toggleAgentMemory(user.uid, planId, enabled);
    } catch {
      toast.error("Failed to update memory setting.");
      setAgentMemoryEnabled(!enabled);
    }
  };

  const handleClearMemory = async () => {
    if (!user || !canMemory) return;
    setClearingMemory(true);
    try {
      await clearAgentMemory(user.uid, planId);
      setAgentState((prev) => (prev ? { ...prev, memory: [] } : prev));
      setShowClearConfirm(false);
      toast.success("Agent memory cleared.");
    } catch {
      toast.error("Failed to clear memory.");
    } finally {
      setClearingMemory(false);
    }
  };

  const handleDeleteMemoryItem = async (index) => {
    if (!user || !canMemory) return;
    setDeletingMemoryIdx(index);
    try {
      const updated = await deleteMemoryItem(user.uid, planId, index);
      setAgentState((prev) => (prev ? { ...prev, memory: updated } : prev));
      toast.success("Memory item deleted.");
    } catch {
      toast.error("Failed to delete memory item.");
    } finally {
      setDeletingMemoryIdx(null);
    }
  };

  const handleExportMemory = async () => {
    const memories = agentState?.memory || [];
    if (!memories.length) return;
    const text = memories
      .map(
        (m, i) =>
          `[${i + 1}] (${m.type}) ${m.content}${m.createdAt ? ` — ${new Date(m.createdAt).toLocaleDateString()}` : ""}`
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Memories copied to clipboard.");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const handleIconUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > AGENT_ICON_MAX_BYTES) {
      toast.error("Image must be under 256 KB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAgentIcon(reader.result);
    reader.readAsDataURL(file);
  };

  const openDeleteModal = () => {
    setDeleteStep("warn");
    setDeleteInput("");
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteInput !== "DELETE") return;
    setDeletingAccount(true);
    try {
      await deleteAccount();
      // Auth state now cleared — navigate to landing
      navigate("/", { replace: true });
      // Don't toast here: component will unmount and the landing page will show
    } catch (err) {
      setDeletingAccount(false);
      setShowDeleteModal(false);
      if (err.code === "auth/requires-recent-login") {
        toast.error(
          "For security, please sign out and sign back in, then try again.",
        );
      } else {
        toast.error("Account deletion failed. Please try again.");
      }
    }
  };

  const openResetModal = () => {
    setResetStep("warn");
    setResetInput("");
    setShowResetModal(true);
  };

  const handleResetConfirm = async () => {
    if (resetInput !== "RESET") return;
    setResettingData(true);
    try {
      await resetAllData();
      toast.success("All data has been reset. Let's set up your profile again.");
      navigate("/profile", { replace: true });
    } catch {
      setResettingData(false);
      setShowResetModal(false);
      toast.error("Data reset failed. Please try again.");
    }
  };

  // ── Guard — show spinner while Firebase resolves auth state ──────────────
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // ── Guard — null means unauthenticated, redirect handled by effect ─────────
  if (!user) return null;

  const isPaidPlan = usageSummary && usageSummary.plan !== "free";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background-dark">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/results')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src={logo}
              alt="AmICooked"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover"
            />
            <h1 className="text-lg sm:text-xl font-bold text-foreground hidden sm:block">
              Settings
            </h1>
          </button>
          <h1 className="text-lg font-bold text-foreground sm:hidden">
            Settings
          </h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ─── Account ──────────────────────────────────────────────────────── */}
        <section className="bg-background rounded-xl border border-border p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Account</h2>
          </div>
          <div className="space-y-4">
            {/* Avatar + identity */}
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                  className="w-14 h-14 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {user.displayName ?? "GitHub User"}
                </p>
                {user.email && (
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                )}
                {usageSummary && (
                  <span
                    className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${usageSummary.planConfig.badge.className}`}
                  >
                    {usageSummary.planConfig.badge.label} Plan
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  navigate("/profile", { state: { returnTo: "/settings" } })
                }
              >
                <User className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-400 hover:text-red-300"
                onClick={() => setShowSignOutConfirm(true)}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </section>

        {/* ─── AI Agent ─────────────────────────────────────────────────────── */}
        <section className="bg-background rounded-xl border border-border p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Your AI Agent</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {canMemory
              ? "Your agent remembers your goals and progress across sessions."
              : "Upgrade to Student+ to unlock persistent memory and a smarter agent."}
          </p>
          <div className="space-y-6">
            {/* Roast Intensity — available to all plans */}
            {prefLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Roast Intensity
                </label>
                <p className="text-xs text-muted-foreground">
                  Controls how blunt or diplomatic the AI is in your analysis
                  feedback and chat.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {ROAST_INTENSITY_OPTIONS.map((opt) => {
                    const selected = roastIntensity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleRoastIntensityChange(opt.id)}
                        className={`flex flex-col items-start gap-1 px-4 py-3 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:bg-surface"
                        }`}
                      >
                        <span className="text-lg">{opt.emoji}</span>
                        <span className="text-sm font-semibold">
                          {opt.label}
                        </span>
                        <span className="text-xs leading-relaxed">
                          {opt.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {agentLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : !canMemory ? (
              /* ── Free users: locked preview ─────────────────────────────── */
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
                      <BrainCircuit className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {DEFAULT_AGENT_NAME}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        0 memories · stateless
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-8 rounded bg-surface border border-border" />
                    <div className="flex-1 h-8 rounded bg-surface border border-border" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Persistent memory is available on{" "}
                    <button
                      onClick={() => navigate("/pricing")}
                      className="text-accent hover:underline"
                    >
                      Student+ plans
                    </button>
                    .
                  </span>
                </div>
              </div>
            ) : (
              /* ── Paid users: full agent management ──────────────────────── */
              <div className="space-y-6">
                {/* Agent overview */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {agentIcon && canCustom ? (
                      <img
                        src={agentIcon}
                        alt="Agent"
                        className="w-14 h-14 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center">
                        <BrainCircuit className="w-6 h-6 text-accent" />
                      </div>
                    )}
                    {canCustom && (
                      <button
                        type="button"
                        onClick={() => iconInputRef.current?.click()}
                        className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label="Upload agent icon"
                      >
                        <Upload className="w-4 h-4 text-white" />
                      </button>
                    )}
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIconUpload}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {(canCustom && agentName) || DEFAULT_AGENT_NAME}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agentState?.memory?.length || 0} / {getMemoryLimit(planId)}{" "}
                      memories · {agentMemoryEnabled ? "active" : "paused"}
                    </p>
                  </div>
                </div>

                {/* Memory toggle */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Persistent Memory
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, your agent remembers goals, insights, and
                      progress between sessions.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={agentMemoryEnabled}
                    onClick={() => handleToggleMemory(!agentMemoryEnabled)}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full border transition-colors ${
                      agentMemoryEnabled
                        ? "bg-accent border-accent"
                        : "bg-surface border-border"
                    }`}
                  >
                    <span
                      className={`absolute top-[1px] left-[1px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        agentMemoryEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Memory actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowMemoryView((v) => !v)}
                    disabled={!agentState?.memory?.length}
                  >
                    {showMemoryView ? (
                      <EyeOff className="w-4 h-4 mr-2" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    {showMemoryView ? "Hide" : "View"} Memory ({agentState?.memory?.length || 0})
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleExportMemory}
                    disabled={!agentState?.memory?.length}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-400 hover:text-red-300"
                    onClick={() => setShowClearConfirm(true)}
                    disabled={!agentState?.memory?.length}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear Memory
                  </Button>
                </div>

                {/* ── Inline Memory Management ─────────────────────────── */}
                {showMemoryView && agentState?.memory?.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        Memories ({agentState.memory.length} / {getMemoryLimit(planId)})
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 rounded-lg border border-border bg-background/50 p-2">
                      {agentState.memory.map((item, i) => {
                        const badgeColors =
                          item.type === "insight"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : item.type === "summary"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : item.type === "goal"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : "bg-orange-500/10 text-orange-400 border-orange-500/20";
                        const isExpanded = expandedMemoryIdx === i;
                        const truncated = item.content.length > 100;
                        return (
                          <div
                            key={i}
                            className="rounded-lg border border-border bg-card px-3 py-2 text-sm flex items-start gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${badgeColors}`}
                                >
                                  {item.type}
                                </span>
                                {item.createdAt && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-foreground text-xs leading-relaxed">
                                {isExpanded || !truncated
                                  ? item.content
                                  : `${item.content.slice(0, 100)}…`}
                              </p>
                              {truncated && (
                                <button
                                  type="button"
                                  className="text-[10px] text-accent hover:underline mt-0.5"
                                  onClick={() =>
                                    setExpandedMemoryIdx(isExpanded ? null : i)
                                  }
                                >
                                  {isExpanded ? "Show less" : "Show more"}
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              className="flex-shrink-0 p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                              aria-label={`Delete memory item ${i + 1}`}
                              onClick={() => handleDeleteMemoryItem(i)}
                              disabled={deletingMemoryIdx === i}
                            >
                              {deletingMemoryIdx === i ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Custom Agent Identity (Pro+) ─────────────────────────── */}
                {canCustom ? (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Agent Name
                      </p>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={AGENT_NAME_MAX_LENGTH}
                          placeholder="e.g., CodeCoach, DevBuddy…"
                          className="w-full px-4 py-2.5 rounded-md bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                          value={agentName}
                          onChange={(e) => setAgentName(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          {agentName.length}/{AGENT_NAME_MAX_LENGTH}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Personality
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {PERSONALITY_PRESETS.map((p) => {
                          const selected = agentPersonality === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setAgentPersonality(p.id)}
                              className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-all ${
                                selected
                                  ? "border-accent bg-accent/10 text-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:bg-surface"
                              }`}
                            >
                              <span className="text-base">{p.emoji}</span>
                              <span className="text-xs font-semibold">
                                {p.label}
                              </span>
                              <span className="text-[10px] leading-tight">
                                {p.description}
                              </span>
                            </button>
                          );
                        })}
                        {/* Custom option */}
                        <button
                          type="button"
                          onClick={() =>
                            setAgentPersonality(CUSTOM_PERSONALITY_ID)
                          }
                          className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-all ${
                            agentPersonality === CUSTOM_PERSONALITY_ID
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:bg-surface"
                          }`}
                        >
                          <span className="text-base">✏️</span>
                          <span className="text-xs font-semibold">Custom</span>
                          <span className="text-[10px] leading-tight">
                            Write your own personality
                          </span>
                        </button>
                      </div>
                    </div>

                    {agentPersonality === CUSTOM_PERSONALITY_ID && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">
                          Custom Personality Instruction
                        </label>
                        <textarea
                          maxLength={CUSTOM_PERSONALITY_MAX_LENGTH}
                          rows={3}
                          placeholder="Describe how your agent should talk and behave…"
                          className="w-full px-4 py-2.5 rounded-md bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                          value={customPersonality}
                          onChange={(e) => setCustomPersonality(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {customPersonality.length}/
                          {CUSTOM_PERSONALITY_MAX_LENGTH}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleSaveAgentIdentity}
                      disabled={savingAgent}
                      className="w-full"
                    >
                      {savingAgent ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save Agent Identity"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-4">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Custom name, personality &amp; icon available on{" "}
                      <button
                        onClick={() => navigate("/pricing")}
                        className="text-accent hover:underline"
                      >
                        Pro+ plans
                      </button>
                      .
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ─── Usage ────────────────────────────────────────────────────────── */}
        <section id="usage" className="bg-background rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">AI Usage</h2>
          </div>
          {usageSummary && !usageLoading && (
            <p className="text-sm text-muted-foreground mb-4">
              {usageSummary.planConfig.name} Plan &nbsp;·&nbsp; Resets every{" "}
              {PERIOD_DAYS} days
            </p>
          )}
          <div>
            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : usageSummary ? (
              <div className="space-y-4">
                {[
                  [USAGE_TYPES.MESSAGE, "AI Messages"],
                  [USAGE_TYPES.REANALYZE, "Profile Re-Analyses"],
                  [USAGE_TYPES.PROJECT_CHAT, "Saved Projects"],
                ].map(([type, label]) => {
                  const limit = usageSummary.planConfig.limits[type] ?? null;
                  const current = usageSummary.usage[type] ?? 0;
                  const pct =
                    limit === null ? 0 : Math.min(100, (current / limit) * 100);
                  const atLimit = limit !== null && current >= limit;
                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{label}</span>
                        <span
                          className={
                            atLimit
                              ? "text-red-400 font-semibold"
                              : "text-muted-foreground"
                          }
                        >
                          {limit === null ? 'Unlimited' : `${Math.round(pct)}% used`}
                        </span>
                      </div>
                      {limit !== null && (
                        <div className="h-2 rounded-full bg-background overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${atLimit ? "bg-red-500" : "bg-accent"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {limit === null && (
                        <p className="text-xs text-accent">Unlimited</p>
                      )}
                    </div>
                  );
                })}

                {/* Agent Memory usage */}
                {(() => {
                    const memLimit = getMemoryLimit(planId);
                    if (memLimit <= 0) return null;
                    const memCurrent = agentState?.memory?.length ?? 0;
                    const memPct = Math.min(100, (memCurrent / memLimit) * 100);
                    const memAtLimit = memCurrent >= memLimit;
                    return (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-foreground">Agent Memory</span>
                                <span className={memAtLimit ? "text-red-400 font-semibold" : "text-muted-foreground"}>
                                    {Math.round(memPct)}% used
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-background overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${memAtLimit ? "bg-red-500" : "bg-accent"}`}
                                    style={{ width: `${memPct}%` }}
                                />
                            </div>
                        </div>
                    );
                })()}

                {/* Memory disclaimer */}
                {getMemoryLimit(planId) > 0 && (
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    Memory is self-managed by the agent. You can delete individual or all memories in the AI Agent section.
                  </p>
                )}

                {usageSummary.plan === "free" && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      className="w-full border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
                      onClick={() => navigate("/pricing")}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade Plan for Higher Limits
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Could not load usage data.
              </p>
            )}
          </div>
        </section>

        {/* ─── Billing ──────────────────────────────────────────────────────── */}
        <section className="bg-background rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">Billing</h2>
            </div>
            {usageSummary && !usageLoading && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  usageSummary.planConfig.badge.className
                }`}
              >
                {usageSummary.planConfig.badge.label} Plan
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your subscription and payment information.
          </p>
          <div className="space-y-4">
            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : isPaidPlan ? (
              <>
                <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current plan</span>
                    <span className="font-semibold text-foreground">
                      {usageSummary.planConfig.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Billing cycle</span>
                    <span className="font-semibold text-foreground">
                      Monthly
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Next renewal</span>
                    <span className="font-semibold text-foreground">—</span>
                  </div>
                </div>
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-300/80">
                  Full billing management via Stripe is coming soon. Contact
                  support if you need to make changes to your subscription.
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-auto min-h-[2.75rem] py-3"
                    disabled
                  >
                    <CreditCard className="w-4 h-4 mr-2 shrink-0" />
                    Manage Subscription
                    <span className="ml-2 text-xs bg-surface px-1.5 py-0.5 rounded shrink-0">
                      Soon
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-auto min-h-[2.75rem] py-3"
                    disabled
                  >
                    Update Payment Method
                    <span className="ml-2 text-xs bg-surface px-1.5 py-0.5 rounded shrink-0">
                      Soon
                    </span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You're on the{" "}
                  <span className="font-semibold text-foreground">Free</span>{" "}
                  plan. No payment information on file.
                </p>
                <Button
                  variant="outline"
                  className="w-full h-auto min-h-[2.75rem] py-3 border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
                  onClick={() => navigate("/pricing")}
                >
                  <CreditCard className="w-4 h-4 mr-2 shrink-0" />
                  Upgrade to a Paid Plan
                </Button>
              </>
            )}
          </div>
        </section>

        {/* ─── Danger Zone ──────────────────────────────────────────────────── */}
        <section className="bg-background rounded-xl border border-red-900/40 p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          </div>
          <div className="space-y-5">
            {/* Reset All Data */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Reset All Data
              </p>
              <p className="text-sm text-muted-foreground">
                Wipe your profile, usage counters, chats, saved projects,
                analysis results, and agent memory. Your account and
                subscription plan will be preserved.
              </p>
              <Button
                variant="outline"
                className="border-red-900/60 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/60"
                onClick={openResetModal}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All Data
              </Button>
            </div>

            <div className="border-t border-border" />

            {/* Delete Account */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Delete Account
              </p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This
                cannot be undone.
              </p>
              <Button
                variant="outline"
                className="border-red-900/60 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/60"
                onClick={openDeleteModal}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Sign-Out Confirmation Modal ──────────────────────────────────── */}
      <Modal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <LogOut className="w-6 h-6 text-muted-foreground flex-shrink-0" />
            <h2 className="text-lg font-semibold text-foreground">Sign out?</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            You'll need to sign back in with GitHub to access your results and
            analysis history.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowSignOutConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Account Confirmation Modal ────────────────────────────── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deletingAccount) {
            setShowDeleteModal(false);
            setDeleteStep("warn");
            setDeleteInput("");
          }
        }}
      >
        {deleteStep === "warn" ? (
          /* Step 1 — Warning */
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <h2 className="text-lg font-semibold text-foreground">
                Delete your account?
              </h2>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                "All AI chat history will be permanently deleted.",
                "All saved projects and analysis results will be erased.",
                "Your AI agent memory and identity will be wiped.",
                "Your profile and all personal data will be removed from Firestore.",
                "Your GitHub sign-in access will be revoked — you will be signed out immediately.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">✕</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* Extra warning for non-free plans */}
            {isPaidPlan && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm text-yellow-300 space-y-1">
                <p className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  You have an active {usageSummary.planConfig.name} plan.
                </p>
                <p className="text-yellow-300/80">
                  Deleting your account will immediately revoke your plan
                  access. Subscription cancellation will be handled
                  automatically once payment processing is set up.
                </p>
              </div>
            )}

            <p className="text-sm font-semibold text-foreground">
              This action is permanent and cannot be undone.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-muted-foreground hover:text-foreground"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setDeleteStep("confirm")}
              >
                I understand, continue →
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2 — Type DELETE */
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-red-400 flex-shrink-0" />
              <h2 className="text-lg font-semibold text-foreground">
                Confirm deletion
              </h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Type{" "}
              <span className="font-mono font-bold text-red-400">DELETE</span>{" "}
              below to permanently delete your account. There is no going back.
            </p>

            <input
              type="text"
              autoFocus
              placeholder="Type DELETE to confirm"
              className="w-full px-4 py-2.5 rounded-md bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-mono tracking-widest"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              disabled={deletingAccount}
              onKeyDown={(e) => {
                if (e.key === "Enter" && deleteInput === "DELETE")
                  handleDeleteConfirm();
              }}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setDeleteStep("warn");
                  setDeleteInput("");
                }}
                disabled={deletingAccount}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteInput !== "DELETE" || deletingAccount}
                onClick={handleDeleteConfirm}
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Permanently Delete Account"
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Reset All Data Confirmation Modal ────────────────────────────── */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          if (!resettingData) {
            setShowResetModal(false);
            setResetStep("warn");
            setResetInput("");
          }
        }}
      >
        {resetStep === "warn" ? (
          /* Step 1 — Warning */
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <h2 className="text-lg font-semibold text-foreground">
                Reset all data?
              </h2>
            </div>

            <p className="text-sm text-muted-foreground">
              This will wipe everything and give you a completely fresh start.
              The following will be permanently erased:
            </p>

            <ul className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                "All AI chat history and conversations.",
                "All saved projects and bookmarks.",
                "All analysis results and scores.",
                "Your AI agent memory and identity.",
                "Your profile data, preferences, and usage counters.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">✕</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-300/80 space-y-1">
              <p className="font-semibold flex items-center gap-2">
                ✓ What's preserved
              </p>
              <p>
                Your GitHub sign-in and{" "}
                {isPaidPlan
                  ? `${usageSummary.planConfig.name} subscription`
                  : "account"}{" "}
                will remain intact. You'll stay signed in.
              </p>
            </div>

            <p className="text-sm font-semibold text-foreground">
              This action is irreversible.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-muted-foreground hover:text-foreground"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setResetStep("confirm")}
              >
                I understand, continue →
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2 — Type RESET */
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-6 h-6 text-red-400 flex-shrink-0" />
              <h2 className="text-lg font-semibold text-foreground">
                Confirm reset
              </h2>
            </div>

            <p className="text-sm text-muted-foreground">
              Type{" "}
              <span className="font-mono font-bold text-red-400">RESET</span>{" "}
              below to wipe all your data and start fresh.
            </p>

            <input
              type="text"
              autoFocus
              placeholder="Type RESET to confirm"
              className="w-full px-4 py-2.5 rounded-md bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-mono tracking-widest"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              disabled={resettingData}
              onKeyDown={(e) => {
                if (e.key === "Enter" && resetInput === "RESET")
                  handleResetConfirm();
              }}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setResetStep("warn");
                  setResetInput("");
                }}
                disabled={resettingData}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={resetInput !== "RESET" || resettingData}
                onClick={handleResetConfirm}
              >
                {resettingData ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  "Reset All Data"
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>



      {/* ─── Clear Memory Confirmation Modal ──────────────────────────────── */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => !clearingMemory && setShowClearConfirm(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-6 h-6 text-red-400 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-foreground">
              Clear agent memory?
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            This will erase all {agentState?.memory?.length || 0} stored
            memories. Your agent will start fresh — goals, insights, and
            progress tracking will be lost. Chat history is not affected.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShowClearConfirm(false)}
              disabled={clearingMemory}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleClearMemory}
              disabled={clearingMemory}
            >
              {clearingMemory ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clearing…
                </>
              ) : (
                "Clear All Memory"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
