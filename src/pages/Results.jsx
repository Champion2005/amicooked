import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/config/firebase";
import ChatPopup from "@/components/ChatPopup";
import ProjectPopup from "@/components/ProjectPopup";
import { fetchGitHubData } from "@/services/github";
import { analyzeCookedLevel, RecommendedProjects } from "@/services/openrouter";
import { getUserProfile } from "@/services/userProfile";

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
  const profileMenuRef = useRef(null);

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

  const getCookedColor = (level) => {
    if (level >= 9) return "text-green-500";
    if (level >= 7) return "text-yellow-500";
    if (level >= 5) return "text-orange-500";
    if (level >= 3) return "text-red-500";
    return "text-red-600";
  };

  const getLanguageStatus = (lang) => {
    const statuses = ["Seasoned", "Warming Up", "Cooked"];
    if (githubData.frontend[lang] >= 5) return "Seasoned";
    if (githubData.frontend[lang] >= 3) return "Warming Up";
    return "Cooked";
  };

  const getStatusColor = (status) => {
    if (status === "Seasoned") return "bg-yellow-500";
    if (status === "Warming Up") return "bg-orange-500";
    if (status === "Cooked") return "bg-red-500";
  };

  // Generate contribution heatmap data from GitHub
  const generateHeatmap = () => {
    // console.log('Full GitHub Data:', githubData);
    // console.log('Available keys:', Object.keys(githubData || {}));
    // console.log('Contribution Calendar:', githubData?.contributionCalendar);

    const weeks = githubData.contributionCalendar.weeks;
    const days = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

    // console.log('Weeks data:', weeks);
    // console.log('First week:', weeks[0]);

    return { weeks, days };
  };

  const heatmap = generateHeatmap();

  // Compute real stats from GitHub data
  const computeStats = () => {
    const calendar = githubData.contributionCalendar;
    const allDays = calendar.weeks.flatMap((w) => w.contributionDays);
    const totalDays = allDays.length;
    const activeDays = allDays.filter((d) => d.contributionCount > 0).length;

    // Activity level: ratio of active days to total days (0-1)
    const activityLevel =
      totalDays > 0 ? (activeDays / totalDays).toFixed(2) : "0.00";

    // Avg commits per month: total contributions / months covered
    const monthsCovered = Math.max(1, Math.round(totalDays / 30));
    const avgCommitsPerMonth = Math.round(
      calendar.totalContributions / monthsCovered,
    );

    // Current streak (already computed in githubData)
    const currentStreak = githubData.streak || 0;

    // Longest streak
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

    // Consistency: std-dev based — low variance = high consistency
    const counts = allDays.map((d) => d.contributionCount);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance =
      counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    // Normalize: consistency = 1 / (1 + coefficient of variation)
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

  const stats = computeStats();

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
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#020408]">
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
            <h1 className="text-lg sm:text-2xl font-bold text-white hidden sm:block">AmICooked?</h1>
          </button>
          <div className="flex-1 max-w-2xl flex gap-2 min-w-0">
            <input
              type="text"
              placeholder="Ask AI Anything..."
              className="flex-1 min-w-0 px-3 sm:px-4 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
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
              className="px-3 sm:px-4 py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
            <button
              onClick={() => {
                setChatQuery("");
                setChatOpen(true);
              }}
              className="px-3 py-2 rounded-md border border-[#30363d] text-gray-400 hover:text-white hover:bg-[#1c2128] flex items-center gap-1 text-sm shrink-0"
              title="Chat History"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
          {/* Profile Menu */}
          <div className="relative shrink-0" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-full border border-[#30363d] hover:bg-[#1c2128] transition-colors"
            >
              <img
                src={githubData.avatarUrl}
                alt={githubData.username}
                className="w-8 h-8 rounded-full"
              />
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 z-50">
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
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1c2128] hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setShowReanalyzeConfirm(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1c2128] hover:text-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reanalyze
                </button>
                <div className="border-t border-[#30363d] my-1" />
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setShowSignOutConfirm(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Profile */}
          <div className="lg:col-span-3">
            <Card className="bg-[#0d1116] border-none lg:sticky lg:top-8">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left mb-6">
                  <img
                    src={githubData.avatarUrl}
                    alt={githubData.username}
                    className="w-32 sm:w-48 lg:w-64 max-w-full aspect-square rounded-full mb-4 border-2 border-[#30363d] object-cover"
                  />
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {githubData.name || githubData.username}
                  </h2>
                  <p className="text-gray-400 text-sm sm:text-md mb-1">
                    {githubData.username} -{" "}
                    {userProfile?.education?.replace(/_/g, " ") || "Student"}
                  </p>
                  <div className="mt-4">
                    <div className="flex items-center justify-center lg:justify-start gap-2">
                      <p className="text-sm text-gray-400">Developer Tier:</p>
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
                  className="w-full mb-5 border-[#30363d] text-white hover:bg-[#1c2128]"
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

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3 text-gray-300">
                    <User className="w-4 h-4" />
                    <span className="text-gray-500">Age:</span>
                    <span className="text-white ml-auto">
                      {userProfile?.age || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-gray-500">Education:</span>
                    <span className="text-white ml-auto text-xs">
                      {userProfile?.education?.replace(/_/g, " ") || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Target className="w-4 h-4" />
                    <span className="text-gray-500">Goal:</span>
                    <span className="text-white ml-auto text-xs">
                      {userProfile?.careerGoal?.substring(0, 20) || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-gray-500">Experience:</span>
                    <span className="text-white ml-auto text-xs">
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
            <h2 className="text-lg font-semibold text-white mb-2">
              AI Summary
            </h2>

            <Card className="bg-[#0d1117] pt-5 border-[#30363d] overflow-hidden">
              <CardContent className="grid grid-cols-[1fr_auto] gap-4 sm:gap-6 items-start">
                <div className="min-w-0">
                  <p className="text-gray-300 text-sm sm:text-base mb-4 break-words">
                    {analysis.summary}
                  </p>

                  {analysis.recommendations &&
                    analysis.recommendations.length > 0 && (
                      <div>
                        <button
                          onClick={() =>
                            setShowRecommendations((prev) => !prev)
                          }
                          className="flex items-center gap-1.5 text-sm font-semibold text-[#58a6ff] hover:text-[#79c0ff] transition-colors cursor-pointer mb-2"
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
                                className="flex items-start gap-2 text-sm text-gray-300"
                              >
                                <span className="text-[#58a6ff] mt-0.5">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                </div>

                <div className="flex items-start">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                    {/* Progress Ring */}
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(
                              #ef4444 ${analysis.cookedLevel * 36}deg,
                              #1f2831 0deg
                            )`,
                      }}
                    />

                    {/* Inner Circle */}
                    <div className="absolute inset-2 bg-[#0d1117] rounded-full flex flex-col items-center justify-center">
                      <span className="text-[22px] sm:text-[28px] font-semibold text-white">
                        {analysis.cookedLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-lg font-semibold text-white mb-2">
              Recommended Projects
            </h2>

            <Card className="bg-[#0d1117] border-none">
              <CardContent className="p-0 ">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {recommendedProjects.slice(0, 4).map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d] cursor-pointer  hover:bg-[#161b22] transition-colors"
                      onClick={() => setSelectedProject(rec)}
                    >
                      <h3 className="font-semibold text-white mb-2">
                        {rec.name}
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-green-500">
                          ● {rec.skill1}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-blue-500">
                          ● {rec.skill2}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-yellow-500">
                          ● {rec.skill3}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {analysis.projectsInsight && (
                  <p className="text-xs text-gray-500 mt-4">
                    AI Notes: {analysis.projectsInsight}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#0d1117] pt-0 border-[#30363d] w-full">
              <CardContent className="p-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
                {/* LEFT — HEATMAP */}
                <div className="min-w-0 overflow-x-auto">
                  <div className="space-y-1">
                    {heatmap.weeks.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-gray-400 text-xs">
                          No contribution data available
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Month labels */}
                        <div className="ml-[30px] mb-1">
                          <div className="flex">
                            {(() => {
                              const months = [];

                              heatmap.weeks.forEach((week, i) => {
                                const date = new Date(
                                  week.contributionDays[0].date,
                                );
                                const month = date.toLocaleString("en-US", {
                                  month: "short",
                                });

                                if (
                                  !months.length ||
                                  months[months.length - 1].name !== month
                                ) {
                                  months.push({ name: month, weeks: 1 });
                                } else {
                                  months[months.length - 1].weeks++;
                                }
                              });

                              return months.map((m, i) => (
                                <div
                                  key={i}
                                  className="text-[10px] text-gray-500"
                                  style={{
                                    width: `${m.weeks * 14}px`,
                                  }}
                                >
                                  {m.name}
                                </div>
                              ));
                            })()}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex flex-col justify-between mt-3 text-[10px] text-gray-500 h-[84px] shrink-0">
                            {["Mon", "", "Wed", "", "Fri", "", ""].map(
                              (d, i) => (
                                <div key={i}>{d}</div>
                              ),
                            )}
                          </div>

                          {/* Heatmap */}
                          <div className="flex gap-[2px]">
                            {heatmap.weeks.map((week, weekIndex) => (
                                <div
                                  key={weekIndex}
                                  className="flex flex-col gap-[2px]"
                                >
                                  {week.contributionDays.map(
                                    (day, dayIndex) => {
                                      const getIntensity = (count) => {
                                        if (count === 0) return "bg-[#151b23]";
                                        if (count < 3) return "bg-[#023a16]";
                                        if (count < 6) return "bg-[#17682d]";
                                        if (count < 10) return "bg-[#186d2e]";
                                        return "bg-[#57d463]";
                                      };

                                      return (
                                        <div
                                          key={dayIndex}
                                          title={`${day.contributionCount} contributions on ${day.date}`}
                                          className={`w-3 h-3 rounded-[2px] ${getIntensity(
                                            day.contributionCount,
                                          )} transition-transform duration-150 hover:scale-125`}
                                        />
                                      );
                                    },
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* RIGHT — STATS */}
                <div className="mt-0 md:mt-4 w-full md:w-[220px]">
                  <div className="space-y-[6px] pr-3 text-xs text-gray-400">
                    {statItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-1">
                          {item.label}
                          <span className="relative group">
                            <Info className="w-3 h-3 text-gray-600 hover:text-gray-400 cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 px-2 py-1.5 text-[10px] text-gray-200 bg-[#1c2128] border border-[#30363d] rounded-md shadow-lg z-10 text-center leading-tight">
                              {item.tip}
                            </span>
                          </span>
                        </span>
                        <span className="text-white font-medium">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Languages */}
              <div className="flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Languages
                </h2>

                <Card className="bg-[#0d1117] border-[#30363d] flex-1">
                  <CardContent className="py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-3">
                          Frontend:
                        </h3>

                        <div className="space-y-3">
                          {Object.keys(githubData.frontend || {}).length > 0 ? (
                            Object.keys(githubData.frontend || {})
                              .slice(0, 4)
                              .map((lang, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3"
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${getStatusColor(
                                      getLanguageStatus(lang),
                                    )}`}
                                  />
                                  <span className="text-gray-300">{lang}</span>
                                  <span className="text-gray-500 ml-auto">
                                    {getLanguageStatus(lang)}
                                  </span>
                                </div>
                              ))
                          ) : (
                            <p className="text-gray-400 text-sm">
                              No language data available
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-white mb-3">
                          Backend:
                        </h3>

                        <div className="space-y-3">
                          {Object.keys(githubData.backend || {}).length > 0 ? (
                            Object.keys(githubData.backend || {})
                              .slice(0, 4)
                              .map((lang, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3"
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${getStatusColor(
                                      getLanguageStatus(lang),
                                    )}`}
                                  />
                                  <span className="text-gray-300">{lang}</span>
                                  <span className="text-gray-500 ml-auto">
                                    {getLanguageStatus(lang)}
                                  </span>
                                </div>
                              ))
                          ) : (
                            <p className="text-gray-400 text-sm">
                              No language data available
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {analysis.languageInsight && (
                      <>
                        <div className="border-t border-[#30363d] my-3" />

                        <p className="text-xs text-gray-500">
                          AI Notes: {analysis.languageInsight}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Employability */}
              <div className="flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Employability
                </h2>

                <Card className="bg-[#0d1117] border-[#30363d] flex-1">
                  <CardContent className="py-3">
                    <div className="mb-3">
                      <p className="text-sm text-gray-400 mb-2">
                        Paste in Job Description:
                      </p>

                      <p className="text-xs text-gray-500">
                        Based on your GitHub statistics, we will tell you if
                        you're COOKED or COOKING
                      </p>
                    </div>

                    <textarea
                      placeholder="Enter Text Here..."
                      className="w-full h-24 px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff] resize-none"
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
                      className="w-full mt-4 px-4 py-2.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm transition-colors"
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
      />

      {/* Project Detail Popup */}
      <ProjectPopup
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        githubData={githubData}
        userProfile={userProfile}
        analysis={analysis}
      />

      {/* Reanalyze Confirmation */}
      {showReanalyzeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowReanalyzeConfirm(false)}
          />
          <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Reanalyze Profile?
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              This will re-fetch your GitHub data and run a fresh AI analysis.
              This may take a moment.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReanalyzeConfirm(false)}
                className="flex-1 px-4 py-2 rounded-md border border-[#30363d] text-gray-300 hover:bg-[#1c2128] text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReanalyze}
                className="flex-1 px-4 py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-sm transition-colors"
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
          <div className="relative bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Sign Out?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to sign out? You'll need to log in again to
              view your results.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 px-4 py-2 rounded-md border border-[#30363d] text-gray-300 hover:bg-[#1c2128] text-sm transition-colors"
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

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#161b22] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img
                  src={logo}
                  alt="AmICooked"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-white font-semibold">AmICooked?</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                AI-powered GitHub profile analysis to help you level up your developer career.
              </p>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Resources</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="https://docs.github.com/en/get-started" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#58a6ff] transition-colors">GitHub Docs</a>
                </li>
                <li>
                  <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#58a6ff] transition-colors">Developer Roadmaps</a>
                </li>
                <li>
                  <a href="https://github.com/topics/good-first-issue" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#58a6ff] transition-colors">Good First Issues</a>
                </li>
                <li>
                  <a href="https://opensource.guide" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#58a6ff] transition-colors">Open Source Guide</a>
                </li>
              </ul>
            </div>

            {/* Project */}
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Project</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#58a6ff] transition-colors">GitHub</a>
                </li>
                <li>
                  <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#58a6ff] transition-colors">Built with Firebase</a>
                </li>
                <li>
                  <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#58a6ff] transition-colors">Powered by OpenRouter</a>
                </li>
                <li>
                  <a href="https://github.com/Champion2005/amicooked/issues" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#58a6ff] transition-colors">Report a Bug</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#30363d] mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-gray-500 text-xs">
              © 2026 AmICooked. Built with ❤️ for WinHacks 2026.
            </span>
            <span className="text-gray-500 text-xs text-center">
              Katarina Mantay, Aditya Patel, Norika Upadhyay
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
