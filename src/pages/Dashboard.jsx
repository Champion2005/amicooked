import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import logo from '@/assets/amicooked_logo.png';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { fetchGitHubData } from '@/services/github';
import { analyzeCookedLevel } from '@/services/openrouter';
import { getRecommendedProjects } from '@/services/openrouter';
import { getUserProfile, getAnalysisResults, saveAnalysisResults, getUserPreferences } from '@/services/userProfile';
import { checkLimit, incrementUsage } from '@/services/usage';
import { USAGE_TYPES, formatLimit } from '@/config/plans';
import { Loader2, Flame, User, Edit2, RefreshCw, ArrowRight, BarChart2 } from 'lucide-react';
import { formatEducation } from '@/utils/formatEducation';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [userPreferences, setUserPreferences] = useState({});
  const [status, setStatus] = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  const [reanalyzeUsage, setReanalyzeUsage] = useState(null); // { current, limit }
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const tips = [
    "💡 Tip: Use the AI chat on your results page to ask anything about your profile.",
    "💡 Tip: Paste a job description into the Employability section to see how you stack up.",
    "💡 Tip: Click any recommended project card to see a full breakdown and chat with AI about it.",
    "💡 Tip: You can reanalyze anytime from the profile menu to track your progress.",
    "💡 Tip: Consistency matters more than volume — even small daily commits add up.",
    "💡 Tip: A strong README on your repos can significantly boost your profile impression.",
    "💡 Tip: Don't have many contributions? Focus on quality and learning in your profile description.",
    "💡 Tip: The AI looks for growth over time, so keep contributing and updating your profile regularly.",
    "💡 Tip: If the analysis feels off, try reanalyzing after a few days of new contributions to see the impact!",
    "💡 Tip: Remember, this is just a tool to help you grow. Use the feedback to guide your learning journey, not as a final judgment of your worth as a developer.",
    "💡 Tip: If you encounter any issues or have feedback, please reach out to us. We're here to help you succeed!",
    "💡 Tip: The AI is most effective when it has a complete profile to analyze. Make sure to fill out all sections of your profile for the best insights!",
    "💡 Tip: Don't be discouraged by critical feedback. The AI is designed to help you identify areas for improvement, and every developer has room to grow!",
    "💡 Tip: Use the recommended projects as a starting point for learning new skills and building your portfolio. They're tailored to your profile and career goals!",
    "💡 Tip: Constantly reanalyze your profile to get updated insights, track your progress, and see new features as we roll them out.",
    "💡 Tip: Paid plans unlock persistent agent memory — your AI remembers your goals and tracks your progress between sessions."
  ];

  // Rotate tips while loading
  useEffect(() => {
    if (!loading) return;
    setTipIndex(Math.floor(Math.random() * tips.length));
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [loading]);

  // If coming from reanalyze, skip the cached results check
  const forceReanalyze = location.state?.reanalyze === true;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/');
      return;
    }

    loadUserProfile(user.uid);
    getUserPreferences(user.uid).then(setUserPreferences).catch(() => {});

    if (forceReanalyze) {
      checkLimit(user.uid, USAGE_TYPES.REANALYZE)
        .then(({ current, limit }) => setReanalyzeUsage({ current, limit }))
        .catch(() => {});
    }
  }, [navigate]);

  const loadUserProfile = async (userId) => {
    try {
      setProfileLoading(true);
      const profile = await getUserProfile(userId);
      // Treat a profile as incomplete if essential fields are missing
      // (e.g. after a data reset the doc exists but only has plan + timestamps)
      const isComplete = profile && profile.age && profile.education && profile.experienceYears;

      if (isComplete) {
        setUserProfile(profile);

        // If not reanalyzing, check for cached results
        if (!forceReanalyze) {
          const saved = await getAnalysisResults(userId);
          if (saved) {
            navigate('/results', {
              state: {
                githubData: saved.githubData,
                analysis: saved.analysis,
                userProfile: profile,
                recommendedProjects: saved.recommendedProjects
              },
              replace: true
            });
            return;
          }
        }
      } else {
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
        toast.error('GitHub session expired. Please sign in again.');
        await signOut(auth);
        localStorage.removeItem('github_token');
        navigate('/');
        return;
      }

      // Check reanalyze limit before running
      const userId = auth.currentUser?.uid;
      let analysisModel;
      if (userId) {
        const limitCheck = await checkLimit(userId, USAGE_TYPES.REANALYZE);
        if (!limitCheck.allowed) {
          toast.error(
            `You've used all ${formatLimit(limitCheck.limit)} analyses for this period. Upgrade your plan to continue.`
          );
          setLoading(false);
          return;
        }
        analysisModel = limitCheck.model;
        if (limitCheck.usingFallback) {
          toast.info('Free model active for this analysis — upgrade for better results.');
        }
      }

      setStatus('Connecting to GitHub...');
      await new Promise(r => setTimeout(r, 600));

      setStatus('Pulling your repositories and commit history...');
      const data = await fetchGitHubData(token);

      setStatus('Crunching your contribution data...');
      await new Promise(r => setTimeout(r, 400));

      setStatus('AI is evaluating your profile — this may take a moment...');
      const analysis = await analyzeCookedLevel(data, userProfile, null, analysisModel, userPreferences.roastIntensity, userPreferences.devNickname);

      setStatus('Generating personalized project recommendations...');
      let recommendedProjects = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          recommendedProjects = await getRecommendedProjects(data, userProfile, null, analysisModel);
          break;
        } catch (err) {
          console.warn(`Project recommendations attempt ${attempt}/3 failed:`, err.message);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1000));
          } else {
            throw new Error('Failed to generate project recommendations after 3 attempts. Please try again.');
          }
        }
      }

      setStatus('Saving your results...');
      if (userId) {
        await saveAnalysisResults(userId, { githubData: data, analysis, recommendedProjects });
        await incrementUsage(userId, USAGE_TYPES.REANALYZE);
      }

      setStatus('Done! Redirecting to your results...');
      await new Promise(r => setTimeout(r, 500));

      navigate('/results', { 
        state: { 
          githubData: data, 
          analysis, 
          userProfile, 
          recommendedProjects,
          isNewAnalysis: true,
        } 
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('');
      toast.error('Failed to analyze your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // If no profile, user will be redirected in useEffect
  if (!userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full bg-card border-border">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex justify-center mb-4">
            <button
              onClick={() => navigate("/")}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="AmICooked" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover" />
            </button>
          </div>
          <CardTitle className="text-2xl sm:text-3xl text-center text-foreground">
            {forceReanalyze ? 'Reanalyze Profile' : 'Ready to Analyze!'}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {forceReanalyze
              ? 'Run a fresh analysis or go back to your existing results.'
              : "Your profile is complete. Let's see how you measure up!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          {/* Reanalyze usage */}
          {forceReanalyze && reanalyzeUsage && (
            <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 sm:px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <BarChart2 className="w-4 h-4 text-accent" />
                Reanalyses used this period
              </span>
              <span className="font-semibold text-foreground">
                {reanalyzeUsage.current}
                {reanalyzeUsage.limit !== null && (
                  <span className="text-muted-foreground font-normal"> / {reanalyzeUsage.limit}</span>
                )}
                {reanalyzeUsage.limit === null && (
                  <span className="text-muted-foreground font-normal"> / ∞</span>
                )}
              </span>
            </div>
          )}

          {/* Profile Summary */}
          <div className="bg-surface p-3 sm:p-4 rounded-lg border border-border space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center text-sm sm:text-base">
                <User className="w-4 h-4 mr-2 text-accent" />
                Your Profile
              </h3>
              <Link 
                to="/profile" 
                state={{ returnTo: '/dashboard' }}
                className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Age:</span>
                <span className="text-foreground ml-2">{userProfile.age} years</span>
              </div>
              <div>
                <span className="text-muted-foreground">Education:</span>
                <span className="text-foreground ml-2">{formatEducation(userProfile.education)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Experience:</span>
                <span className="text-foreground ml-2">{userProfile.experienceYears?.replace(/_/g, ' ') || 'Not set'}</span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground">Career Goal:</span>
                <span className="text-foreground ml-2 truncate inline-block max-w-[calc(100%-90px)] align-bottom">
                  {userProfile.careerGoal}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface p-3 sm:p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-2 text-yellow-500">⚠️ Fair Warning</h3>
            <p className="text-sm text-foreground">
              Our AI will be brutally honest. If your profile has gaps, we'll call them out. 
              But don't worry—we'll also give you a clear roadmap to fix them.
            </p>
          </div>

          {loading && (
            <p className="text-xs text-muted-foreground text-center italic transition-opacity duration-500">
              {tips[tipIndex]}
            </p>
          )}

          <Button 
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full h-11 sm:h-12 text-base sm:text-lg bg-primary hover:bg-primary-hover text-foreground"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {status || 'Analyzing...'}
              </>
            ) : (
              <>
                {forceReanalyze ? <RefreshCw className="mr-2 h-5 w-5" /> : <Flame className="mr-2 h-5 w-5" />}
                {forceReanalyze ? 'Reanalyze My Profile' : 'Analyze My Profile'}
              </>
            )}
          </Button>

          {forceReanalyze && !loading && (
            <Button
              onClick={() => navigate('/results')}
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground hover:text-foreground border border-border hover:border-border hover:bg-surface"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Return to existing results
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
