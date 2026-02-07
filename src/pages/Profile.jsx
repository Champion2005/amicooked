import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/config/firebase';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { getUserProfile, saveUserProfile } from '@/services/userProfile';
import { Loader2, User, ArrowLeft } from 'lucide-react';

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get return path from location state, default to dashboard
  const returnTo = location.state?.returnTo || '/dashboard';

  // Form state
  const [formData, setFormData] = useState({
    age: '',
    education: '',
    technicalInterests: '',
    hobbies: '',
    careerGoal: '',
    experienceYears: '',
    currentRole: ''
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
    if (!formData.age || !formData.education || !formData.technicalInterests || 
        !formData.experienceYears || !formData.careerGoal || !formData.currentRole) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await saveUserProfile(user.uid, formData);
      alert(isEditing ? 'Profile updated successfully!' : 'Profile saved successfully!');
      navigate(returnTo);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Only allow cancel if they already have a profile
    if (isEditing) {
      navigate(returnTo);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#58a6ff]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full bg-[#161b22] border-[#30363d]">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <User className="w-10 h-10 text-[#58a6ff]" />
            </div>
          </div>
          <CardTitle className="text-3xl text-center text-white">
            {isEditing ? "Edit Your Profile" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            {isEditing 
              ? "Update your information to get better recommendations"
              : "Tell us about yourself so we can provide personalized recommendations"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Form */}
          <div className="space-y-4">
            {/* Age */}
            <div className="space-y-2">
              <label htmlFor="age" className="text-sm font-medium text-gray-300">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="13"
                max="100"
                placeholder="e.g., 21"
                className="w-full px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                value={formData.age}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            {/* Education Level */}
            <div className="space-y-2">
              <label htmlFor="education" className="text-sm font-medium text-gray-300">
                Education Level <span className="text-red-500">*</span>
              </label>
              <select
                id="education"
                name="education"
                className="w-full px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                value={formData.education}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="">Select your education level</option>
                <option value="high_school">High School</option>
                <option value="undergrad_freshman">Undergrad - Freshman</option>
                <option value="undergrad_sophomore">Undergrad - Sophomore</option>
                <option value="undergrad_junior">Undergrad - Junior</option>
                <option value="undergrad_senior">Undergrad - Senior</option>
                <option value="graduate">Graduate Student</option>
                <option value="bootcamp">Bootcamp Graduate</option>
                <option value="self_taught">Self-Taught</option>
                <option value="full_time">Full-Time Professional</option>
              </select>
            </div>

            {/* Technical Interests */}
            <div className="space-y-2">
              <label htmlFor="technicalInterests" className="text-sm font-medium text-gray-300">
                Technical Interests <span className="text-red-500">*</span>
              </label>
              <textarea
                id="technicalInterests"
                name="technicalInterests"
                rows="3"
                placeholder="e.g., Web Development, Machine Learning, Cloud Computing, Mobile Apps"
                className="w-full px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff] resize-none"
                value={formData.technicalInterests}
                onChange={handleInputChange}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                List areas of tech you're passionate about or want to work in
              </p>
            </div>

            {/* Years of Experience */}
            <div className="space-y-2">
              <label htmlFor="experienceYears" className="text-sm font-medium text-gray-300">
                Years of Coding Experience <span className="text-red-500">*</span>
              </label>
              <select
                id="experienceYears"
                name="experienceYears"
                className="w-full px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                value={formData.experienceYears}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="">Select experience level</option>
                <option value="less_than_1">Less than 1 year</option>
                <option value="1-2">1-2 years</option>
                <option value="2-3">2-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5+">5+ years</option>
              </select>
            </div>

            {/* Career Goal */}
            <div className="space-y-2">
              <label htmlFor="careerGoal" className="text-sm font-medium text-gray-300">
                Career Goal <span className="text-red-500">*</span>
              </label>
              <input
                id="careerGoal"
                name="careerGoal"
                type="text"
                placeholder="e.g., Full-Stack Developer at FAANG, Startup Founder, Freelance Consultant"
                className="w-full px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                value={formData.careerGoal}
                onChange={handleInputChange}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                What's your dream role or career path?
              </p>
            </div>

            {/* Current Role/Status */}
            <div className="space-y-2">
              <label htmlFor="currentRole" className="text-sm font-medium text-gray-300">
                Current Status <span className="text-red-500">*</span>
              </label>
              <input
                id="currentRole"
                name="currentRole"
                type="text"
                placeholder="e.g., CS Student, Junior Developer, Career Switcher, Actively Job Hunting"
                className="w-full px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                value={formData.currentRole}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            {/* Hobbies (Optional) */}
            <div className="space-y-2">
              <label htmlFor="hobbies" className="text-sm font-medium text-gray-300">
                Hobbies & Interests <span className="text-gray-500">(Optional)</span>
              </label>
              <textarea
                id="hobbies"
                name="hobbies"
                rows="2"
                placeholder="e.g., Gaming, Photography, Writing, Sports"
                className="w-full px-4 py-3 rounded-md bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff] resize-none"
                value={formData.hobbies}
                onChange={handleInputChange}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Helps us suggest projects that align with your interests
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isEditing && (
              <Button 
                onClick={handleCancel}
                variant="outline"
                disabled={loading}
                className="flex-1 h-12 text-lg border-[#30363d] text-gray-400 hover:text-white hover:bg-[#1c2128]"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSaveProfile}
              disabled={loading || !formData.age || !formData.education || !formData.technicalInterests || !formData.experienceYears || !formData.careerGoal || !formData.currentRole}
              className={`h-12 text-lg bg-[#58a6ff] hover:bg-[#4a9aee] text-white ${!isEditing ? 'w-full' : 'flex-1'}`}
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
