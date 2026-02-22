import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import logo from "@/assets/amicooked_logo.png";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import {
  Flame,
  Github,
  User,
  GraduationCap,
  Target,
  TrendingUp,
  Send,
  MessageSquare,
  LogOut,
  RefreshCw,
  ChevronDown,
  Info,
  Bookmark,
  CreditCard,
  BarChart2,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import ChatPopup from "@/components/ChatPopup";
import ProjectPopup from "@/components/ProjectPopup";
import SavedProjectsOverlay from "@/components/SavedProjectsOverlay";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import { formatEducation } from "@/utils/formatEducation";
import { isProjectSaved, saveProject, slugify } from "@/services/savedProjects";

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  const { githubData, analysis, userProfile, recommendedProjects } =
  location.state || {};

  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [headerInput, setHeaderInput] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [savedProjectsOpen, setSavedProjectsOpen] = useState(false);
  const [initialProjectId, setInitialProjectId] = useState(null);
  const [savedProjectNames, setSavedProjectNames] = useState(new Set());
  const [metricPopupOpen, setMetricPopupOpen] = useState(false);
  const [statsPopupOpen, setStatsPopupOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Load saved project status for bookmark icons
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId || !recommendedProjects) return;
    const checkSaved = async () => {
      const checks = await Promise.all(
          (recommendedProjects || []).slice(0, 4).map(async (rec) => {
            const saved = await isProjectSaved(userId, rec.name);
            return saved ? rec.name : null;
          })
      );
      setSavedProjectNames(new Set(checks.filter(Boolean)));
    };
    checkSaved();
  }, [recommendedProjects]);

  const refreshSavedStatus = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId || !recommendedProjects) return;
    const checks = await Promise.all(
        (recommendedProjects || []).slice(0, 4).map(async (rec) => {
          const saved = await isProjectSaved(userId, rec.name);
          return saved ? rec.name : null;
        })
    );
    setSavedProjectNames(new Set(checks.filter(Boolean)));
  };

  const handleCardBookmark = async (e, rec) => {
    e.stopPropagation();
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    try {
      await saveProject(userId, rec);
      setSavedProjectNames(prev => new Set([...prev, rec.name]));
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleProjectCardClick = (rec) => {
    const slugId = slugify(rec.name);
    setInitialProjectId(slugId);
    setSavedProjectsOpen(true);
  };

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
          profileMenuRef.current &&
          !profileMenuRef.current.contains(e.target)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll whenever any popup/overlay is open
  useEffect(() => {
    const anyOpen =
      chatOpen ||
      !!selectedProject ||
      showReanalyzeConfirm ||
      showSignOutConfirm ||
      savedProjectsOpen ||
      metricPopupOpen ||
      statsPopupOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [chatOpen, selectedProject, showReanalyzeConfirm, showSignOutConfirm, savedProjectsOpen, metricPopupOpen, statsPopupOpen]);

  useEffect(() => {
    if (!githubData || !analysis) {
      navigate("/dashboard");
    }
  }, [githubData, analysis, navigate]);

  // Guard: return early if data isn't available yet (prevents crashes before redirect)
  if (!githubData || !analysis) {
    return null;
  }

  const handleReanalyze = () => {
    setShowReanalyzeConfirm(false);
    navigate("/dashboard", { state: { reanalyze: true } });
  };

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    try {
      await signOut(auth);
      localStorage.removeItem("github_token");
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Single source of truth for the category score breakdown UI
  const renderBreakdown = () => {
    if (!analysis.categoryScores) return null;
    const categories = [
      { key: "activity",      label: "Activity",      cssColor: "#3b82f6", textColor: "text-cat-activity" },
      { key: "skillSignals",  label: "Skill Signals", cssColor: "#a855f7", textColor: "text-cat-skills"   },
      { key: "growth",        label: "Growth",        cssColor: "#22c55e", textColor: "text-cat-growth"   },
      { key: "collaboration", label: "Collaboration", cssColor: "#eab308", textColor: "text-cat-collab"  },
    ];
    const ringColor =
      analysis.cookedLevel >= 9 ? "#22c55e" :
      analysis.cookedLevel >= 7 ? "#eab308" :
      analysis.cookedLevel >= 5 ? "#f97316" :
      analysis.cookedLevel >= 3 ? "#ef4444" : "#dc2626";
    return (
      <>
        {/* 2x2 Donut Ring Grid */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          {categories.map(({ key, label, cssColor, textColor }) => {
            const cat = analysis.categoryScores[key];
            if (!cat) return null;
            const size = 88; const strokeW = 7;
            const r = (size - strokeW) / 2;
            const circ = 2 * Math.PI * r;
            const offset = circ * (1 - cat.score / 100);
            const tierLabel = cat.score >= 80 ? "Excellent" : cat.score >= 60 ? "Good" : cat.score >= 40 ? "Fair" : "Needs Work";
            const tierColor = cat.score >= 80 ? "text-green-400" : cat.score >= 60 ? "text-yellow-400" : cat.score >= 40 ? "text-orange-400" : "text-red-400";
            return (
              <div key={key} className="bg-background rounded-lg border border-border p-4 flex flex-col items-center text-center">
                <div className="relative w-20 h-20 mb-2">
                  <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
                    <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-track" strokeWidth={strokeW} />
                    <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" style={{ stroke: cssColor }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${textColor}`}>{cat.score}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground mb-0.5">{label}</p>
                <p className="text-[10px] text-muted-foreground mb-1">{cat.weight}% weight</p>
                <span className={`text-[10px] font-semibold ${tierColor} px-2 py-0.5 rounded-full bg-surface`}>{tierLabel}</span>
                {cat.notes && <p className="text-[10px] text-muted-foreground mt-2 leading-tight">{cat.notes}</p>}
              </div>
            );
          })}
        </div>
        {/* Overall Score Summary */}
        <div className="bg-background rounded-lg border border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(() => {
              const s = 48; const sw = 4; const rv = (s - sw) / 2;
              const cv = 2 * Math.PI * rv;
              const ov = cv * (1 - analysis.cookedLevel / 10);
              return (
                <div className="relative w-10 h-10 shrink-0">
                  <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-full -rotate-90">
                    <circle cx={s/2} cy={s/2} r={rv} fill="none" className="stroke-track" strokeWidth={sw} />
                    <circle cx={s/2} cy={s/2} r={rv} fill="none" strokeWidth={sw} strokeLinecap="round" strokeDasharray={cv} strokeDashoffset={ov} style={{ stroke: ringColor }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-foreground">{analysis.cookedLevel}</span>
                  </div>
                </div>
              );
            })()}
            <div>
              <p className="text-xs text-muted-foreground">Weighted Total</p>
              <p className={`text-sm font-bold ${getCookedColor(analysis.cookedLevel)}`}>{analysis.levelName}</p>
            </div>
          </div>
          <span className={`text-lg font-bold ${getCookedColor(analysis.cookedLevel)}`}>{analysis.cookedLevel}/10</span>
        </div>
      </>
    );
  };

  const getCookedColor = (level) => {
    if (level >= 9) return "text-level-cooking";
    if (level >= 7) return "text-level-toasted";
    if (level >= 5) return "text-level-cooked";
    if (level >= 3) return "text-level-welldone";
    return "text-level-burnt";
  };



  // Generate contribution heatmap data from GitHub
  const generateHeatmap = () => {
    const weeks = githubData?.contributionCalendar?.weeks || [];
    const days = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
    return { weeks, days };
  };

  const heatmap = useMemo(() => generateHeatmap(), [githubData]);

  // Compute real stats from GitHub data
  const computeStats = () => {
    const calendar = githubData.contributionCalendar;
    const allDays = calendar.weeks.flatMap((w) => w.contributionDays);
    const totalDays = allDays.length;
    const activeDays = allDays.filter((d) => d.contributionCount > 0).length;

    const activityLevel =
        totalDays > 0 ? (activeDays / totalDays).toFixed(2) : "0.00";

    const monthsCovered = Math.max(1, Math.round(totalDays / 30));
    const avgCommitsPerMonth = Math.round(
        calendar.totalContributions / monthsCovered,
    );

    const currentStreak = githubData.streak || 0;

    let longestStreak = 0;
    let tempStreak = 0;
    const chronoDays = calendar.weeks.flatMap((w) => w.contributionDays);
    for (const day of chronoDays) {
      if (day.contributionCount > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    const counts = allDays.map((d) => d.contributionCount);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance =
        counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const consistency =
        mean > 0 ? (1 / (1 + stdDev / mean)).toFixed(2) : "0.00";

    return {
      activityLevel,
      avgCommitsPerMonth,
      currentStreak,
      longestStreak,
      consistency,
    };
  };

  const stats = useMemo(() => computeStats(), [githubData]);

  const statItems = [
    {
      label: "Activity Level",
      value: stats.activityLevel,
      tip: "Ratio of days with at least one contribution over the past year (0–1)",
    },
    {
      label: "Avg Commits / mo",
      value: stats.avgCommitsPerMonth,
      tip: "Average number of contributions per month over the past year",
    },
    {
      label: "Current Streak",
      value: `${stats.currentStreak}d`,
      tip: "Number of consecutive days with contributions up to today",
    },
    {
      label: "Longest Streak",
      value: `${stats.longestStreak}d`,
      tip: "Longest consecutive run of days with at least one contribution",
    },
    {
      label: "Consistency",
      value: stats.consistency,
      tip: "How evenly spread your contributions are — 1.0 = perfectly even, lower = spiky bursts",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background-dark">
        <div className="max-w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
            <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            >
              <img
                  src={logo}
                  alt="AmICooked"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
              />
              <h1 className="text-lg sm:text-2xl font-bold text-foreground hidden sm:block">AmICooked?</h1>
            </button>
            <div className="flex-1 max-w-2xl flex gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                    type="text"
                    placeholder="Ask your AI agent about your profile..."
                    className="w-full px-4 py-2 pr-12 rounded-md bg-background border border-border text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={headerInput}
                    onChange={(e) => setHeaderInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && headerInput.trim()) {
                        setChatQuery(headerInput.trim());
                        setChatOpen(true);
                        setHeaderInput("");
                      }
                    }}
                />
                <button
                    onClick={() => {
                      if (headerInput.trim()) {
                        setChatQuery(headerInput.trim());
                        setChatOpen(true);
                        setHeaderInput("");
                      }
                    }}
                    disabled={!headerInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <button
                  onClick={() => {
                    setChatQuery("");
                    setChatOpen(true);
                  }}
                  className="px-2.5 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface flex items-center gap-1 text-sm shrink-0"
                  title="Chat History"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
            {/* Profile Menu */}
            <div className="relative shrink-0" ref={profileMenuRef}>
              <button
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-full border border-border hover:bg-surface transition-colors"
              >
                <img
                    src={githubData.avatarUrl}
                    alt={githubData.username}
                    className="w-8 h-8 rounded-full"
                />
                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl py-1.5 z-50">

                    {/* Profile */}
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-4 pt-2 pb-1">Profile</p>
                    <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate("/profile", {
                            state: {
                              returnTo: "/results",
                              resultsData: {
                                githubData,
                                analysis,
                                userProfile,
                                recommendedProjects,
                              },
                            },
                          });
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Edit Profile
                    </button>

                    {/* Analysis */}
                    <div className="border-t border-border/50 my-1.5" />
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-4 pb-1">Analysis</p>
                    <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setStatsPopupOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                    >
                      <BarChart2 className="w-4 h-4" />
                      View Statistics
                    </button>
                    <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setShowReanalyzeConfirm(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reanalyze
                    </button>

                    {/* Projects & Account */}
                    <div className="border-t border-border/50 my-1.5" />
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 px-4 pb-1">Projects & Account</p>
                    <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setSavedProjectsOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                    >
                      <Bookmark className="w-4 h-4" />
                      My Projects
                    </button>
                    <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate("/pricing");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pricing
                    </button>

                    {/* Danger zone */}
                    <div className="border-t border-border my-1.5" />
                    <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          setShowSignOutConfirm(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-[90rem] mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Profile */}
            <div className="lg:col-span-3">
              <Card className="bg-background border-none lg:sticky lg:top-8">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center lg:items-start text-center lg:text-left mb-6">
                    <img
                        src={githubData.avatarUrl}
                        alt={githubData.username}
                        className="w-32 sm:w-48 lg:w-64 max-w-full aspect-square rounded-full mb-4 border-2 border-border object-cover"
                    />
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                      {githubData.name || githubData.username}
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-md mb-1">
                      {githubData.username} -{" "}
                      {formatEducation(userProfile?.education) || "Student"}
                    </p>
                    <div className="mt-4">
                      <div className="flex items-center justify-center lg:justify-start gap-2">
                        <p className="text-sm text-muted-foreground">Developer Tier:</p>
                        <p
                            className={`text-sm font-bold ${getCookedColor(
                                analysis.cookedLevel,
                            )}`}
                        >
                          {analysis.levelName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                      variant="outline"
                      className="w-full mb-2 border-border text-foreground hover:bg-surface"
                      onClick={() =>
                          navigate("/profile", {
                            state: {
                              returnTo: "/results",
                              resultsData: {
                                githubData,
                                analysis,
                                userProfile,
                                recommendedProjects,
                              },
                            },
                          })
                      }
                  >
                    Edit Profile
                  </Button>

                  <Button
                      variant="outline"
                      className="w-full mb-2 border-border text-foreground hover:bg-surface"
                      onClick={() => setSavedProjectsOpen(true)}
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    My Projects
                  </Button>

                  <Button
                      variant="outline"
                      className="w-full mb-5 border-border text-foreground hover:bg-surface"
                      onClick={() => setStatsPopupOpen(true)}
                  >
                    <BarChart2 className="w-4 h-4 mr-2" />
                    View Statistics
                  </Button>

                  <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span className="text-muted-foreground">Age:</span>
                      <span className="text-foreground ml-auto">
                      {userProfile?.age || "N/A"}
                    </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-muted-foreground">Education:</span>
                      <span className="text-foreground ml-auto text-xs">
                      {formatEducation(userProfile?.education) || "N/A"}
                    </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Target className="w-4 h-4" />
                      <span className="text-muted-foreground">Goal:</span>
                      <span className="text-foreground ml-auto text-xs">
                      {userProfile?.careerGoal?.substring(0, 20) || "N/A"}
                    </span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-muted-foreground">Experience:</span>
                      <span className="text-foreground ml-auto text-xs">
                      {userProfile?.experienceYears?.replace(/_/g, " ") ||
                          "N/A"}
                    </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-6">
            <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Agent Summary
            </h2>

                <Card className="bg-background pt-5 border-border overflow-hidden">
                  <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-[1fr_auto] gap-4 sm:gap-6 items-start">
                      <p className="text-foreground text-sm sm:text-base break-words min-w-0">
                        {analysis.summary}
                      </p>

                    <div className="flex items-start">
                      {(() => {
                        const size = 96;
                        const strokeW = 6;
                        const r = (size - strokeW) / 2;
                        const circ = 2 * Math.PI * r;
                        const pct = analysis.cookedLevel / 10;
                        const offset = circ * (1 - pct);
                        const ringColor =
                            analysis.cookedLevel >= 9 ? '#22c55e' :
                                analysis.cookedLevel >= 7 ? '#eab308' :
                                    analysis.cookedLevel >= 5 ? '#f97316' :
                                        analysis.cookedLevel >= 3 ? '#ef4444' : '#dc2626';

                        return (
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                                <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
                                  <circle cx={size/2} cy={size/2} r={r} fill="none" className="stroke-track" strokeWidth={strokeW} />
                                  <circle
                                      cx={size/2} cy={size/2} r={r}
                                      fill="none"
                                      strokeWidth={strokeW}
                                      strokeLinecap="round"
                                      strokeDasharray={circ}
                                      strokeDashoffset={offset}
                                      className="transition-all duration-500"
                                      style={{ stroke: ringColor }}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[22px] sm:text-[28px] font-semibold text-foreground">
                              {analysis.cookedLevel}
                            </span>
                                </div>
                              </div>
                              <span className={`text-xs font-semibold ${getCookedColor(analysis.cookedLevel)}`}>
                          {analysis.levelName}
                        </span>
                        {analysis.categoryScores && (
                          <button
                            onClick={() => setMetricPopupOpen(true)}
                            className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors"
                            title="View score breakdown"
                          >
                            <Info className="w-3 h-3" />
                            <span>Breakdown</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

                    {analysis.recommendations &&
                        analysis.recommendations.length > 0 && (
                            <div className="border-t border-border pt-3">
                              <button
                                  onClick={() =>
                                      setShowRecommendations((prev) => !prev)
                                  }
                                  className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover transition-colors cursor-pointer mb-2"
                              >
                                {showRecommendations
                                    ? "See less"
                                    : "See more — Recommended Actions"}
                                <ChevronDown
                                    className={`w-4 h-4 transition-transform duration-200 ${showRecommendations ? "rotate-180" : ""}`}
                                />
                              </button>

                              <div
                                  className={`transition-all duration-300 ease-in-out overflow-hidden ${showRecommendations ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
                              >
                                <ul className="space-y-2 pt-1 pb-2">
                                  {analysis.recommendations.map((rec, idx) => (
                                      <li
                                          key={idx}
                                          className="flex items-start gap-2 text-sm text-muted-foreground"
                                      >
                                        <span className="text-accent mt-0.5">•</span>
                                        <span>{rec}</span>
                                      </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                        )}
                  </CardContent>
            </Card>
            </div>

            <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Recommended Projects
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Chosen by the agent to close your top skill gaps</p>
              </div>
            </div>

                <Card className="bg-background border-border">
                  <CardContent className="px-5 py-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      {(recommendedProjects || []).slice(0, 4).map((rec, idx) => (
                          <div
                              key={idx}
                              className="bg-background p-4 rounded-lg border border-border cursor-pointer hover:bg-card transition-colors group"
                              onClick={() => handleProjectCardClick(rec)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-foreground text-sm">
                                {rec.name}
                              </h3>
                              <button
                                  onClick={(e) => handleCardBookmark(e, rec)}
                                  className={`p-0.5 rounded transition-colors shrink-0 mt-0.5 ${
                                      savedProjectNames.has(rec.name)
                                          ? 'text-yellow-400'
                                          : 'text-muted-foreground group-hover:text-muted-foreground hover:text-yellow-400'
                                  }`}
                                  title={savedProjectNames.has(rec.name) ? 'Saved' : 'Save project'}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${savedProjectNames.has(rec.name) ? 'fill-current' : ''}`} />
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-green-400">
                          {rec.skill1}
                        </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-blue-400">
                          {rec.skill2}
                        </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface border border-border text-yellow-400">
                          {rec.skill3}
                        </span>
                            </div>
                          </div>
                      ))}
                    </div>

                    {analysis.projectsInsight && (
                        <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                          AI Notes: {analysis.projectsInsight}
                        </p>
                    )}
                  </CardContent>
                </Card>
              </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-foreground">GitHub Activity</h2>
                <button
                  onClick={() => setStatsPopupOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  View all statistics
                </button>
              </div>
            <Card className="bg-background border-border w-full">
              <CardContent className="px-5 py-5 flex flex-col md:flex-row gap-0 items-stretch">
                {/* LEFT — HEATMAP (fills remaining space) */}
                <div className="flex-1 min-w-0 pr-0 md:pr-6 flex flex-col justify-center">
                  <div>
                    {heatmap.weeks.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground text-xs">
                            No contribution data available
                          </p>
                        </div>
                    ) : (
                        <>
                          {(() => {
                            // GitHub-exact sizing
                            const CELL = 10;        // 10×10px squares
                            const GAP  = 3;         // 3px gap (matches GitHub)
                            const COL  = CELL + GAP; // 13px per week column
                            const DAY_LABEL_W = 28; // day-label column width
                            const N    = heatmap.weeks.length;
                            const GRID_W = N * COL - GAP; // total cell-grid width

                            // Month labels: one entry per month transition, skipping labels
                            // that are too close to the previous one (mirrors GitHub's behaviour)
                            const MIN_COL_GAP = 3; // minimum columns between labels
                            const monthMarkers = [];
                            heatmap.weeks.forEach((week, col) => {
                              const month = new Date(week.contributionDays[0].date)
                                .toLocaleString("en-US", { month: "short" });
                              if (!monthMarkers.length || monthMarkers[monthMarkers.length - 1].name !== month) {
                                const prev = monthMarkers[monthMarkers.length - 1];
                                if (!prev || col - prev.col >= MIN_COL_GAP) {
                                  monthMarkers.push({ name: month, col });
                                }
                              }
                            });

                            // Only Mon (row 1), Wed (row 3), Fri (row 5) — 0 = Sun
                            const DAY_ROWS = [
                              { label: "Mon", row: 1 },
                              { label: "Wed", row: 3 },
                              { label: "Fri", row: 5 },
                            ];

                            const getColor = (count) => {
                              if (count === 0) return "#161b22";
                              if (count < 3)   return "#0e4429";
                              if (count < 6)   return "#006d32";
                              if (count < 10)  return "#26a641";
                              return "#39d353";
                            };

                            const totalH = 7 * CELL + 6 * GAP; // 82px
                            const MONTH_H = 14; // height reserved for month labels

                            return (
                              <div className="overflow-x-auto pb-1">
                                <div
                                  style={{
                                    width: `${DAY_LABEL_W + GAP + GRID_W}px`,
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {/* Month labels — absolutely positioned over the cell grid */}
                                  <div
                                    className="relative"
                                    style={{
                                      height: `${MONTH_H}px`,
                                      marginLeft: `${DAY_LABEL_W + GAP}px`,
                                      width: `${GRID_W}px`,
                                    }}
                                  >
                                    {monthMarkers.map((m, i) => (
                                      <span
                                        key={i}
                                        className="absolute text-[11px] text-muted-foreground"
                                        style={{ left: `${m.col * COL}px`, top: 0 }}
                                      >
                                        {m.name}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Day labels + cell grid */}
                                  <div className="flex" style={{ gap: `${GAP}px` }}>
                                    {/* Day labels — only Mon/Wed/Fri, positioned at their exact row */}
                                    <div
                                      className="relative shrink-0"
                                      style={{ width: `${DAY_LABEL_W}px`, height: `${totalH}px` }}
                                    >
                                      {DAY_ROWS.map(({ label, row }) => (
                                        <span
                                          key={label}
                                          className="absolute text-[11px] text-muted-foreground"
                                          style={{
                                            top: `${row * COL}px`,
                                            right: 0,
                                            lineHeight: `${CELL}px`,
                                          }}
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>

                                    {/* Cell grid — column-major (week columns) */}
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: `repeat(${N}, ${CELL}px)`,
                                        gridTemplateRows: `repeat(7, ${CELL}px)`,
                                        gap: `${GAP}px`,
                                        gridAutoFlow: "column",
                                      }}
                                    >
                                      {heatmap.weeks.flatMap((week, wi) =>
                                        week.contributionDays.map((day, di) => (
                                          <div
                                            key={`${wi}-${di}`}
                                            title={`${day.contributionCount} contributions on ${day.date}`}
                                            style={{
                                              width: `${CELL}px`,
                                              height: `${CELL}px`,
                                              borderRadius: "2px",
                                              backgroundColor: getColor(day.contributionCount),
                                            }}
                                          />
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  {/* Legend */}
                                  <div className="flex items-center gap-1 mt-2 justify-end">
                                    <span className="text-[11px] text-muted-foreground mr-1">Less</span>
                                    {["#161b22","#0e4429","#006d32","#26a641","#39d353"].map((c) => (
                                      <div key={c} style={{ width: CELL, height: CELL, borderRadius: "2px", backgroundColor: c }} />
                                    ))}
                                    <span className="text-[11px] text-muted-foreground ml-1">More</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>

                {/* RIGHT — STATS */}
                <div className="w-full md:w-[190px] shrink-0 border-t border-border md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0 mt-4 md:mt-0 flex flex-col justify-center">
                  <div className="space-y-[10px] text-xs text-muted-foreground">
                    {[
                      { label: "Commits (365d)", value: githubData.commitsLast365, tip: "Total commit contributions in the last 365 days" },
                      { label: "Active Weeks", value: `${githubData.activeWeeksPct}%`, tip: "% of the past 52 weeks with at least one contribution" },
                      { label: "Streak", value: `${githubData.streak}d`, tip: "Current consecutive days with at least one contribution" },
                      { label: "Velocity Trend", value: githubData.commitVelocityTrend >= 1 ? `↑ ${githubData.commitVelocityTrend}×` : `↓ ${githubData.commitVelocityTrend}×`, tip: "Commits this year ÷ last year — >1 means accelerating" },
                      { label: "Merged PRs", value: `${githubData.mergedPRs} / ${githubData.totalPRs}`, tip: "Merged pull requests out of total PRs opened" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-1">
                          {item.label}
                          <span className="relative group">
                            <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 px-2 py-1.5 text-[10px] text-foreground bg-surface border border-border rounded-md shadow-lg z-10 text-center leading-tight pointer-events-none">
                              {item.tip}
                            </span>
                          </span>
                        </span>
                            <span className="text-foreground font-medium">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Languages */}
              <div className="flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Languages
                </h2>

                <LanguageBreakdown
                  languageBreakdown={githubData.languageBreakdown}
                  totalLanguageBytes={githubData.totalLanguageBytes}
                  languageInsight={analysis.languageInsight}
                />
              </div>

              {/* Employability */}
              <div className="flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Employability
                </h2>

                <Card className="bg-background border-border flex-1 flex flex-col">
                  <CardContent className="py-3 flex flex-col h-full">
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-2">
                        Paste a Job Description:
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Based on your GitHub statistics, we will tell you if
                        you're COOKED or COOKING
                      </p>
                    </div>

                    <textarea
                      placeholder="Enter Text Here..."
                      className="w-full flex-1 min-h-24 px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />

                    <button
                      onClick={() => {
                        if (jobDescription.trim()) {
                          const query = `I want you to evaluate how well my GitHub profile fits this job description. Analyze my strengths and weaknesses relative to the requirements, and provide specific actionable goals I can work on to improve my GitHub and increase my chances of landing this job.\n\nJob Description:\n${jobDescription.trim()}`;
                          setChatQuery(query);
                          setChatOpen(true);
                        }
                      }}
                      disabled={!jobDescription.trim()}
                      className="w-full mt-4 px-4 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm transition-colors"
                    >
                      <Target className="w-4 h-4" />
                      Check Employability
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        </div>

      {/* Chat Popup */}
      <ChatPopup
            isOpen={chatOpen}
            onClose={() => {
              setChatOpen(false);
              setChatQuery("");
            }}
            initialQuery={chatQuery}
            githubData={githubData}
            userProfile={userProfile}
            analysis={analysis}
            onOpenSavedProjects={() => {
              setChatOpen(false);
              setChatQuery("");
              setSavedProjectsOpen(true);
            }}
        />

        {/* Project Detail Popup */}
        <ProjectPopup
            isOpen={!!selectedProject}
            onClose={() => setSelectedProject(null)}
            project={selectedProject}
            githubData={githubData}
            userProfile={userProfile}
            analysis={analysis}
            onSaveChange={refreshSavedStatus}
        />

        {/* My Projects Overlay */}
        <SavedProjectsOverlay
            isOpen={savedProjectsOpen}
            onClose={() => {
              setSavedProjectsOpen(false);
              setInitialProjectId(null);
            }}
            githubData={githubData}
            userProfile={userProfile}
            analysis={analysis}
            recommendedProjects={recommendedProjects || []}
            initialProjectId={initialProjectId}
        />

        {/* Reanalyze Confirmation */}
        {showReanalyzeConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                  onClick={() => setShowReanalyzeConfirm(false)}
              />
              <div className="relative bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Reanalyze Profile?
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  This will re-fetch your GitHub data and run a fresh AI analysis.
                  This may take a moment.
                </p>
                <div className="flex gap-3">
                  <button
                      onClick={() => setShowReanalyzeConfirm(false)}
                      className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-surface text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleReanalyze}
                      className="flex-1 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-foreground text-sm transition-colors"
                  >
                    Reanalyze
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Sign Out Confirmation */}
        {showSignOutConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                  onClick={() => setShowSignOutConfirm(false)}
              />
              <div className="relative bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
                <h3 className="text-lg font-bold text-foreground mb-2">Sign Out?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Are you sure you want to sign out? You'll need to log in again to
                  view your results.
                </p>
                <div className="flex gap-3">
                  <button
                      onClick={() => setShowSignOutConfirm(false)}
                      className="flex-1 px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-surface text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleSignOut}
                      className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
          </div>
        </div>
      )}

      {/* Metric Breakdown Popup */}
      {metricPopupOpen && analysis.categoryScores && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMetricPopupOpen(false)}
          />
          <div className="relative bg-card border border-border rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg text-foreground">Score Breakdown</h3>
              <button
                onClick={() => setMetricPopupOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            {renderBreakdown()}
          </div>
        </div>
      )}

      {/* GitHub Statistics Popup — full screen */}
      {statsPopupOpen && (
        <div className="fixed inset-0 z-50 bg-card flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-xl font-semibold text-foreground">GitHub Statistics</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Every metric fed to the AI to generate your analysis</p>
              </div>
              <button
                onClick={() => setStatsPopupOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto px-8 py-8 space-y-10 w-full mx-auto">

              {/* Score Breakdown — reuses metric popup content */}
              {analysis.categoryScores && (
                <div>
                  <h4 className="text-base font-semibold text-foreground mb-4">Score Breakdown</h4>
                  {renderBreakdown()}
                </div>
              )}

              {/* Activity */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-cat-activity shrink-0" />
                  <h4 className="text-base font-semibold text-foreground">Activity <span className="font-normal text-muted-foreground">(40% of score)</span></h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Commits (365d)", value: githubData.commitsLast365, desc: "Commit contributions this year" },
                    { label: "Commits (90d)", value: githubData.commitsLast90, desc: "Contributions in the last 90 days" },
                    { label: "Prev Year Commits", value: githubData.prevYearCommits, desc: "Commits in the year prior — baseline for velocity" },
                    { label: "Active Weeks", value: `${githubData.activeWeeksPct}%`, desc: "% of 52 weeks with ≥1 contribution" },
                    { label: "Avg / Active Week", value: githubData.avgCommitsPerActiveWeek, desc: "Commits per week when active" },
                    { label: "Std Dev / Week", value: githubData.stdDevPerWeek, desc: "Lower = more consistent cadence" },
                    { label: "Longest Inactive Gap", value: `${githubData.longestInactiveGap}d`, desc: "Longest stretch without a contribution" },
                    { label: "Current Streak", value: `${githubData.streak}d`, desc: "Consecutive days with contributions" },
                    { label: "Total Contributions", value: githubData.totalContributions, desc: "All GitHub contribution events this year" },
                  ].map((s, i) => (
                    <div key={i} className="bg-background border border-border rounded-lg px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-base font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 leading-snug">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skill Signals */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-cat-skills shrink-0" />
                  <h4 className="text-base font-semibold text-foreground">Skill Signals <span className="font-normal text-muted-foreground">(30% of score)</span></h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {[
                    { label: "Language Count", value: githubData.languageCount, desc: "Unique languages across all repos" },
                    { label: "Top Lang Dominance", value: `${githubData.topLanguageDominancePct}%`, desc: "% of codebase bytes in your #1 language" },
                    { label: "Total Language Bytes", value: githubData.totalLanguageBytes?.toLocaleString(), desc: "Total bytes of code across all repos" },
                  ].map((s, i) => (
                    <div key={i} className="bg-background border border-border rounded-lg px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-base font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 leading-snug">{s.desc}</p>
                    </div>
                  ))}
                </div>
                {githubData.languages?.length > 0 && (
                  <div className="bg-background border border-border rounded-lg px-4 py-3 mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Top Languages (by repo count)</p>
                    <div className="flex flex-wrap gap-2">
                      {githubData.languages.map((lang, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-surface border border-border text-muted-foreground">{lang}</span>
                      ))}
                    </div>
                  </div>
                )}
                {githubData.categoryPercentages && Object.keys(githubData.categoryPercentages).length > 0 && (
                  <div className="bg-background border border-border rounded-lg px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-3">Tech Domain Breakdown (% of codebase)</p>
                    <div className="space-y-2">
                      {Object.entries(githubData.categoryPercentages)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, pct], i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-24 capitalize shrink-0">{cat}</span>
                            <div className="flex-1 h-1.5 bg-track rounded-full overflow-hidden">
                              <div className="h-full bg-cat-skills/60 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-foreground w-10 text-right shrink-0">{pct}%</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Growth */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-cat-growth shrink-0" />
                  <h4 className="text-base font-semibold text-foreground">Growth <span className="font-normal text-muted-foreground">(15% of score)</span></h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Velocity Trend", value: `${githubData.commitVelocityTrend}×`, desc: "Commits this year ÷ last year — >1 accelerating" },
                    { label: "Momentum Ratio", value: githubData.activityMomentumRatio, desc: "(Last 90d × 4) ÷ last 365d — >1 ramping up" },
                    { label: "Domain Diversity Δ", value: githubData.domainDiversityChange > 0 ? `+${githubData.domainDiversityChange}` : githubData.domainDiversityChange, desc: "New tech domains explored vs prior year" },
                  ].map((s, i) => (
                    <div key={i} className="bg-background border border-border rounded-lg px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-base font-bold ${
                        s.label === 'Velocity Trend' ? (githubData.commitVelocityTrend >= 1 ? 'text-green-400' : 'text-red-400') :
                        s.label === 'Momentum Ratio' ? (githubData.activityMomentumRatio >= 1 ? 'text-green-400' : 'text-orange-400') :
                        s.label === 'Domain Diversity Δ' ? (githubData.domainDiversityChange > 0 ? 'text-green-400' : githubData.domainDiversityChange < 0 ? 'text-red-400' : 'text-foreground') :
                        'text-foreground'
                      }`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collaboration */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-cat-collab shrink-0" />
                  <h4 className="text-base font-semibold text-foreground">Collaboration <span className="font-normal text-muted-foreground">(15% of score)</span></h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Total PRs", value: githubData.totalPRs, desc: "All pull requests ever opened" },
                    { label: "Merged PRs", value: githubData.mergedPRs, desc: "Pull requests that were merged" },
                    { label: "Open Issues", value: githubData.openIssues, desc: "Currently open issues" },
                    { label: "Closed Issues", value: githubData.closedIssues, desc: "Issues resolved" },
                    { label: "Issues Closed Ratio", value: githubData.issuesClosedRatio, desc: "Closed ÷ (open + 1) — higher is better" },
                  ].map((s, i) => (
                    <div key={i} className="bg-background border border-border rounded-lg px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-base font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repository Overview */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground shrink-0" />
                  <h4 className="text-base font-semibold text-foreground">Repository Overview</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Repos", value: githubData.totalRepos, desc: "Public repos owned" },
                    { label: "Total Stars", value: githubData.totalStars, desc: "Stars received across all repos" },
                    { label: "Total Forks", value: githubData.totalForks, desc: "Times your repos were forked" },
                    { label: "Commits in Repos", value: githubData.totalCommitsInRepos?.toLocaleString(), desc: "Total commits across all repo histories" },
                  ].map((s, i) => (
                    <div key={i} className="bg-background border border-border rounded-lg px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-base font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center pb-2">All data sourced from the GitHub GraphQL API at time of analysis.</p>
            </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-background-dark mt-12">
          <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img
                      src={logo}
                      alt="AmICooked"
                      className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-foreground font-semibold">AmICooked?</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  AI-powered GitHub profile analysis to help you level up your developer career.
                </p>
              </div>

              {/* Resources */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Resources</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a href="https://docs.github.com/en/get-started" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">GitHub Docs</a>
                  </li>
                  <li>
                    <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">Developer Roadmaps</a>
                  </li>
                  <li>
                    <a href="https://github.com/topics/good-first-issue" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">Good First Issues</a>
                  </li>
                  <li>
                    <a href="https://opensource.guide" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">Open Source Guide</a>
                  </li>
                </ul>
              </div>

              {/* Project */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Project</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">GitHub</a>
                  </li>
                  <li>
                    <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">Built with Firebase</a>
                  </li>
                  <li>
                    <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">Powered by OpenRouter</a>
                  </li>
                  <li>
                    <a href="https://github.com/Champion2005/amicooked/issues" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-accent transition-colors">Report a Bug</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">
              © 2026 AmICooked. Built with ❤️ for WinHacks 2026.
            </span>
              <span className="text-muted-foreground text-xs text-center">
              Katarina Mantay, Aditya Patel, Norika Upadhyay
            </span>
            </div>
          </div>
        </footer>
      </div>
  );
}
