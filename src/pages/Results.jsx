import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Flame, Github, User, GraduationCap, Target, TrendingUp, Send, MessageSquare } from 'lucide-react';
import ChatPopup from '@/components/ChatPopup';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  

  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [headerInput, setHeaderInput] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  useEffect(() => {
    if (!githubData || !analysis) {
      navigate('/dashboard');
    }
  }, [githubData, analysis, navigate]);
  const { githubData, analysis, userProfile, recommendedProjects } = location.state || {};

  if (!githubData || !analysis) {
  if (!githubData || !analysis || !recommendedProjects) {
    navigate('/dashboard');
    return null;
  }

  const getCookedColor = (level) => {
    if (level <= 2) return 'text-green-500';
    if (level <= 4) return 'text-yellow-500';
    if (level <= 6) return 'text-orange-500';
    if (level <= 8) return 'text-red-500';
    return 'text-red-600';
  };

  const getLanguageStatus = (index) => {
    const statuses = ['Seasoned', 'Cooked', 'Warming Up', 'Raw'];
    return statuses[index % statuses.length];
  };

  const getStatusColor = (status) => {
    if (status === 'Seasoned') return 'bg-blue-500';
    if (status === 'Cooked') return 'bg-yellow-500';
    if (status === 'Warming Up') return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Generate contribution heatmap data from GitHub
  const generateHeatmap = () => {
    // console.log('Full GitHub Data:', githubData);
    // console.log('Available keys:', Object.keys(githubData || {}));
    // console.log('Contribution Calendar:', githubData?.contributionCalendar);

    const weeks = githubData.contributionCalendar.weeks;
    const days = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
    
    // console.log('Weeks data:', weeks);
    // console.log('First week:', weeks[0]);
    
    return { weeks, days };
  };

  const heatmap = generateHeatmap();

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#020408]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">AmICooked?</h1>
          </div>
          <div className="flex-1 max-w-2xl mx-8 flex gap-2">
            <input
              type="text"
              placeholder="Ask AI Anything about your profile..."
              className="flex-1 px-4 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
              value={headerInput}
              onChange={(e) => setHeaderInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && headerInput.trim()) {
                  setChatQuery(headerInput.trim());
                  setChatOpen(true);
                  setHeaderInput('');
                }
              }}
            />
            <button
              onClick={() => {
                if (headerInput.trim()) {
                  setChatQuery(headerInput.trim());
                  setChatOpen(true);
                  setHeaderInput('');
                }
              }}
              disabled={!headerInput.trim()}
              className="px-4 py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" />
              Ask
            </button>
            <button
              onClick={() => {
                setChatQuery('');
                setChatOpen(true);
              }}
              className="px-3 py-2 rounded-md border border-[#30363d] text-gray-400 hover:text-white hover:bg-[#1c2128] flex items-center gap-1 text-sm"
              title="Chat History"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-8xlf mx-auto px-10 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Profile */}
          <div className="col-span-3">
            <Card className="bg-[#0d1116] border-none sticky top-8">
              <CardContent className="pt-6">
                <div className="flex flex-col text-center mb-6">
                  <img 
                    src={githubData.avatarUrl} 
                    alt={githubData.username}
                    className="w-78 h-78 rounded-full mb-4 border-4 border-[#30363d]"
                  />
                  <h2 className="text-2xl text-left font-bold text-white mb-1">{githubData.name || githubData.username}</h2>
                  <p className="text-gray-400 text-left text-md mb-1">{githubData.username} - {userProfile?.education?.replace(/_/g, ' ') || 'Student'}</p>
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-400">Cooked Level:</p>
                      <p className={`text-sm font-bold ${getCookedColor(analysis.cookedLevel)}`}>
                        {analysis.levelName}
                      </p>
                    </div>

                  </div>
                </div>

                <Button
                    variant="outline"
                    className="w-full mb-5 border-[#30363d] text-white hover:bg-[#1c2128]"
                    onClick={() => navigate('/profile', { state: { returnTo: '/results', resultsData: { githubData, analysis, userProfile } } })}
                >
                  Edit Profile
                </Button>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3 text-gray-300">
                    <User className="w-4 h-4" />
                    <span className="text-gray-500">Age:</span>
                    <span className="text-white ml-auto">{userProfile?.age || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-gray-500">Education:</span>
                    <span className="text-white ml-auto text-xs">{userProfile?.education?.replace(/_/g, ' ') || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Target className="w-4 h-4" />
                    <span className="text-gray-500">Goal:</span>
                    <span className="text-white ml-auto text-xs">{userProfile?.careerGoal?.substring(0, 20) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-gray-500">Experience:</span>
                    <span className="text-white ml-auto text-xs">{userProfile?.experienceYears?.replace(/_/g, ' ') || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-9 pr-8 space-y-6">
            <h2 className="text-lg font-semibold text-white mb-2">AI Summary</h2>

            <Card className="bg-[#0d1117] pt-5 border-[#30363d]">
              <CardContent className="grid grid-cols-[1fr_auto] gap-6 items-center">

                <div className="min-w-0">

                  <p className="text-gray-300 mb-4 break-words">
                    {analysis.summary}
                  </p>

                  <div className="grid grid-cols-2 gap-4">

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-400">Developer Tier:</span>
                      <span className="text-sm text-white">
                        {analysis.levelName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-400">Percentile:</span>
                      <span className="text-sm text-white">
                        {Math.max(10, 100 - analysis.cookedLevel * 10)}st
                      </span>
                    </div>

                  </div>
                </div>

                <div className="flex items-center h-full">
                  <div className="h-[90%] aspect-square rounded-full bg-[#1f2831]" />
                </div>

              </CardContent>
            </Card>






            {/* Recommended Projects */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-white">Recommended Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {recommendedProjects.slice(0, 4).map((rec, idx) => (
                    <div key={idx} className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
                      <h3 className="font-semibold text-white mb-2">{rec.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-green-500">● {rec.skill1}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-blue-500">● {rec.skill2}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-yellow-500">● {rec.skill3}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  AI Notes: {analysis.recommendations[0]?.substring(0, 100)}...
                </p>
              </CardContent>
            </Card>

            {/* Activity Heatmap */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-white">Contribution Activity</CardTitle>
                <CardDescription className="text-gray-400">Last 12 months of GitHub activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {heatmap.weeks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No contribution data available</p>
                      <p className="text-xs text-gray-500 mt-2">Check browser console for debug info</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1">
                        <div className="flex flex-col justify-between text-xs text-gray-400 mr-2 h-[84px]">
                          {heatmap.days.map((day, i) => (
                            <div key={i} className="h-3 leading-3">{day}</div>
                          ))}
                        </div>
                        <div className="flex-1 overflow-x-auto">
                          <div className="flex gap-1">
                            {heatmap.weeks.map((week, weekIndex) => (
                              <div key={weekIndex} className="flex flex-col gap-1">
                                {week.contributionDays.map((day, dayIndex) => {
                                  const getIntensity = (count) => {
                                    if (count === 0) return 'bg-[#0d1117]';
                                    if (count < 3) return 'bg-green-900/60';
                                    if (count < 6) return 'bg-green-700/70';
                                    if (count < 10) return 'bg-green-600/90';
                                    return 'bg-green-500';
                                  };
                                  return (
                                    <div
                                      key={dayIndex}
                                      className={`w-3 h-3 rounded-sm ${getIntensity(day.contributionCount)} border border-[#30363d]`}
                                      title={`${day.contributionCount} contributions on ${day.date}`}
                                    />
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-4">
                        <span>Less</span>
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-sm bg-[#0d1117] border border-[#30363d]"></div>
                          <div className="w-3 h-3 rounded-sm bg-green-900/60 border border-[#30363d]"></div>
                          <div className="w-3 h-3 rounded-sm bg-green-700/70 border border-[#30363d]"></div>
                          <div className="w-3 h-3 rounded-sm bg-green-600/90 border border-[#30363d]"></div>
                          <div className="w-3 h-3 rounded-sm bg-green-500 border border-[#30363d]"></div>
                        </div>
                        <span>More</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-white">Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Frontend:</h3>
                    <div className="space-y-3">
                      {githubData.languages.slice(0, 4).map((lang, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(getLanguageStatus(idx))}`} />
                          <span className="text-gray-300">{lang}</span>
                          <span className="text-gray-500 ml-auto">– {getLanguageStatus(idx)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Backend:</h3>
                    <div className="space-y-3">
                      {['Node.js', 'Java', 'Python', 'C++'].map((lang, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(getLanguageStatus(idx + 1))}`} />
                          <span className="text-gray-300">{lang}</span>
                          <span className="text-gray-500 ml-auto">– {getLanguageStatus(idx + 1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  AI Notes: Your GitHub activity is primarily centered around JavaScript and frontend frameworks.
                </p>
              </CardContent>
            </Card>

            {/* Employability */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-white">Employability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <p className="text-sm text-gray-400 mb-2">Paste in Job Description:</p>
                  <p className="text-xs text-gray-500">Based on your GitHub statistics, we will tell you if you're COOKED or COOKING</p>
                </div>
                <textarea
                  placeholder="Enter Text Here..."
                  className="w-full h-32 px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff] resize-none"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <button
                  onClick={() => {
                    if (jobDescription.trim()) {
                      const query = `I want you to evaluate how well my GitHub profile fits this job description. Analyze my strengths and weaknesses relative to the requirements, give me a clear verdict on whether I'm COOKED or COOKING for this role, and provide specific actionable goals I can work on to improve my GitHub and increase my chances of landing this job.\n\nJob Description:\n${jobDescription.trim()}`;
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

      {/* Chat Popup */}
      <ChatPopup
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setChatQuery('');
        }}
        initialQuery={chatQuery}
        githubData={githubData}
        userProfile={userProfile}
        analysis={analysis}
      />

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#161b22] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-gray-400 text-sm">@AmICooked Copyright 2026</span>
          </div>
          <div className="text-gray-400 text-sm">
            Katarina Mantey, Aditya Patel, Norika Upadhyay
          </div>
        </div>
      </footer>
    </div>
  );
}
