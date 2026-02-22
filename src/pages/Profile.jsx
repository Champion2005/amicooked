import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/config/firebase';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { getUserProfile, saveUserProfile } from '@/services/userProfile';
import logo from '@/assets/amicooked_logo.png';
import { Loader2, User, ArrowLeft } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    age: '',
    education: '',
    technicalSkills: '',
    technicalInterests: '',
    hobbies: '',
    careerGoal: '',
    experienceYears: '',
    currentRole: '',
    learningStyle: '',
    collaborationPreference: '',
    jobUrgency: '',
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/');
      return;
    }

    // Load existing profile if available
    loadUserProfile(user.uid);
  }, [navigate]);

  const loadUserProfile = async (userId) => {
    try {
      setProfileLoading(true);
      const profile = await getUserProfile(userId);
      if (profile) {
        setFormData(profile);
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // Validate required fields
    if (!formData.age || !formData.education || !formData.technicalSkills || 
        !formData.experienceYears || !formData.careerGoal || !formData.currentRole) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      // Save raw form data (keep education as the select value e.g. "high_school")
      await saveUserProfile(user.uid, formData);
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
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
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
                  className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  placeholder="e.g., CS Student, Junior Dev, Career Switcher"
                  className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.currentRole}
                  onChange={handleInputChange}
                  disabled={loading}
                />
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
                placeholder="e.g., Full-Stack Developer at FAANG, Startup Founder, Freelance Consultant"
                className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.careerGoal}
                onChange={handleInputChange}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">What's your dream role or career path?</p>
            </div>

            {/* Technical Skills */}
            <div className="space-y-2">
              <label htmlFor="technicalSkills" className="text-sm font-medium text-foreground">
                Technical Skills <span className="text-red-500">*</span>
              </label>
              <textarea
                id="technicalSkills"
                name="technicalSkills"
                rows="2"
                placeholder="e.g., JavaScript, React, Python, SQL, Docker, Git"
                className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={formData.technicalSkills}
                onChange={handleInputChange}
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
              <textarea
                id="technicalInterests"
                name="technicalInterests"
                rows="2"
                placeholder="e.g., Web Dev, Machine Learning, Cloud, Mobile Apps"
                className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={formData.technicalInterests}
                onChange={handleInputChange}
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
                  className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                  className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                placeholder="e.g., Gaming, Photography, Writing, Sports"
                className="w-full px-4 py-3 rounded-md bg-background border border-border text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={formData.hobbies}
                onChange={handleInputChange}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Helps us suggest projects that align with your passions</p>
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
              disabled={loading || !formData.age || !formData.education || !formData.technicalSkills || !formData.experienceYears || !formData.careerGoal || !formData.currentRole}
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
