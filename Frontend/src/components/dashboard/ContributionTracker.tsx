import { useState, useEffect } from "react";
import { DashboardCard } from "./DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, Target, Code, Trophy, Flame } from "lucide-react";
import { api } from "@/lib/api";

export const ContributionTracker = () => {
  const [platforms, setPlatforms] = useState([
    { name: "LeetCode", solved: 0, rating: 0, color: "bg-orange-500", contestSolved: 0, contestsParticipated: 0 },
    { name: "CodeChef", solved: 0, rating: 0, color: "bg-yellow-500", contestSolved: 0, contestsParticipated: 0 },
    { name: "Codeforces", solved: 0, rating: 0, color: "bg-blue-500", contestSolved: 0, contestsParticipated: 0 }
  ]);
  const [monthlyGoals, setMonthlyGoals] = useState({
    leetcode_problems: 30,
    codechef_problems: 20,
    codeforces_problems: 15,
    contest_participation: 3,
    career_milestones: 5
  });
  const [monthlyProgress, setMonthlyProgress] = useState({
    total_leetcode_solved: 0,
    total_codechef_solved: 0,
    total_codeforces_solved: 0,
    total_contests_participated: 0,
    total_career_milestones: 0,
    leetcode_progress_percent: 0,
    codechef_progress_percent: 0,
    codeforces_progress_percent: 0,
    contest_progress_percent: 0,
    career_progress_percent: 0
  });
  const [contributionData, setContributionData] = useState<Array<{date: string, count: number}>>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchContributionData();
  }, []);

  const fetchContributionData = async () => {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Fetch dashboard data for coding stats
      const dashboardResponse = await api.getDashboardData();
      if (dashboardResponse.status === 'success' && dashboardResponse.data) {
        const { codingStats } = dashboardResponse.data;
        
        setPlatforms([
          { name: "LeetCode", solved: codingStats.leetcode, rating: 0, color: "bg-orange-500", contestSolved: 0, contestsParticipated: 0 },
          { name: "CodeChef", solved: codingStats.codechef, rating: 0, color: "bg-yellow-500", contestSolved: 0, contestsParticipated: codingStats.contestData?.codechefContestsParticipated || 0 },
          { name: "Codeforces", solved: codingStats.codeforces, rating: 0, color: "bg-blue-500", contestSolved: codingStats.contestData?.codeforcesContestSolved || 0, contestsParticipated: 0 }
        ]);
      }
      
      // Fetch monthly goals
      const goalsResponse = await api.getMonthlyGoals(currentYear, currentMonth);
      if (goalsResponse.status === 'success' && goalsResponse.data) {
        setMonthlyGoals(goalsResponse.data as any);
      }
      
      // Fetch monthly progress
      const progressResponse = await api.getMonthlyProgress(currentYear, currentMonth);
      if (progressResponse.status === 'success' && progressResponse.data) {
        setMonthlyProgress(progressResponse.data as any);
      }
      
      // Fetch current streak from user streak tracking
      const streakResponse = await api.getCurrentStreak();
      if (streakResponse.status === 'success' && streakResponse.data) {
        setCurrentStreak((streakResponse.data as any).overall_streak || 0);
      }

      // Fetch tracker data for contributions
      const trackerResponse = await api.getTrackerData();
      if (trackerResponse.status === 'success' && trackerResponse.data) {
        setContributionData(trackerResponse.data.contributionData || []);
      }
    } catch (error) {
      console.error('Failed to fetch contribution data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStats = async () => {
    setIsUpdating(true);
    try {
      // Trigger backend scraping to update stats
      const scrapeResponse = await api.updateCodingStats();
      if (scrapeResponse.status === 'success') {
        // Sync activity from stats to daily tracking
        const syncResponse = await api.syncActivityFromStats();
        
        if (syncResponse.status === 'success') {
          // Refresh the data after successful sync
          await fetchContributionData();
        }
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      console.log('🚀 Starting real-time web scraping...');
      
      // Trigger web scraping and activity sync
      const response = await api.syncActivityFromStats();
      console.log('✅ Web scraping completed:', response);
      
      // Wait for data to be processed and stored
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Refresh all data after scraping
      await fetchContributionData();
      
      console.log('📊 Dashboard updated with live scraped data');
    } catch (error) {
      console.error('❌ Real-time scraping failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Generate contribution graph data based on real activity dates
  const generateContributions = () => {
    const contributions = [];
    const today = new Date();
    
    // Create 7x7 grid for 7 weeks (49 days)
    for (let week = 0; week < 7; week++) {
      const weekContributions = [];
      for (let day = 0; day < 7; day++) {
        // Calculate the date for this cell
        const cellDate = new Date(today);
        cellDate.setDate(today.getDate() - (6 - week) * 7 - (6 - day));
        const dateStr = cellDate.toISOString().split('T')[0];
        
        // Check if this date has activity from contributionData
        const activityItem = contributionData.find(item => item.date === dateStr);
        const intensity = activityItem ? Math.min(Math.floor(activityItem.count / 2) + 1, 3) : 0; // Convert count to intensity 1-3
        
        weekContributions.push(intensity);
      }
      contributions.push(weekContributions);
    }
    return contributions;
  };

  const contributions = generateContributions();

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 0: return "bg-muted/30";
      case 1: return "bg-primary/30";
      case 2: return "bg-primary/60";
      case 3: return "bg-primary";
      default: return "bg-muted/30";
    }
  };

  return (
    <DashboardCard title="📊 Coding Contributions" variant="career">
      <div className="space-y-6">

        {/* Dynamic Monthly Goals Progress */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Monthly Goals</span>
            </h3>
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium">{currentStreak} day streak</span>
            </div>
          </div>
          
          {/* Individual Goal Progress */}
          <div className="grid grid-cols-1 gap-3">
            {/* LeetCode Goal */}
            <div className="p-3 glass rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-sm font-medium">LeetCode</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {monthlyProgress.total_leetcode_solved}/{monthlyGoals.leetcode_problems}
                </span>
              </div>
              <Progress value={monthlyProgress.leetcode_progress_percent} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round(monthlyProgress.leetcode_progress_percent)}% complete
              </div>
            </div>
            
            {/* CodeChef Goal */}
            <div className="p-3 glass rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">CodeChef</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {monthlyProgress.total_codechef_solved}/{monthlyGoals.codechef_problems}
                </span>
              </div>
              <Progress value={monthlyProgress.codechef_progress_percent} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round(monthlyProgress.codechef_progress_percent)}% complete
              </div>
            </div>
            
            {/* Codeforces Goal */}
            <div className="p-3 glass rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium">Codeforces</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {monthlyProgress.total_codeforces_solved}/{monthlyGoals.codeforces_problems}
                </span>
              </div>
              <Progress value={monthlyProgress.codeforces_progress_percent} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round(monthlyProgress.codeforces_progress_percent)}% complete
              </div>
            </div>
          </div>
          
        </div>


        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-primary/30"
            onClick={fetchContributionData}
            disabled={isLoading}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
};