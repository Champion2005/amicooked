import { useNavigate } from 'react-router-dom';
import logo from '@/assets/amicooked_logo.png';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useGitHubSignIn } from '@/hooks/useGitHubSignIn';
import { Flame, Github, Target, TrendingUp, Lightbulb, FolderGit2, BrainCircuit, ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const toast = useToast();
  const { handleGitHubSignIn, loading } = useGitHubSignIn({
    onError: () => toast.error('Failed to sign in with GitHub. Please try again.'),
  });

  return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Nav */}
        <nav className="border-b border-border bg-background-dark">
          <div className="max-w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src={logo} alt="AmICooked" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover" />
              <span className="text-lg sm:text-xl font-bold">AmICooked?</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                  onClick={() => navigate('/pricing')}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border text-xs sm:text-sm transition-colors"
              >
                See Pricing
              </Button>
              <Button
                  onClick={handleGitHubSignIn}
                  disabled={loading}
                  className="bg-primary hover:bg-primary-hover text-foreground text-xs sm:text-sm"
              >
                <Github className="mr-1 sm:mr-2 h-4 w-4" />
                {loading ? 'Signing in...' : 'Sign in with GitHub'}
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 sm:pb-16 text-center">
          <div className="inline-block mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 rounded-md border border-border bg-card text-xs sm:text-sm text-muted-foreground">
            🔥 Stop guessing. Start building what matters.
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4 sm:mb-6">
            Your GitHub is your resume.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
            Is yours getting you hired?
          </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            AmICooked analyzes your GitHub, matches it against real job requirements, and gives you a personalized roadmap of projects and skills to build — so your profile actually lands you interviews.
          </p>
          <Button
              onClick={handleGitHubSignIn}
              disabled={loading}
              className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg bg-primary hover:bg-primary-hover text-foreground rounded-lg"
              size="lg"
          >
            <Github className="mr-2 h-5 w-5" />
            {loading ? 'Signing in...' : 'Analyze My GitHub — Free'}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Takes 30 seconds. We only read your public data.
          </p>
        </section>

        {/* Problem → Solution */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            <Card className="bg-card border-border p-5 sm:p-8">
              <CardContent className="p-0">
                <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wider mb-3">The Problem</h3>
                <h2 className="text-2xl font-bold mb-4">You're applying everywhere and hearing nothing back.</h2>
                <ul className="space-y-3 text-muted-foreground">
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

            <Card className="bg-card border-primary/30 p-5 sm:p-8">
              <CardContent className="p-0">
                <h3 className="text-green-400 font-semibold text-sm uppercase tracking-wider mb-3">The Solution</h3>
                <h2 className="text-2xl font-bold mb-4">A personalized plan to make your GitHub hire-worthy.</h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    Agent scores you across 4 weighted dimensions: Activity, Skill Signals, Growth & Collaboration
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    Analysis adjusts for your education level, experience, and career goal
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    Paste any job description to see exactly where you stand
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    Specific project recommendations chosen to close your top gaps — not generic tutorials
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">How it works</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Connect your GitHub, tell us your goals, and get a deep analysis — scored, explained, and remembered by an agent that stays in context throughout your session.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-card border-border p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4">
                  <BrainCircuit className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">4-Dimensional Scoring</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your commits, repos, languages, and collaboration history are scored across Activity, Skill Signals, Growth, and Collaboration — weighted and calibrated to your career context.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4">
                  <FolderGit2 className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Gap-Targeted Projects</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Project recommendations are generated from your actual gaps and career goal — scoped to your level, using tech that moves the needle for the roles you're targeting.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Job Fit via AI Chat</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Paste any job description into the chat and the agent — already loaded with your full profile — will tell you exactly where you match, where you fall short, and what to do about it.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <Card className="bg-card border-border p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Progress Comparison</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Reanalyze anytime and the agent compares your new scores to your previous assessment — calling out what improved, what stalled, and updating your recommendations accordingly.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4">
                  <Lightbulb className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Context-Aware Agent Chat</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The AI chat runs on a stateful agent — it holds your full GitHub context, your scores, and the conversation history, so every answer is specific to your actual profile, not generic advice.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border p-6">
              <CardContent className="p-0">
                <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4">
                  <Flame className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Sugarcoating</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The agent is calibrated to be brutally honest — scores are anchored to real benchmarks and adjusted for context. You'll know exactly where you stand and why.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="bg-gradient-to-br from-card to-surface border border-border rounded-xl p-6 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Ready to find out if you're <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">cooked</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Connect your GitHub and get a full 4-dimension breakdown, project roadmap, and a context-aware AI ready to answer anything about your profile — in under a minute.
            </p>
            <Button
                onClick={handleGitHubSignIn}
                disabled={loading}
                className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg bg-primary hover:bg-primary-hover text-foreground rounded-lg"
                size="lg"
            >
              <Github className="mr-2 h-5 w-5" />
              {loading ? 'Signing in...' : 'Get My Analysis'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-background-dark">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img src={logo} alt="AmICooked" className="w-8 h-8 rounded-full object-cover" />
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