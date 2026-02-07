import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/config/firebase';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { fetchGitHubData } from '@/services/github';
import { analyzeCookedLevel } from '@/services/openrouter';
import { Loader2, Flame } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [githubData, setGithubData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/');
    }
  }, [navigate]);

  const handleAnalyze = async () => {
    if (!userContext.trim()) {
      alert('Please enter your current education/career stage');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        throw new Error('No GitHub token found');
      }

      // Fetch GitHub data
      const data = await fetchGitHubData(token);
      setGithubData(data);

      // Analyze with AI
      const analysis = await analyzeCookedLevel(data, userContext);

      // Navigate to results with data
      navigate('/results', { state: { githubData: data, analysis, userContext } });
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-[#161b22] border-[#30363d]">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <Flame className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <CardTitle className="text-3xl text-center text-white">Let's Analyze Your Profile</CardTitle>
          <CardDescription className="text-center text-gray-400">
            Tell us about your current stage so we can benchmark you properly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="context" className="text-sm font-medium text-gray-300">
              What's your current stage?
            </label>
            <input
              id="context"
              type="text"
              placeholder="e.g., Sophomore CS Student, Junior Developer, Career Switcher"
              className="w-full px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              This helps us compare you against relevant peers
            </p>
          </div>

          <div className="bg-[#1c2128] p-4 rounded-lg border border-[#30363d]">
            <h3 className="font-semibold mb-2 text-yellow-500">⚠️ Fair Warning</h3>
            <p className="text-sm text-gray-300">
              Our AI will be brutally honest. If your profile has gaps, we'll call them out. 
              But don't worry—we'll also give you a clear roadmap to fix them.
            </p>
          </div>

          <Button 
            onClick={handleAnalyze}
            disabled={loading || !userContext.trim()}
            className="w-full h-12 text-lg bg-[#238636] hover:bg-[#2ea043] text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing your GitHub...
              </>
            ) : (
              'Analyze My Profile'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
