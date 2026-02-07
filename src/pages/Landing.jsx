import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, githubProvider } from '@/config/firebase';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Flame, Github } from 'lucide-react';

export default function Landing() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGitHubSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const credential = result._tokenResponse.oauthAccessToken;
      
      // Store token in localStorage for later use
      localStorage.setItem('github_token', credential);
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Failed to sign in with GitHub. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-[#161b22] border-[#30363d]">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
              <Flame className="w-12 h-12 text-orange-500" />
            </div>
          </div>
          <CardTitle className="text-5xl font-bold mb-4 text-white">
            AmICooked?
          </CardTitle>
          <CardDescription className="text-lg text-gray-400">
            Get a brutally honest reality check on your GitHub portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-300">
              Sign in with GitHub to analyze your development history and discover if your career prospects are "cooked"
            </p>
            <div className="bg-[#1c2128] p-6 rounded-lg border border-[#30363d]">
              <h3 className="font-semibold mb-3 text-white text-lg">What We Analyze:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-left">
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-300">Repository count and commit history</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-300">Contribution streaks and activity patterns</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-300">Stars, forks, and community engagement</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-300">Tech stack diversity (Frontend vs Backend)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-300">Pull requests and code reviews</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-300">AI-powered employability assessment</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleGitHubSignIn} 
            disabled={loading}
            className="w-full h-12 text-lg bg-[#238636] hover:bg-[#2ea043] text-white"
            size="lg"
          >
            <Github className="mr-2 h-5 w-5" />
            {loading ? 'Signing in...' : 'Sign in with GitHub'}
          </Button>
          <p className="text-xs text-center text-gray-500">
            We'll analyze your public GitHub data to generate your "Cooked Level" and personalized improvement roadmap
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
