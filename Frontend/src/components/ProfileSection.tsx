import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Code, 
  Linkedin, 
  Trophy,
  Target,
  LogOut,
  Edit,
  Activity,
  Save,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface UserProfileData {
  id: number;
  name: string;
  email: string;
  profileImageUrl?: string;
  createdAt: string;
  profile: {
    linkedinHandle?: string;
    leetcodeHandle?: string;
    codechefHandle?: string;
    codeforcesHandle?: string;
    heightCm?: number;
    weightKg?: number;
    age?: number;
    gender?: string;
    studyDomain?: string;
    studyYear?: number;
    skills?: string[];
  };
}

interface PhysicalMetrics {
  height?: number;
  weight?: number;
  age?: number;
  gender?: string;
  bmi?: number;
  bmiCategory?: string;
}

interface ProfileSectionProps {
  onClose?: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [physicalMetrics, setPhysicalMetrics] = useState<PhysicalMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    linkedinHandle: '',
    leetcodeHandle: '',
    codechefHandle: '',
    codeforcesHandle: '',
    heightCm: '',
    weightKg: '',
    age: '',
    gender: '',
    studyDomain: '',
    studyYear: '',
    skills: [] as string[]
  });

  useEffect(() => {
    fetchProfileData();
    fetchPhysicalMetrics();
  }, []);

  useEffect(() => {
    if (profileData) {
      setEditForm({
        linkedinHandle: profileData.profile.linkedinHandle || '',
        leetcodeHandle: profileData.profile.leetcodeHandle || '',
        codechefHandle: profileData.profile.codechefHandle || '',
        codeforcesHandle: profileData.profile.codeforcesHandle || '',
        heightCm: profileData.profile.heightCm?.toString() || '',
        weightKg: profileData.profile.weightKg?.toString() || '',
        age: profileData.profile.age?.toString() || '',
        gender: profileData.profile.gender || '',
        studyDomain: profileData.profile.studyDomain || '',
        studyYear: profileData.profile.studyYear?.toString() || '',
        skills: profileData.profile.skills || []
      });
    }
  }, [profileData]);

  const fetchProfileData = async () => {
    try {
      const response = await api.getUserProfile();
      if (response.status === 'success' && response.data) {
        setProfileData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    }
  };

  const fetchPhysicalMetrics = async () => {
    try {
      const response = await api.getPhysicalMetrics();
      if (response.status === 'success' && response.data) {
        setPhysicalMetrics(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch physical metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const handleSaveProfile = async () => {
    try {
      const updateData = {
        linkedin_handle: editForm.linkedinHandle || undefined,
        leetcode_handle: editForm.leetcodeHandle || undefined,
        codechef_handle: editForm.codechefHandle || undefined,
        codeforces_handle: editForm.codeforcesHandle || undefined,
        height_cm: editForm.heightCm ? parseInt(editForm.heightCm) : undefined,
        weight_kg: editForm.weightKg ? parseFloat(editForm.weightKg) : undefined,
        age: editForm.age ? parseInt(editForm.age) : undefined,
        gender: editForm.gender as 'Male' | 'Female' | 'Other' || undefined,
        study_domain: editForm.studyDomain || undefined,
        study_year: editForm.studyYear ? parseInt(editForm.studyYear) : undefined,
        skills: editForm.skills.length > 0 ? editForm.skills : undefined
      };

      console.log('🔍 Profile Update Debug:');
      console.log('Update data being sent:', updateData);
      
      const response = await api.updateUserProfile(updateData);
      console.log('API Response:', response);
      if (response.status === 'success') {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
        setIsEditing(false);
        
        // Refresh profile data immediately
        await fetchProfileData();
        await fetchPhysicalMetrics();
        
        // Check if coding handles were updated and refresh stats
        const codingHandlesUpdated = 
          editForm.leetcodeHandle !== (profileData?.profile.leetcodeHandle || '') ||
          editForm.codechefHandle !== (profileData?.profile.codechefHandle || '') ||
          editForm.codeforcesHandle !== (profileData?.profile.codeforcesHandle || '');
        
        if (codingHandlesUpdated) {
          try {
            toast({
              title: "Updating Coding Stats",
              description: "Fetching latest coding statistics...",
            });
            
            const statsResponse = await api.updateCodingStats();
            if (statsResponse.status === 'success') {
              toast({
                title: "Stats Updated!",
                description: `Found ${statsResponse.data?.differences?.total || 0} problems solved across platforms.`,
              });
            }
          } catch (error) {
            console.error('Failed to update coding stats:', error);
          }
        }
        
        // Trigger dashboard refresh by dispatching custom event
        window.dispatchEvent(new CustomEvent('profileUpdated', { 
          detail: { 
            profileUpdated: true, 
            codingHandlesUpdated,
            physicalMetricsUpdated: !!(editForm.heightCm || editForm.weightKg || editForm.age)
          } 
        }));
        
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillsChange = (skills: string) => {
    const skillArray = skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    setEditForm(prev => ({ ...prev, skills: skillArray }));
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const profile = profileData?.profile || {};
  const joinDate = profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Unknown';

  return (
    <div className="w-full max-w-none">
      <Card className="glass-card border-white/10 bg-background/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary via-violet-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white/20 hover:ring-white/30 transition-all duration-300">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-background flex items-center justify-center shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-3">
            <CardTitle className="text-2xl font-bold gradient-text">
              {profileData?.name || user?.name || 'User'}
            </CardTitle>
            <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
              <Mail className="w-4 h-4" />
              {profileData?.email || user?.email}
            </p>
          </div>
        </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Joined: {joinDate}</span>
            </div>
            {profile.age && (
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span>Age: {profile.age}</span>
              </div>
            )}
            {profile.gender && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>Gender: {profile.gender}</span>
              </div>
            )}
            {profile.studyDomain && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>Domain: {profile.studyDomain}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Coding Profiles */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Code className="w-5 h-5" />
            Coding Profiles
          </h3>
          
          <div className="grid grid-cols-1 gap-3">
            {profile.leetcodeHandle && (
              <div className="flex items-center justify-between p-3 glass-card rounded-xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors min-w-0">
                <span className="text-orange-500 font-semibold flex-shrink-0">LeetCode</span>
                <span className="text-sm font-medium text-right truncate ml-2 max-w-[200px]" title={profile.leetcodeHandle}>{profile.leetcodeHandle}</span>
              </div>
            )}
            {profile.codechefHandle && (
              <div className="flex items-center justify-between p-3 glass-card rounded-xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors min-w-0">
                <span className="text-yellow-500 font-semibold flex-shrink-0">CodeChef</span>
                <span className="text-sm font-medium text-right truncate ml-2 max-w-[200px]" title={profile.codechefHandle}>{profile.codechefHandle}</span>
              </div>
            )}
            {profile.codeforcesHandle && (
              <div className="flex items-center justify-between p-3 glass-card rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors min-w-0">
                <span className="text-blue-500 font-semibold flex-shrink-0">Codeforces</span>
                <span className="text-sm font-medium text-right truncate ml-2 max-w-[200px]" title={profile.codeforcesHandle}>{profile.codeforcesHandle}</span>
              </div>
            )}
            {profile.linkedinHandle && (
              <div className="flex items-center justify-between p-3 glass-card rounded-xl border border-[#0077B5]/20 bg-[#0077B5]/5 hover:bg-[#0077B5]/10 transition-colors min-w-0">
                <span className="text-[#0077B5] font-semibold flex items-center gap-2 flex-shrink-0">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </span>
                <span className="text-sm font-medium text-right truncate ml-2 max-w-[200px]" title={profile.linkedinHandle}>{profile.linkedinHandle}</span>
              </div>
            )}
          </div>

          {!profile.leetcodeHandle && !profile.codechefHandle && !profile.codeforcesHandle && !profile.linkedinHandle && (
            <p className="text-muted-foreground text-sm text-center py-4">
              No coding profiles added yet. Update your profile to add them.
            </p>
          )}
        </div>

        <Separator />

        {/* Physical Metrics */}
        {physicalMetrics && (physicalMetrics.height || physicalMetrics.weight) && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Physical Metrics
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {physicalMetrics.height && (
                  <div className="text-center p-4 glass-card rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                    <div className="text-2xl font-bold gradient-text">{physicalMetrics.height}</div>
                    <div className="text-xs text-muted-foreground font-medium">Height (cm)</div>
                  </div>
                )}
                {physicalMetrics.weight && (
                  <div className="text-center p-4 glass-card rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-colors">
                    <div className="text-2xl font-bold gradient-text">{physicalMetrics.weight}</div>
                    <div className="text-xs text-muted-foreground font-medium">Weight (kg)</div>
                  </div>
                )}
                {physicalMetrics.bmi && (
                  <div className="text-center p-4 glass-card rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                    <div className="text-2xl font-bold gradient-text">{physicalMetrics.bmi}</div>
                    <div className="text-xs text-muted-foreground font-medium">BMI</div>
                  </div>
                )}
                {physicalMetrics.bmiCategory && (
                  <div className="text-center p-4 glass-card rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors">
                    <div className="text-sm font-bold text-green-400">{physicalMetrics.bmiCategory}</div>
                    <div className="text-xs text-muted-foreground font-medium">Category</div>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5" />
                Skills
              </h3>
              
              <div className="flex flex-wrap gap-3">
                {profile.skills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="glass-card bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary border-primary/30 hover:border-primary/50 transition-colors px-3 py-1.5 text-sm font-medium"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Actions */}
        {isEditing ? (
          <div className="space-y-6">
            {/* Edit Form */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit Profile
              </h3>
              
              {/* Coding Handles */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="leetcode">LeetCode Username</Label>
                  <Input
                    id="leetcode"
                    value={editForm.leetcodeHandle}
                    onChange={(e) => handleInputChange('leetcodeHandle', e.target.value)}
                    placeholder="Enter username only"
                  />
                </div>
                <div>
                  <Label htmlFor="codechef">CodeChef Username</Label>
                  <Input
                    id="codechef"
                    value={editForm.codechefHandle}
                    onChange={(e) => handleInputChange('codechefHandle', e.target.value)}
                    placeholder="Enter username only"
                  />
                </div>
                <div>
                  <Label htmlFor="codeforces">Codeforces Username</Label>
                  <Input
                    id="codeforces"
                    value={editForm.codeforcesHandle}
                    onChange={(e) => handleInputChange('codeforcesHandle', e.target.value)}
                    placeholder="Enter username only"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn Handle</Label>
                  <Input
                    id="linkedin"
                    value={editForm.linkedinHandle}
                    onChange={(e) => handleInputChange('linkedinHandle', e.target.value)}
                    placeholder="Enter username only"
                  />
                </div>
              </div>

              {/* Physical Metrics */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={editForm.heightCm}
                    onChange={(e) => handleInputChange('heightCm', e.target.value)}
                    placeholder="170"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={editForm.weightKg}
                    onChange={(e) => handleInputChange('weightKg', e.target.value)}
                    placeholder="70"
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={editForm.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="25"
                  />
                </div>
              </div>

              {/* Other Details */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={editForm.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="domain">Study Domain</Label>
                  <Input
                    id="domain"
                    value={editForm.studyDomain}
                    onChange={(e) => handleInputChange('studyDomain', e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={editForm.skills.join(', ')}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                  placeholder="JavaScript, React, Python, Machine Learning"
                />
              </div>
            </div>

            {/* Edit Actions */}
            <div className="flex gap-4 pt-4">
              <Button onClick={handleSaveProfile} className="flex-1 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white shadow-lg">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 border-white/20 hover:bg-white/10">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 border-white/20 hover:bg-white/10 transition-colors" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};

export default ProfileSection;
