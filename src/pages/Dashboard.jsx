import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '@/config/firebase';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { fetchGitHubData } from '@/services/github';
import { analyzeCookedLevel } from '@/services/openrouter';
import { RecommendedProjects } from '@/services/openrouter';
import { getUserProfile } from '@/services/userProfile';
import { Loader2, Flame, User, Edit2 } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/');
      return;
    }

    // Check if user already has a profile
    loadUserProfile(user.uid);
  }, [navigate]);

  const loadUserProfile = async (userId) => {
    try {
      setProfileLoading(true);
      const profile = await getUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
      } else {
        // No profile exists, redirect to profile page
        navigate('/profile', { state: { returnTo: '/dashboard' } });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('github_token');
      if (!token) {
        throw new Error('No GitHub token found');
      }

      // Fetch GitHub data
      const data = await fetchGitHubData(token);

      // Analyze with AI using profile data
      const analysis = await analyzeCookedLevel(data, userProfile);
      const recommendedProjects = await RecommendedProjects(data, userProfile);

      // Navigate to results with data
      navigate('/results', { 
        state: { 
          githubData: data, 
          analysis, 
          userProfile, 
          recommendedProjects
        } 
      });
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#58a6ff]" />
      </div>
    );
  }

  // If no profile, user will be redirected in useEffect
  if (!userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full bg-[#161b22] border-[#30363d]">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <Flame className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <CardTitle className="text-3xl text-center text-white">
            Ready to Analyze!
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            Your profile is complete. Let's see how you measure up!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Summary */}
          <div className="bg-[#1c2128] p-4 rounded-lg border border-[#30363d] space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white flex items-center">
                <User className="w-4 h-4 mr-2 text-[#58a6ff]" />
                Your Profile
              </h3>
              <Link 
                to="/profile" 
                state={{ returnTo: '/dashboard' }}
                className="text-xs text-[#58a6ff] hover:text-[#4a9aee] flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Age:</span>
                <span className="text-white ml-2">{userProfile.age} years</span>
              </div>
              <div>
                <span className="text-gray-400">Education:</span>
                <span className="text-white ml-2">{userProfile.education.replace(/_/g, ' ')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Experience:</span>
                <span className="text-white ml-2">{userProfile.experienceYears.replace(/_/g, ' ')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Career Goal:</span>
                <span className="text-white ml-2">{userProfile.careerGoal}</span>
              </div>
            </div>
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
            disabled={loading}
            className="w-full h-12 text-lg bg-[#238636] hover:bg-[#2ea043] text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing your GitHub...
              </>
            ) : (
              <>
                <Flame className="mr-2 h-5 w-5" />
                Analyze My Profile
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
