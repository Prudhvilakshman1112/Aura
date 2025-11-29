import { Layout } from "@/components/Layout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { StreakReminder } from "@/components/dashboard/StreakReminder";
import { ContributionTracker } from "@/components/dashboard/ContributionTracker";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Target, 
  Code, 
  Linkedin, 
  TrendingUp,
  Zap,
  Calendar,
  MessageCircle,
  Brain,
  RefreshCw
} from "lucide-react";

import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Index = () => {
  const { data: dashboardData, isLoading, error, refreshData } = useDashboard();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStats = async () => {
    console.log('🔄 Starting stats update...');
    setIsUpdating(true);
    
    try {
      console.log('🌐 Calling API updateCodingStats...');
      const response = await api.updateCodingStats();
      console.log('📥 API Response:', response);
      
      // Check for both possible success indicators
      const isSuccess = response.status === 'success' || (response as any).success === true;
      console.log('🎯 Success check:', isSuccess);
      
      if (isSuccess) {
        console.log('✅ Update successful, refreshing page...');
        // Simple page refresh without delay
        window.location.reload();
      } else {
        console.log('❌ Update failed with response:', response);
        toast({
          title: "Update Failed",
          description: response.message || "Failed to update coding statistics.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('❌ Error during update:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update coding statistics.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      console.log('🏁 Update process completed');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-destructive">Error loading dashboard: {error}</p>
            <Button onClick={refreshData}>Try Again</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const userName = user?.name || dashboardData?.userName || 'User';
  const codingStats = dashboardData?.codingStats || { leetcode: 0, codechef: 0, codeforces: 0, total: 0 };
  const monthlyProgress = dashboardData?.monthlyProgress || { current: 0, goal: 50, percentage: 0 };
  const careerPercentage = dashboardData?.careerPercentage || 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in mb-8">
          <h1 className="text-4xl font-bold gradient-text">
            Welcome back, {userName}! 
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your holistic success dashboard is ready. Let's continue building your future today.
          </p>
        </div>

        {/* Streak Reminder - Top Priority */}
        <div className="mb-8">
          <StreakReminder />
        </div>

        {/* Coding Statistics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard title="🏆 Total Problems" className="text-center">
            <div className="space-y-4">
              <div className="text-4xl font-bold gradient-text">{codingStats.total}</div>
              <p className="text-sm text-muted-foreground">Problems Solved</p>
              <Button 
                onClick={handleUpdateStats} 
                disabled={isUpdating}
                size="sm" 
                className="w-full"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Update Stats
                  </>
                )}
              </Button>
            </div>
          </DashboardCard>

          <DashboardCard title="💻 LeetCode" className="text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-500">{codingStats.leetcode}</div>
              <p className="text-sm text-muted-foreground">Problems</p>
            </div>
          </DashboardCard>

          <DashboardCard title="🍳 CodeChef" className="text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-yellow-500">{codingStats.codechef}</div>
              <p className="text-sm text-muted-foreground">Problems</p>
            </div>
          </DashboardCard>

          <DashboardCard title="⚔️ Codeforces" className="text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-500">{codingStats.codeforces}</div>
              <p className="text-sm text-muted-foreground">Problems</p>
            </div>
          </DashboardCard>
        </div>

        {/* Main Dashboard Grid - Contribution Tracker Only */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          
          {/* Contribution Tracker */}
          <ContributionTracker />

        </div>


      </div>
    </Layout>
  );
};

export default Index;