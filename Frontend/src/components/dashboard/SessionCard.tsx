import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, Clock, Target } from "lucide-react";

export const SessionCard = () => {
  const selectedRoadmap = "Full-Stack Developer";
  const totalModules = 12;
  const completedModules = 7;
  const currentModule = "React Advanced Concepts";
  const progress = (completedModules / totalModules) * 100;

  return (
    <DashboardCard title="📚 Current Learning Session" variant="career" size="lg">
      <div className="space-y-6">
        {/* Roadmap Info */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground">{selectedRoadmap}</h3>
            <p className="text-muted-foreground">Your selected roadmap</p>
          </div>
          <Badge variant="secondary" className="bg-career/10 text-career">
            Active
          </Badge>
        </div>

        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{completedModules}/{totalModules} modules</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="text-sm text-muted-foreground">
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Current Module */}
        <div className="glass p-4 rounded-xl">
          <div className="flex items-center space-x-3 mb-3">
            <BookOpen className="w-5 h-5 text-career" />
            <div>
              <div className="font-medium">Currently Learning</div>
              <div className="text-sm text-muted-foreground">{currentModule}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-1 text-green-400" />
              <div className="text-sm font-medium">Completed</div>
              <div className="text-lg font-bold text-green-400">{completedModules}</div>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-1 text-yellow-400" />
              <div className="text-sm font-medium">Remaining</div>
              <div className="text-lg font-bold text-yellow-400">{totalModules - completedModules}</div>
            </div>
          </div>
        </div>

        {/* Daily Progress Input */}
        <div className="space-y-3">
          <h4 className="font-medium">Today's Progress Update</h4>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" className="border-career/30">
              Mark Module Complete
            </Button>
            <Button variant="outline" size="sm" className="border-career/30">
              Log Study Time
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button className="flex-1 bg-gradient-career hover:opacity-90">
            <Target className="w-4 h-4 mr-2" />
            Continue Learning
          </Button>
          <Button variant="outline" className="border-career/30">
            View Roadmap
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
};