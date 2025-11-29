import { useState, useEffect } from "react";
import { DashboardCard } from "./DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Target, CheckCircle, ExternalLink, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

interface Milestone {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string | null;
  estimatedTime: string;
  orderIndex: number;
  skills: string[];
  resources: { name: string; url: string }[];
}

interface CurrentPath {
  id: number;
  name: string;
  description: string;
  icon: string;
  difficulty: string;
  estimatedDuration: string;
  progress: number;
  milestones: Milestone[];
}

export const CurrentLearningPath = () => {
  const [currentPath, setCurrentPath] = useState<CurrentPath | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCurrentLearning();
  }, []);

  const fetchCurrentLearning = async () => {
    try {
      const response = await api.getCurrentLearningPath();
      if (response.status === 'success' && response.data.currentPath) {
        setCurrentPath(response.data.currentPath);
      }
    } catch (error) {
      console.error('Failed to fetch current learning path:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: number, completed: boolean) => {
    try {
      const response = await api.updateMilestone(milestoneId, { completed });
      if (response.status === 'success') {
        await fetchCurrentLearning(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to update milestone:', error);
    }
  };

  if (isLoading) {
    return (
      <DashboardCard title="📚 Current Learning Path" variant="career">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-3 bg-muted rounded w-3/4"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </DashboardCard>
    );
  }

  if (!currentPath) {
    return (
      <DashboardCard title="📚 Current Learning Path" variant="career">
        <div className="text-center py-8 space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold">No Active Learning Path</h3>
            <p className="text-sm text-muted-foreground">
              Start a career roadmap to track your learning progress
            </p>
          </div>
          <Button 
            size="sm" 
            className="bg-gradient-career hover:opacity-90"
            onClick={() => window.location.href = '/roadmaps'}
          >
            Browse Career Paths
          </Button>
        </div>
      </DashboardCard>
    );
  }

  const nextMilestone = currentPath.milestones?.find(m => !m.completed);
  const completedCount = currentPath.milestones?.filter(m => m.completed).length || 0;
  const totalCount = currentPath.milestones?.length || 0;
  const recentMilestones = currentPath.milestones?.slice(0, 3) || [];

  return (
    <DashboardCard title={`${currentPath.icon} ${currentPath.name}`} variant="career">
      <div className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} modules
            </span>
          </div>
          <Progress value={currentPath.progress || 0} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentPath.progress}% Complete</span>
            <span>{currentPath.estimatedDuration}</span>
          </div>
        </div>

        {/* Current Module */}
        {nextMilestone && (
          <div className="glass p-4 rounded-xl border border-career/20">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-career flex items-center justify-center mt-1">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-semibold text-sm">Current Module</h4>
                  <p className="text-sm font-medium">{nextMilestone.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {nextMilestone.description}
                  </p>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{nextMilestone.estimatedTime}</span>
                  </div>
                  {nextMilestone.skills?.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{nextMilestone.skills.length} skills</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="bg-gradient-career hover:opacity-90 text-xs"
                    onClick={() => handleToggleMilestone(nextMilestone.id, true)}
                  >
                    Mark Complete
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => window.location.href = '/roadmaps'}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Progress */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-career" />
            <span>Recent Modules</span>
          </h4>
          
          <div className="space-y-2">
            {recentMilestones.map((milestone) => (
              <div 
                key={milestone.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  milestone.completed 
                    ? 'bg-career/5 border border-career/20' 
                    : 'bg-muted/30'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  milestone.completed 
                    ? 'bg-gradient-career' 
                    : 'bg-muted'
                }`}>
                  {milestone.completed ? (
                    <CheckCircle className="w-3 h-3 text-white" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{milestone.title}</p>
                  <p className="text-xs text-muted-foreground">{milestone.estimatedTime}</p>
                </div>
                
                {milestone.completed && (
                  <Badge variant="secondary" className="text-xs bg-career/10 text-career">
                    Complete
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-career/30"
          onClick={() => window.location.href = '/roadmaps'}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          View Full Roadmap
        </Button>
      </div>
    </DashboardCard>
  );
};
