import { useState, useEffect } from "react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";
import { Flame, Target, Trophy } from "lucide-react";
import { api } from "@/lib/api";

export const StreakReminder = () => {
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    maxStreak: 0,
    nextMilestone: 7
  });
  const [todayProgress, setTodayProgress] = useState({
    total_daily_solved: 0,
    daily_leetcode_solved: 0,
    daily_codechef_solved: 0,
    daily_codeforces_solved: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStreakData();
  }, []);

  const fetchStreakData = async () => {
    try {
      // Get streak data from dashboard API which now includes currentStreak
      const dashboardResponse = await api.getDashboardData();
      if (dashboardResponse.status === 'success' && dashboardResponse.data) {
        const currentStreak = dashboardResponse.data.codingStats.currentStreak || 0;
        
        // Get best streak from tracker data
        const trackerResponse = await api.getTrackerData();
        const bestStreak = trackerResponse.data?.bestStreak || currentStreak;
        
        const nextMilestone = getNextMilestone(currentStreak);
        setStreakData({ currentStreak, maxStreak: bestStreak, nextMilestone });
      }

      // Get today's progress from daily tracking
      const todayResponse = await api.getTodayProgress();
      if (todayResponse.status === 'success' && todayResponse.data) {
        setTodayProgress(todayResponse.data);
        console.log('📊 Today\'s progress loaded:', todayResponse.data);
      } else {
        console.log('📊 No progress data for today yet');
        setTodayProgress({
          total_daily_solved: 0,
          daily_leetcode_solved: 0,
          daily_codechef_solved: 0,
          daily_codeforces_solved: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch streak data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getNextMilestone = (current: number): number => {
    const milestones = [7, 14, 30, 50, 100, 200, 365];
    return milestones.find(m => m > current) || current + 50;
  };

  if (isLoading) {
    return (
      <DashboardCard title=" Streak Reminder" variant="mental" className="relative overflow-hidden">
        <div className="flex items-center justify-center h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </DashboardCard>
    );
  }

  const { currentStreak, maxStreak, nextMilestone } = streakData;

  return (
    <DashboardCard title=" Streak Reminder" variant="mental" className="relative overflow-hidden">
      <div className="space-y-4">
        {/* Today's Progress Section */}
        <div className="text-center bg-muted/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-primary mb-1">
            {todayProgress.total_daily_solved} Problems Today
          </div>
          <div className="flex justify-center space-x-4 text-xs text-muted-foreground">
            {todayProgress.daily_leetcode_solved > 0 && (
              <span className="text-orange-500">LC: {todayProgress.daily_leetcode_solved}</span>
            )}
            {todayProgress.daily_codechef_solved > 0 && (
              <span className="text-yellow-500">CC: {todayProgress.daily_codechef_solved}</span>
            )}
            {todayProgress.daily_codeforces_solved > 0 && (
              <span className="text-blue-500">CF: {todayProgress.daily_codeforces_solved}</span>
            )}
            {todayProgress.total_daily_solved === 0 && (
              <span>No problems solved yet today</span>
            )}
          </div>
        </div>

        <div className="text-center">
          <div className="text-4xl font-bold gradient-text mb-2">{currentStreak} Days</div>
          <p className="text-muted-foreground">
            {currentStreak === 0 ? "Start your coding journey today!" : "Keep your momentum going!"}
          </p>
        </div>

        <div className="flex items-center justify-center space-x-6">
          <div className="text-center">
            <Flame className="w-6 h-6 mx-auto mb-1 text-orange-400" />
            <div className="text-sm font-medium">Current</div>
            <div className="text-lg font-bold text-orange-400">{currentStreak}</div>
          </div>
          
          <div className="text-center">
            <Target className="w-6 h-6 mx-auto mb-1 text-blue-400" />
            <div className="text-sm font-medium">Next Goal</div>
            <div className="text-lg font-bold text-blue-400">{nextMilestone}</div>
          </div>
          
          <div className="text-center">
            <Trophy className="w-6 h-6 mx-auto mb-1 text-yellow-400" />
            <div className="text-sm font-medium">Best</div>
            <div className="text-lg font-bold text-yellow-400">{maxStreak}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to next milestone</span>
            <span>{currentStreak}/{nextMilestone}</span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2">
            <div 
              className="bg-gradient-primary h-2 rounded-full transition-all duration-1000"
              data-progress={`${(currentStreak / nextMilestone) * 100}%`}
              style={{
                width: `${Math.min((currentStreak / nextMilestone) * 100, 100)}%`
              }}
            />
          </div>
        </div>

        <Button className="w-full bg-gradient-primary hover:opacity-90">
          {currentStreak === 0 ? "Start Your First Day" : "Continue Today's Session"}
        </Button>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-primary opacity-10 rounded-full blur-xl animate-pulse-glow" />
    </DashboardCard>
  );
};