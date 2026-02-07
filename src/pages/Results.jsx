import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Flame, Github, User, GraduationCap, Target, TrendingUp } from 'lucide-react';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { githubData, analysis, userContext } = location.state || {};

  if (!githubData || !analysis) {
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

  // Generate contribution heatmap data (simplified)
  const generateHeatmap = () => {
    const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    const days = ['Mon', 'Wed', 'Fri'];
    return { months, days };
  };

  const heatmap = generateHeatmap();

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">AmICooked?</h1>
          </div>
          <div className="flex-1 max-w-2xl mx-8">
            <input
              type="text"
              placeholder="Ask AI Anything about your profile..."
              className="w-full px-4 py-2 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Profile */}
          <div className="col-span-3">
            <Card className="bg-[#161b22] border-[#30363d] sticky top-8">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <img 
                    src={githubData.avatarUrl} 
                    alt={githubData.username}
                    className="w-32 h-32 rounded-full mb-4 border-4 border-[#30363d]"
                  />
                  <h2 className="text-2xl font-bold text-white mb-1">{githubData.name || githubData.username}</h2>
                  <p className="text-gray-400 text-sm mb-1">{githubData.username} - {userContext}</p>
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">Cooked Level:</p>
                    <p className={`text-3xl font-bold ${getCookedColor(analysis.cookedLevel)}`}>
                      {analysis.levelName}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3 text-gray-300">
                    <User className="w-4 h-4" />
                    <span className="text-gray-500">Age:</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <GraduationCap className="w-4 h-4" />
                    <span className="text-gray-500">Education:</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Target className="w-4 h-4" />
                    <span className="text-gray-500">End Goal:</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-gray-500">Experience Level:</span>
                  </div>
                </div>

                <Button 
                  variant="outline"
                  className="w-full mt-6 border-[#30363d] text-white hover:bg-[#1c2128]"
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-6 space-y-6">
            {/* AI Summary */}
            <Card className="bg-[#161b22] border-[#30363d]">
              <CardHeader>
                <CardTitle className="text-white">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">{analysis.summary}</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-400">Developer Tier:</p>
                    <p className="text-lg font-semibold text-white">{analysis.levelName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Percentile:</p>
                    <p className="text-lg font-semibold text-white">{Math.max(10, 100 - analysis.cookedLevel * 10)}st</p>
                  </div>
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
                  {analysis.recommendations.slice(0, 4).map((rec, idx) => (
                    <div key={idx} className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
                      <h3 className="font-semibold text-white mb-2">Full Stack Task Manager</h3>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-green-500">● React</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-blue-500">● Node.js</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-[#1c2128] text-yellow-500">● PostgreSQL</span>
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
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex gap-1 text-xs text-gray-400 mb-2">
                    {heatmap.months.map((month, i) => (
                      <div key={i} className="w-16 text-center">{month}</div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <div className="flex flex-col gap-1 text-xs text-gray-400 mr-2">
                      {heatmap.days.map((day, i) => (
                        <div key={i} className="h-3">{day}</div>
                      ))}
                    </div>
                    <div className="flex-1 grid grid-cols-52 gap-1">
                      {Array.from({ length: 156 }).map((_, i) => {
                        const intensity = Math.floor(Math.random() * 5);
                        const colors = ['bg-[#161b22]', 'bg-green-900/30', 'bg-green-700/50', 'bg-green-600/70', 'bg-green-500'];
                        return (
                          <div
                            key={i}
                            className={`h-3 rounded-sm ${colors[intensity]} border border-[#30363d]`}
                          />
                        );
                      })}
                    </div>
                  </div>
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
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Stats */}
          <div className="col-span-3">
            <Card className="bg-[#161b22] border-[#30363d] sticky top-8">
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Activity Level:</h3>
                  <p className="text-2xl font-bold text-white">0.9</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Avg Commits / m:</h3>
                  <p className="text-2xl font-bold text-white">{Math.floor(githubData.totalCommits / 12)}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Momentum:</h3>
                  <p className="text-2xl font-bold text-white">{(githubData.totalContributions / 365).toFixed(1)}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Current Streak:</h3>
                  <p className="text-2xl font-bold text-white">{githubData.streak}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Consistency:</h3>
                  <p className="text-2xl font-bold text-white">0.9</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
