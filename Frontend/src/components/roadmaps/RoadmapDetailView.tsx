import React from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { 
  CheckCircle, 
  Circle, 
  Clock,
  Trophy,
  Target,
  BookOpen,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Award
} from "lucide-react";

interface Module {
  name: string;
  completed: boolean;
  completedAt: string | null;
}

interface CareerPath {
  id: number;
  name: string;
  description: string;
  icon: string;
  difficulty: string;
  estimatedDuration: string;
  progress: number;
  modules: Module[];
  totalModules: number;
  completedModules: number;
}

interface RoadmapDetailViewProps {
  selectedPath: CareerPath;
  onToggleModule: (moduleName: string, completed: boolean) => void;
}

export const RoadmapDetailView: React.FC<RoadmapDetailViewProps> = ({
  selectedPath,
  onToggleModule
}) => {
  const completedModules = selectedPath.completedModules || 0;
  const totalModules = selectedPath.totalModules || 0;
  const nextModule = selectedPath.modules?.find(m => !m.completed);
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <DashboardCard 
        title={`${selectedPath.icon} ${selectedPath.name}`} 
        variant="career" 
        size="lg"
      >
        <div className="space-y-6">
          {/* Career Path Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center glass p-4 rounded-xl">
              <div className="text-2xl font-bold gradient-career">{selectedPath.progress}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
            <div className="text-center glass p-4 rounded-xl">
              <div className="text-2xl font-bold gradient-career">
                {completedModules}/{totalModules}
              </div>
              <div className="text-sm text-muted-foreground">Modules</div>
            </div>
            <div className="text-center glass p-4 rounded-xl">
              <div className="text-2xl font-bold gradient-career">{selectedPath.estimatedDuration}</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            <div className="text-center glass p-4 rounded-xl">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getDifficultyColor(selectedPath.difficulty)}`}>
                {selectedPath.difficulty}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Level</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{selectedPath.progress}%</span>
            </div>
            <Progress value={selectedPath.progress} className="h-3" />
          </div>

          {/* Description */}
          <div className="glass p-4 rounded-xl">
            <p className="text-muted-foreground">{selectedPath.description}</p>
          </div>
        </div>
      </DashboardCard>

      {/* Next Up Section */}
      {nextModule && (
        <DashboardCard title="🎯 Next Up" variant="default">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full bg-gradient-career flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold">{nextModule.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">Continue your learning journey with this module</p>
                <Button 
                  className="bg-gradient-career hover:opacity-90"
                  onClick={() => onToggleModule(nextModule.name, true)}
                >
                  Start Learning
                </Button>
              </div>
            </div>
          </div>
        </DashboardCard>
      )}

      {/* Learning Modules */}
      <DashboardCard title="📚 Learning Modules" variant="default" size="lg">
        <div className="space-y-4">
          {selectedPath.modules?.map((module, index) => {
            return (
              <div 
                key={index}
                className={`glass p-6 rounded-xl border transition-all duration-300 ${
                  module.completed 
                    ? 'border-career/30 bg-career/5' 
                    : 'border-blue-500/30 bg-blue-500/5'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Module Number & Status */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      module.completed 
                        ? 'bg-gradient-career text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {module.completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    {/* Connection Line */}
                    {index < selectedPath.modules.length - 1 && (
                      <div className={`w-0.5 h-8 ${
                        module.completed ? 'bg-career' : 'bg-muted/30'
                      }`} />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    {/* Module Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold text-foreground">
                          {module.name}
                        </h4>
                        {module.completed && (
                          <Badge className="bg-gradient-career text-white text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Learn the fundamentals and advanced concepts for this module
                      </p>
                    </div>
                    
                    {/* Module Info */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Module Info</div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>Module {index + 1}</span>
                        </div>
                        {module.completedAt && (
                          <div className="flex items-center space-x-1">
                            <Trophy className="w-4 h-4 text-career" />
                            <span>Completed {new Date(module.completedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button 
                        size="sm" 
                        variant={module.completed ? "secondary" : "default"}
                        className={module.completed ? "" : "bg-gradient-career hover:opacity-90"}
                        onClick={() => onToggleModule(module.name, !module.completed)}
                      >
                        {module.completed ? (
                          <>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Mark Incomplete
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Complete
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Completion Message */}
                    {module.completed && (
                      <div className="flex items-center space-x-2 p-3 bg-career/10 rounded-lg">
                        <Trophy className="w-5 h-5 text-career" />
                        <span className="text-sm font-medium text-career">
                          Great job! You've completed this module. 🎉
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }) || (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No modules available</h3>
              <p>This roadmap doesn't have any learning modules yet.</p>
            </div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
};
