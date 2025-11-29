import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    leetcodeHandle: "",
    codechefHandle: "",
    codeforcesHandle: "",
    linkedinHandle: "",
    height: "",
    weight: "",
    age: "",
    gender: "",
    studyDomain: "",
    yearOfStudy: "",
  });
  
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills(prev => [...prev, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(skill => skill !== skillToRemove));
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return false;
    }
    
    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Register user with basic credentials
      await register(formData.name, formData.email, formData.password);
      
      // Update profile with additional information if provided
      const profileData: any = {};
      
      if (formData.leetcodeHandle) profileData.leetcode_handle = formData.leetcodeHandle;
      if (formData.codechefHandle) profileData.codechef_handle = formData.codechefHandle;
      if (formData.codeforcesHandle) profileData.codeforces_handle = formData.codeforcesHandle;
      if (formData.linkedinHandle) profileData.linkedin_handle = formData.linkedinHandle;
      if (formData.height) profileData.height_cm = parseFloat(formData.height);
      if (formData.weight) profileData.weight_kg = parseFloat(formData.weight);
      if (formData.age) profileData.age = parseInt(formData.age);
      if (formData.gender) profileData.gender = formData.gender;
      if (formData.studyDomain) profileData.study_domain = formData.studyDomain;
      if (formData.yearOfStudy) profileData.study_year = parseInt(formData.yearOfStudy);
      if (skills.length > 0) profileData.skills = skills;
      
      // Update profile if there's additional data
      if (Object.keys(profileData).length > 0) {
        const { api } = await import('@/lib/api');
        await api.updateUserProfile(profileData);
      }
      
      toast({
        title: "Welcome to Aura Synergy Hub!",
        description: "Account created successfully. You're now logged in.",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass-card border-white/10">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            Create Your Aura
          </CardTitle>
          <p className="text-muted-foreground">
            Join the synergy and unlock your potential
          </p>
        </CardHeader>
        
        <CardContent className="space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Core Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground/90">
                Core Credentials <span className="text-destructive">*</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="Create a password"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Coding Profiles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground/90">
                Coding Profiles <span className="text-muted-foreground text-sm">(Optional)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leetcode">LeetCode Handle</Label>
                  <Input
                    id="leetcode"
                    value={formData.leetcodeHandle}
                    onChange={(e) => handleInputChange("leetcodeHandle", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="Your LeetCode username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codechef">CodeChef Handle</Label>
                  <Input
                    id="codechef"
                    value={formData.codechefHandle}
                    onChange={(e) => handleInputChange("codechefHandle", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="Your CodeChef username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codeforces">Codeforces Handle</Label>
                  <Input
                    id="codeforces"
                    value={formData.codeforcesHandle}
                    onChange={(e) => handleInputChange("codeforcesHandle", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="Your Codeforces username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Handle</Label>
                  <Input
                    id="linkedin"
                    value={formData.linkedinHandle}
                    onChange={(e) => handleInputChange("linkedinHandle", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="Your LinkedIn username"
                  />
                </div>
              </div>
            </div>

            {/* Physical Metrics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground/90">
                Physical Metrics <span className="text-muted-foreground text-sm">(Optional)</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleInputChange("height", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="170"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="70"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="22"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger className="glass-card border-white/20">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/20 bg-background/95">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground/90">
                Academic Info <span className="text-muted-foreground text-sm">(Optional)</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studyDomain">Study Domain</Label>
                  <Input
                    id="studyDomain"
                    value={formData.studyDomain}
                    onChange={(e) => handleInputChange("studyDomain", e.target.value)}
                    className="glass-card border-white/20"
                    placeholder="e.g. Computer Science"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yearOfStudy">Year of Study</Label>
                  <Select value={formData.yearOfStudy} onValueChange={(value) => handleInputChange("yearOfStudy", value)}>
                    <SelectTrigger className="glass-card border-white/20">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/20 bg-background/95">
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <div className="space-y-3">
                  <Input
                    id="skills"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={handleSkillKeyPress}
                    className="glass-card border-white/20"
                    placeholder="Type a skill and press Enter (e.g. React, Node.js)"
                  />
                  
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="glass-card bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 hover:text-destructive"
                            title={`Remove ${skill} skill`}
                            aria-label={`Remove ${skill} skill`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-violet-500 hover:shadow-glow transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Register"}
              </Button>
              
              <p className="text-center text-muted-foreground">
                Already have an account?{" "}
                <Link 
                  to="/login" 
                  className="text-primary hover:text-primary-glow underline-offset-4 hover:underline"
                >
                  Log In
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;