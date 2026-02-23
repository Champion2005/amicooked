import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/config/firebase';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import TagInput from '@/components/ui/TagInput';
import { getUserProfile, saveUserProfile, getUserPreferences, saveUserPreferences } from '@/services/userProfile';
import { DEV_NICKNAME_MAX_LENGTH } from '@/config/preferences';
import logo from '@/assets/amicooked_logo.png';
import { Loader2, User, ArrowLeft, CreditCard } from 'lucide-react';
import { getUsageSummary } from '@/services/usage';
import { USAGE_TYPES, formatLimit, PERIOD_DAYS } from '@/config/plans';
import { SKILL_SUGGESTIONS, INTEREST_SUGGESTIONS } from '@/config/tagSuggestions';
import { addMemoryItem, MEMORY_TYPES } from '@/services/agentPersistence';

// Character limits for free-text fields
const CHAR_LIMITS = {
  currentRole: 60,
  careerGoal: 120,
  hobbies: 150,
};

/**
 * Normalise a tag field that may arrive from Firestore as a legacy
 * comma-separated string into a proper string[].
 */
function normaliseTags(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Get return path from location state, default to dashboard
  const returnTo = location.state?.returnTo || '/dashboard';
  const resultsData = location.state?.resultsData; // Preserve results data if coming from Results

  // Form state
  const [usageSummary, setUsageSummary] = useState(null);

  // Preferences state (nickname + confetti)
  const [devNickname, setDevNickname] = useState('');
  const [confetti, setConfetti] = useState(true);
  const prefsSnapshot = useRef(null);

  const [formData, setFormData] = useState({
    age: '',
    education: '',
    technicalSkills: [],
    technicalInterests: [],
    hobbies: '',
    careerGoal: '',
    experienceYears: '',
    currentRole: '',
    learningStyle: '',
    collaborationPreference: '',
    jobUrgency: '',
  });

  // Snapshot of last-saved form data to detect unsaved changes
  const savedSnapshot = useRef(null);
  const unsavedToastShown = useRef(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/');
      return;
    }

    // Load existing profile if available
    loadUserProfile(user.uid);

    // Load preferences (nickname + confetti)
    getUserPreferences(user.uid)
      .then((prefs) => {
        setDevNickname(prefs.devNickname ?? '');
        setConfetti(prefs.confetti !== false);
        prefsSnapshot.current = {
          devNickname: prefs.devNickname ?? '',
          confetti: prefs.confetti !== false,
        };
      })
      .catch(() => {});

    // Load usage summary for plan badge & stats
    getUsageSummary(user.uid).then(setUsageSummary).catch(() => {});
  }, [navigate]);

  // Also include prefs in unsaved-changes detection
  useEffect(() => {
    if (!savedSnapshot.current) return;
    const profileDirty = JSON.stringify(formData) !== JSON.stringify(savedSnapshot.current);
    const prefsDirty = prefsSnapshot.current
      ? devNickname !== prefsSnapshot.current.devNickname || confetti !== prefsSnapshot.current.confetti
      : false;
    const dirty = profileDirty || prefsDirty;
    if (dirty && !unsavedToastShown.current) {
      toast.warning('You have unsaved changes');
      unsavedToastShown.current = true;
    }
    if (!dirty) {
      unsavedToastShown.current = false;
    }
  }, [formData, devNickname, confetti, toast]);

  const loadUserProfile = async (userId) => {
    try {
      setProfileLoading(true);
      const profile = await getUserProfile(userId);
      if (profile) {
        // Merge profile into the default shape so missing fields (e.g. after
        // a data reset) fall back to safe defaults instead of undefined.
        const defaults = {
          age: '',
          education: '',
          technicalSkills: [],
          technicalInterests: [],
          hobbies: '',
          careerGoal: '',
          experienceYears: '',
          currentRole: '',
          learningStyle: '',
          collaborationPreference: '',
          jobUrgency: '',
        };
        const normalised = {
          ...defaults,
          ...profile,
          technicalSkills: normaliseTags(profile.technicalSkills),
          technicalInterests: normaliseTags(profile.technicalInterests),
        };
        setFormData(normalised);
        savedSnapshot.current = normalised;
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Enforce character limits on free-text fields
    const limit = CHAR_LIMITS[name];
    setFormData(prev => ({
      ...prev,
      [name]: limit ? value.slice(0, limit) : value
    }));
  };

  // Handler for TagInput fields (technicalSkills / technicalInterests)
  const handleTagChange = (name) => (tags) => {
    setFormData(prev => ({ ...prev, [name]: tags }));
  };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // Validate required fields
    if (!formData.age || !formData.education || !formData.technicalSkills?.length || 
        !formData.experienceYears || !formData.careerGoal || !formData.currentRole) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      // Save raw form data (keep education as the select value e.g. "high_school")
      await saveUserProfile(user.uid, formData);
      // Save preferences (nickname + confetti) alongside the profile
      await saveUserPreferences(user.uid, {
        devNickname: devNickname.trim().slice(0, DEV_NICKNAME_MAX_LENGTH),
        confetti,
      });
      savedSnapshot.current = { ...formData };
      prefsSnapshot.current = { devNickname: devNickname.trim().slice(0, DEV_NICKNAME_MAX_LENGTH), confetti };
      unsavedToastShown.current = false;

      // Push profile updates to agent memory (paid plans, fire-and-forget)
      const planId = usageSummary?.plan || 'free';
      const memoryItems = [];
      if (formData.careerGoal) {
        memoryItems.push({ type: MEMORY_TYPES.GOAL, content: `Career goal: ${formData.careerGoal}`, meta: { source: 'profile-update' } });
      }
      if (formData.currentRole) {
        memoryItems.push({ type: MEMORY_TYPES.INSIGHT, content: `User identifies as: ${formData.currentRole}`, meta: { source: 'profile-update' } });
      }
      if (formData.technicalSkills?.length) {
        memoryItems.push({ type: MEMORY_TYPES.INSIGHT, content: `Technical skills: ${formData.technicalSkills.join(', ')}`, meta: { source: 'profile-update' } });
      }
      if (formData.technicalInterests?.length) {
        memoryItems.push({ type: MEMORY_TYPES.INSIGHT, content: `Interested in: ${formData.technicalInterests.join(', ')}`, meta: { source: 'profile-update' } });
      }
      for (const item of memoryItems) {
        addMemoryItem(user.uid, planId, item).catch(() => {});
      }

      toast.success(isEditing ? 'Profile updated!' : 'Profile saved!');
      
      // If we have results data, pass it back when navigating to results
      if (resultsData && returnTo === '/results') {
        navigate(returnTo, { 
          state: { 
            ...resultsData, 
            userProfile: formData
          } 
        });
      } else {
        navigate(returnTo);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Only allow cancel if they already have a profile
    if (isEditing) {
      // Pass back results data if we have it
      if (resultsData && returnTo === '/results') {
        navigate(returnTo, { state: resultsData });
      } else {
        navigate(returnTo);
      }
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full bg-card border-border">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="AmICooked" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl text-center text-foreground">
            {isEditing ? "Edit Your Profile" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {isEditing 
              ? "Update your information to get better recommendations"
              : "Tell us about yourself so we can provide personalized recommendations"
            }
          </CardDescription>
          {usageSummary && (
            <div className="flex justify-center mt-3">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${usageSummary.planConfig.badge.className}`}>
                {usageSummary.planConfig.badge.label} Plan
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          {/* ─── Plan Usage Card ─── */}
          {usageSummary && (
            <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent" />
                  AI Usage — {usageSummary.planConfig.name} Plan
                </h3>
                {usageSummary.plan === 'free' && (
                  <a href="/pricing" className="text-xs text-accent hover:underline">Upgrade →</a>
                )}
              </div>
              {[
                [USAGE_TYPES.MESSAGE, 'Messages'],
                [USAGE_TYPES.REANALYZE, 'Reanalyzes'],
                [USAGE_TYPES.PROJECT_CHAT, 'Project Chats'],
              ].map(([type, label]) => {
                const limit = usageSummary.planConfig.limits[type] ?? null;
                const current = usageSummary.usage[type] ?? 0;
                const pct = limit === null ? 0 : Math.min(100, (current / limit) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{label}</span>
                      <span>{current} / {formatLimit(limit)}</span>
                    </div>
                    {limit !== null && (
                      <div className="h-1.5 rounded-full bg-background overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 100 ? 'bg-red-500' : 'bg-accent'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Resets every {PERIOD_DAYS} days from your first use.
              </p>
            </div>
          )}

          {/* ─── Required Fields ─── */}
          <div className="space-y-4">
            {/* Row: Age + Experience */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="age" className="text-sm font-medium text-foreground">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="13"
                  max="100"
                  placeholder="e.g., 21"
                  className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.age}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label htmlFor="experienceYears" className="text-sm font-medium text-foreground">
                  Coding Experience <span className="text-red-500">*</span>
                </label>
                <select
                  id="experienceYears"
                  name="experienceYears"
                  className="w-full px-4 py-3 pr-10 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Select experience level</option>
                  <option value="less_than_1">Less than 1 year</option>
                  <option value="1-2">1–2 years</option>
                  <option value="2-3">2–3 years</option>
                  <option value="3-5">3–5 years</option>
                  <option value="5+">5+ years</option>
                </select>
              </div>
            </div>

            {/* Row: Education + Current Status */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="education" className="text-sm font-medium text-foreground">
                  Education Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="education"
                  name="education"
                  className="w-full px-4 py-3 pr-10 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat"
                  value={formData.education}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">Select education level</option>
                  <option value="high_school">High School</option>
                  <option value="undergrad_freshman">Undergrad – Freshman</option>
                  <option value="undergrad_sophomore">Undergrad – Sophomore</option>
                  <option value="undergrad_junior">Undergrad – Junior</option>
                  <option value="undergrad_senior">Undergrad – Senior</option>
                  <option value="graduate">Graduate Student</option>
                  <option value="bootcamp">Bootcamp Graduate</option>
                  <option value="self_taught">Self-Taught</option>
                  <option value="full_time">Full-Time Professional</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="currentRole" className="text-sm font-medium text-foreground">
                  Current Status <span className="text-red-500">*</span>
                </label>
                <input
                  id="currentRole"
                  name="currentRole"
                  type="text"
                  maxLength={CHAR_LIMITS.currentRole}
                  placeholder="e.g., CS Student, Junior Dev, Career Switcher"
                  className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.currentRole}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground text-right">{formData.currentRole.length}/{CHAR_LIMITS.currentRole}</p>
              </div>
            </div>

            {/* Career Goal */}
            <div className="space-y-2">
              <label htmlFor="careerGoal" className="text-sm font-medium text-foreground">
                Career Goal <span className="text-red-500">*</span>
              </label>
              <input
                id="careerGoal"
                name="careerGoal"
                type="text"
                maxLength={CHAR_LIMITS.careerGoal}
                placeholder="e.g., Full-Stack Developer at FAANG, Startup Founder, Freelance Consultant"
                className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.careerGoal}
                onChange={handleInputChange}
                disabled={loading}
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">What's your dream role or career path?</p>
                <p className="text-xs text-muted-foreground">{formData.careerGoal.length}/{CHAR_LIMITS.careerGoal}</p>
              </div>
            </div>

            {/* Technical Skills */}
            <div className="space-y-2">
              <label htmlFor="technicalSkills" className="text-sm font-medium text-foreground">
                Technical Skills <span className="text-red-500">*</span>
              </label>
              <TagInput
                id="technicalSkills"
                tags={formData.technicalSkills}
                onChange={handleTagChange('technicalSkills')}
                suggestions={SKILL_SUGGESTIONS}
                placeholder="e.g., JavaScript, React, Python…"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Languages, frameworks, and tools you have experience with</p>
            </div>
          </div>

          {/* ─── Optional Fields ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">Optional — helps personalize your results</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Technical Interests */}
            <div className="space-y-2">
              <label htmlFor="technicalInterests" className="text-sm font-medium text-foreground">
                Technical Interests
              </label>
              <TagInput
                id="technicalInterests"
                tags={formData.technicalInterests}
                onChange={handleTagChange('technicalInterests')}
                suggestions={INTEREST_SUGGESTIONS}
                placeholder="e.g., Web Dev, Machine Learning, Cloud…"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Areas of tech you're passionate about or want to explore</p>
            </div>

            {/* Row: Learning Style + Work Approach */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="learningStyle" className="text-sm font-medium text-foreground">
                  Learning Style
                </label>
                <select
                  id="learningStyle"
                  name="learningStyle"
                  className="w-full px-4 py-3 pr-10 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat"
                  value={formData.learningStyle}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">How do you learn best?</option>
                  <option value="self_paced">Self-paced / Independent</option>
                  <option value="structured">Structured / Course-driven</option>
                  <option value="project_based">Project-based / Build to learn</option>
                  <option value="hands_on">Hands-on / Trial and error</option>
                  <option value="collaborative">Collaborative / Learn with others</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="collaborationPreference" className="text-sm font-medium text-foreground">
                  Work Approach
                </label>
                <select
                  id="collaborationPreference"
                  name="collaborationPreference"
                  className="w-full px-4 py-3 pr-10 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat"
                  value={formData.collaborationPreference}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">How do you prefer to work?</option>
                  <option value="solo">Mostly solo</option>
                  <option value="small_team">Small team (2–4 people)</option>
                  <option value="large_team">Larger team / org structure</option>
                  <option value="mixed">Flexible / mixed</option>
                </select>
              </div>
            </div>

            {/* Job Search Timeline */}
            <div className="space-y-2">
              <label htmlFor="jobUrgency" className="text-sm font-medium text-foreground">
                Job Search Timeline
              </label>
              <select
                id="jobUrgency"
                name="jobUrgency"
                className="w-full px-4 py-3 pr-10 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_16px_center] bg-no-repeat"
                value={formData.jobUrgency}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="">When are you looking to land a role?</option>
                <option value="exploring">Just exploring — no rush</option>
                <option value="few_months">In the next few months</option>
                <option value="asap">As soon as possible</option>
                <option value="already_employed">Already employed — improving skills</option>
              </select>
              <p className="text-xs text-muted-foreground">Helps us tailor advice for quick wins vs. long-term growth</p>
            </div>

            {/* Hobbies */}
            <div className="space-y-2">
              <label htmlFor="hobbies" className="text-sm font-medium text-foreground">
                Hobbies & Interests
              </label>
              <textarea
                id="hobbies"
                name="hobbies"
                rows="2"
                maxLength={CHAR_LIMITS.hobbies}
                placeholder="e.g., Gaming, Photography, Writing, Sports"
                className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={formData.hobbies}
                onChange={handleInputChange}
                disabled={loading}
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">Helps us suggest projects that align with your passions</p>
                <p className="text-xs text-muted-foreground">{formData.hobbies.length}/{CHAR_LIMITS.hobbies}</p>
              </div>
            </div>
          </div>

          {/* ─── For Fun ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">For Fun</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <label htmlFor="devNickname" className="text-sm font-medium text-foreground">
                Nickname{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <p className="text-xs text-muted-foreground">
                The AI will call you by this name during chats and analysis.
              </p>
              <div className="relative">
                <input
                  id="devNickname"
                  type="text"
                  maxLength={DEV_NICKNAME_MAX_LENGTH}
                  placeholder="e.g., TerminalTerror, CSSWizard…"
                  className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
                  value={devNickname}
                  onChange={(e) => setDevNickname(e.target.value)}
                  disabled={loading}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {devNickname.length}/{DEV_NICKNAME_MAX_LENGTH}
                </span>
              </div>
            </div>

            {/* Confetti toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Confetti on good scores 🎉
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Celebrate when your Cooked Level is Toasted or higher.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={confetti}
                onClick={() => setConfetti((v) => !v)}
                disabled={loading}
                className={`relative flex-shrink-0 w-11 h-6 rounded-full border transition-colors ${
                  confetti
                    ? 'bg-accent border-accent'
                    : 'bg-surface border-border'
                }`}
              >
                <span
                  className={`absolute top-[1px] left-[1px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    confetti ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row gap-3">
            {isEditing && (
              <Button 
                onClick={handleCancel}
                variant="outline"
                disabled={loading}
                className="flex-1 h-11 sm:h-12 text-base sm:text-lg border-border text-muted-foreground hover:text-foreground hover:bg-surface"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSaveProfile}
              disabled={loading || !formData.age || !formData.education || !formData.technicalSkills?.length || !formData.experienceYears || !formData.careerGoal || !formData.currentRole}
              className={`h-11 sm:h-12 text-base sm:text-lg bg-primary hover:bg-primary-hover text-foreground ${!isEditing ? 'w-full' : 'flex-1'}`}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Save Profile & Continue'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
