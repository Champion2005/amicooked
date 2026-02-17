import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import logo from '@/assets/amicooked_logo.png';
import { auth, githubProvider } from '@/config/firebase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Flame, Github, Target, TrendingUp, Lightbulb, FolderGit2, BrainCircuit, ArrowRight } from 'lucide-react';

export default function Landing() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGitHubSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const credential = result._tokenResponse.oauthAccessToken;
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
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Nav */}
      <nav className="border-b border-[#30363d] bg-[#020408]">
        <div className="max-w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="AmICooked" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" />
            <span className="text-lg sm:text-xl font-bold">AmICooked?</span>
          </div>
          <Button
            onClick={handleGitHubSignIn}
            disabled={loading}
            className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs sm:text-sm"
          >
            <Github className="mr-1 sm:mr-2 h-4 w-4" />
            {loading ? 'Signing in...' : 'Sign in with GitHub'}
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 sm:pb-16 text-center">
        <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 rounded-md border border-[#30363d] bg-[#161b22] text-xs sm:text-sm text-gray-400">
          🔥 Stop guessing. Start building what matters.
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4 sm:mb-6">
          Your GitHub is your resume.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
            Is yours getting you hired?
          </span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
          AmICooked analyzes your GitHub, matches it against real job requirements, and gives you a personalized roadmap of projects and skills to build — so your profile actually lands you interviews.
        </p>
        <Button
          onClick={handleGitHubSignIn}
          disabled={loading}
          className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg"
          size="lg"
        >
          <Github className="mr-2 h-5 w-5" />
          {loading ? 'Signing in...' : 'Analyze My GitHub — Free'}
        </Button>
        <p className="text-xs text-gray-500 mt-4">
          Takes 30 seconds. We only read your public data.
        </p>
      </section>

      {/* Problem → Solution */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          <Card className="bg-[#161b22] border-[#30363d] p-5 sm:p-8">
            <CardContent className="p-0">
              <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wider mb-3">The Problem</h3>
              <h2 className="text-2xl font-bold mb-4">You're applying everywhere and hearing nothing back.</h2>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Your GitHub looks empty or unfocused to recruiters
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  You don't know which skills or projects to prioritize
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Job descriptions list tech you've never touched
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  Tutorial projects aren't cutting it anymore
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#238636]/30 p-5 sm:p-8">
            <CardContent className="p-0">
              <h3 className="text-green-400 font-semibold text-sm uppercase tracking-wider mb-3">The Solution</h3>
              <h2 className="text-2xl font-bold mb-4">A personalized plan to make your GitHub hire-worthy.</h2>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  AI analyzes your profile against industry standards
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  Get project ideas tailored to your career goals
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  Paste any job description and see where you stand
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  Actionable steps to close your skill gaps
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">How it works</h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          Connect your GitHub, tell us your goals, and get a clear picture of where you stand and what to build next.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-[#161b22] border-[#30363d] p-6">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center mb-4">
                <BrainCircuit className="w-6 h-6 text-[#58a6ff]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Profile Analysis</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                We scan your repos, commits, languages, and activity patterns to calculate your "Cooked Level" — a brutally honest score of your GitHub health.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#30363d] p-6">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center mb-4">
                <FolderGit2 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Recommended Projects</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Get project ideas matched to your interests and skill gaps — not generic todo apps, but projects that fill the holes recruiters notice.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#30363d] p-6">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Job Fit Checker</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Paste any job description and instantly see how your GitHub stacks up — plus specific steps to close the gap and increase your chances.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Card className="bg-[#161b22] border-[#30363d] p-6">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Track Your Progress</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Come back anytime to see your contribution heatmap, updated stats, and how your Cooked Level changes as you improve.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#30363d] p-6">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Career Coach</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Chat with an AI that knows your profile inside-out. Ask for advice on what to learn, what to build, or how to position yourself.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#30363d] p-6">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center mb-4">
                <Flame className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Sugarcoating</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                We tell you exactly where you stand. Whether you're cooking or cooked, you'll know — and you'll know how to fix it.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="bg-gradient-to-br from-[#161b22] to-[#1c2128] border border-[#30363d] rounded-xl p-6 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Ready to find out if you're <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">cooked</span>?
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto mb-8">
            Connect your GitHub and get your personalized analysis in under a minute. It's free, fast, and might just save your job search.
          </p>
          <Button
            onClick={handleGitHubSignIn}
            disabled={loading}
            className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg"
            size="lg"
          >
            <Github className="mr-2 h-5 w-5" />
            {loading ? 'Signing in...' : 'Get My Analysis'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#30363d] bg-[#020408]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={logo} alt="AmICooked" className="w-8 h-8 rounded-full object-cover" />
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
