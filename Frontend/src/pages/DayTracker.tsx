import React, { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ContributionTracker } from "@/components/dashboard/ContributionTracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ApiClient } from '@/lib/api';

const apiClient = new ApiClient();
import { 
  Target, 
  Trophy, 
  TrendingUp,
  Clock,
  BarChart3,
  Settings,
  Plus,
  Edit
} from "lucide-react";

const DayTracker = () => {
  const [monthlyGoals, setMonthlyGoals] = useState({
    daily_study_minutes: 0,
    leetcode_problems: 0,
    codechef_problems: 0,
    codeforces_problems: 0,
    contest_participation: 0,
    career_milestones: 0
  });
  const [monthlyProgress, setMonthlyProgress] = useState(null);
  const [dailyActivities, setDailyActivities] = useState([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch data on component mount
  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Fetch monthly goals
      const goalsResponse = await apiClient.getMonthlyGoals(currentYear, currentMonth);
      if (goalsResponse.status === 'success' && goalsResponse.data) {
        setMonthlyGoals(goalsResponse.data as typeof monthlyGoals);
      }
      
      // Fetch monthly progress
      const progressResponse = await apiClient.getMonthlyProgress(currentYear, currentMonth);
      if (progressResponse.status === 'success') {
        setMonthlyProgress(progressResponse.data);
      }
      
      // Fetch monthly activity range
      const activitiesResponse = await apiClient.getMonthlyActivityRange(currentYear, currentMonth);
      if (activitiesResponse.status === 'success' && activitiesResponse.data) {
        setDailyActivities(activitiesResponse.data as any[]);
      }
      
    } catch (error) {
      console.error('Error fetching activity data:', error);
      console.error('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGoals = async (goalData) => {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      const response = await apiClient.setMonthlyGoals({
        ...goalData,
        month: currentMonth,
        year: currentYear
      });
      
      if (response.status === 'success' && response.data) {
        setMonthlyGoals(response.data as typeof monthlyGoals);
        setIsGoalDialogOpen(false);
        console.log('Monthly goals updated successfully!');
        fetchActivityData(); // Refresh data
      }
    } catch (error) {
      console.error('Error setting goals:', error);
      console.error('Failed to update goals');
    }
  };

  const handleSyncFromStats = async () => {
    try {
      const response = await apiClient.syncActivityFromStats();
      if (response.status === 'success') {
        console.log('Activity synced from coding stats!');
        fetchActivityData(); // Refresh data
      }
    } catch (error) {
      console.error('Error syncing stats:', error);
      console.error('Failed to sync activity');
    }
  };

  // Generate calendar data from daily activities
  const generateCalendarData = () => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const calendar = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayActivity = dailyActivities.find(activity => {
        const activityDate = new Date(activity.activity_date);
        return activityDate.getDate() === i;
      });
      
      const hasActivity = dayActivity && (
        dayActivity.study_minutes > 0 ||
        dayActivity.leetcode_solved > 0 ||
        dayActivity.codechef_solved > 0 ||
        dayActivity.codeforces_solved > 0 ||
        dayActivity.contests_participated > 0 ||
        dayActivity.career_milestones_completed > 0
      );
      
      const totalActivity = dayActivity ? (
        dayActivity.study_minutes +
        dayActivity.leetcode_solved * 30 +
        dayActivity.codechef_solved * 30 +
        dayActivity.codeforces_solved * 30 +
        dayActivity.contests_participated * 120 +
        dayActivity.career_milestones_completed * 60
      ) : 0;
      
      const intensity = hasActivity ? Math.min(4, Math.floor(totalActivity / 60) + 1) : 0;
      
      calendar.push({
        day: i,
        hasActivity,
        intensity,
        studyTime: dayActivity ? Math.floor(dayActivity.study_minutes / 60) : 0,
        activity: dayActivity
      });
    }
    return calendar;
  };

  const calendarData = generateCalendarData();
  const totalStudyDays = calendarData.filter(day => day.hasActivity).length;
  const currentStreak = monthlyProgress?.current_streak || 0;

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 0: return "bg-muted/30 hover:bg-muted/50";
      case 1: return "bg-primary/30 hover:bg-primary/40";
      case 2: return "bg-primary/60 hover:bg-primary/70";
      case 3: return "bg-primary/80 hover:bg-primary/90";
      case 4: return "bg-primary hover:bg-primary/90";
      default: return "bg-muted/30";
    }
  };

  // Dynamic goal data from backend
  const goals = [
    { 
      name: "Daily Study", 
      target: monthlyGoals.daily_study_minutes || 0, 
      current: monthlyProgress?.total_study_minutes || 0, 
      unit: "minutes", 
      progress: monthlyProgress?.study_progress_percent || 0,
      key: 'daily_study_minutes'
    },
    { 
      name: "LeetCode Problems", 
      target: monthlyGoals.leetcode_problems || 0, 
      current: monthlyProgress?.total_leetcode_solved || 0, 
      unit: "problems", 
      progress: monthlyProgress?.leetcode_progress_percent || 0,
      key: 'leetcode_problems'
    },
    { 
      name: "CodeChef Problems", 
      target: monthlyGoals.codechef_problems || 0, 
      current: monthlyProgress?.total_codechef_solved || 0, 
      unit: "problems", 
      progress: monthlyProgress?.codechef_progress_percent || 0,
      key: 'codechef_problems'
    },
    { 
      name: "Codeforces Problems", 
      target: monthlyGoals.codeforces_problems || 0, 
      current: monthlyProgress?.total_codeforces_solved || 0, 
      unit: "problems", 
      progress: monthlyProgress?.codeforces_progress_percent || 0,
      key: 'codeforces_problems'
    },
    { 
      name: "Contest Participation", 
      target: monthlyGoals.contest_participation || 0, 
      current: monthlyProgress?.total_contests_participated || 0, 
      unit: "contests", 
      progress: monthlyProgress?.contest_progress_percent || 0,
      key: 'contest_participation'
    },
    { 
      name: "Career Milestones", 
      target: monthlyGoals.career_milestones || 0, 
      current: monthlyProgress?.total_career_milestones || 0, 
      unit: "milestones", 
      progress: monthlyProgress?.career_progress_percent || 0,
      key: 'career_milestones'
    }
  ];

  const GoalSettingDialog = () => {
    const [goalForm, setGoalForm] = useState(monthlyGoals);
    
    const handleSubmit = (e) => {
      e.preventDefault();
      handleSetGoals(goalForm);
    };
    
    return (
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Monthly Goals</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="daily_study_minutes">Daily Study (minutes/day)</Label>
              <Input
                id="daily_study_minutes"
                type="number"
                min="0"
                value={goalForm.daily_study_minutes}
                onChange={(e) => setGoalForm({...goalForm, daily_study_minutes: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leetcode_problems">LeetCode Problems</Label>
              <Input
                id="leetcode_problems"
                type="number"
                min="0"
                value={goalForm.leetcode_problems}
                onChange={(e) => setGoalForm({...goalForm, leetcode_problems: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codechef_problems">CodeChef Problems</Label>
              <Input
                id="codechef_problems"
                type="number"
                min="0"
                value={goalForm.codechef_problems}
                onChange={(e) => setGoalForm({...goalForm, codechef_problems: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codeforces_problems">Codeforces Problems</Label>
              <Input
                id="codeforces_problems"
                type="number"
                min="0"
                value={goalForm.codeforces_problems}
                onChange={(e) => setGoalForm({...goalForm, codeforces_problems: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contest_participation">Contest Participation</Label>
              <Input
                id="contest_participation"
                type="number"
                min="0"
                value={goalForm.contest_participation}
                onChange={(e) => setGoalForm({...goalForm, contest_participation: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="career_milestones">Career Milestones</Label>
              <Input
                id="career_milestones"
                type="number"
                min="0"
                value={goalForm.career_milestones}
                onChange={(e) => setGoalForm({...goalForm, career_milestones: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsGoalDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
                Save Goals
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Day Tracker</h1>
              <p className="text-muted-foreground">Track your daily progress and maintain consistency</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <DashboardCard title="Current Streak" className="text-center">
            <div className="space-y-3">
              <TrendingUp className="w-8 h-8 mx-auto text-orange-400" />
              <div className="text-3xl font-bold gradient-text">{monthlyProgress?.current_streak || 0}</div>
              <div className="text-sm text-muted-foreground">days strong</div>
            </div>
          </DashboardCard>

          <DashboardCard title="This Month" className="text-center">
            <div className="space-y-3">
              <Trophy className="w-8 h-8 mx-auto text-green-400" />
              <div className="text-3xl font-bold text-green-400">{dailyActivities.filter(day => day.problems_solved > 0).length}</div>
              <div className="text-sm text-muted-foreground">active days</div>
            </div>
          </DashboardCard>

          <DashboardCard title="Total Study Time" className="text-center">
            <div className="space-y-3">
              <Clock className="w-8 h-8 mx-auto text-blue-400" />
              <div className="text-3xl font-bold text-blue-400">
                {monthlyProgress ? Math.floor((monthlyProgress.total_study_minutes || 0) / 60) : 0}h
              </div>
              <div className="text-sm text-muted-foreground">this month</div>
            </div>
          </DashboardCard>

          <DashboardCard title="Problems Solved" className="text-center">
            <div className="space-y-3">
              <Trophy className="w-8 h-8 mx-auto text-yellow-400" />
              <div className="text-3xl font-bold text-yellow-400">
                {monthlyProgress ? (
                  (monthlyProgress.total_leetcode_solved || 0) +
                  (monthlyProgress.total_codechef_solved || 0) +
                  (monthlyProgress.total_codeforces_solved || 0)
                ) : 0}
              </div>
              <div className="text-sm text-muted-foreground">this month</div>
            </div>
          </DashboardCard>
        </div>


        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8">
        </div>

        {/* Goal Tracker */}
        <DashboardCard title="🎯 Monthly Goal Tracker" size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {goals.map((goal) => (
              <div key={goal.name} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="font-medium">{goal.name}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{goal.current} {goal.unit}</span>
                    <span className="text-muted-foreground">{goal.target} {goal.unit}</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {goal.progress}% complete
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">
                    {Math.round((goal.current / goal.target) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex space-x-4">
            <Button variant="outline" className="flex-1">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
            <Button className="flex-1 bg-gradient-primary hover:opacity-90" onClick={() => setIsGoalDialogOpen(true)}>
              <Target className="w-4 h-4 mr-2" />
              Set New Goals
            </Button>
          </div>
        </DashboardCard>
        
        <GoalSettingDialog />
      </div>
    </Layout>
  );
};

export default DayTracker;