import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
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
      await login(formData.email, formData.password);
      
      toast({
        title: "Welcome Back!",
        description: "Login successful.",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-white/10">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <p className="text-muted-foreground">
            Sign in to continue your aura journey
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="glass-card border-white/20"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-violet-500 hover:shadow-glow transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Login"}
              </Button>
              
              <p className="text-center text-muted-foreground">
                Don't have an account?{" "}
                <Link 
                  to="/register" 
                  className="text-primary hover:text-primary-glow underline-offset-4 hover:underline"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;