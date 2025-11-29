import { cn } from "@/lib/utils";

interface StreakTrackerProps {
  streak: number;
  maxStreak: number;
  className?: string;
}

export const StreakTracker = ({ streak, maxStreak, className }: StreakTrackerProps) => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold gradient-text">
            {streak}
          </div>
          <div className="text-sm text-muted-foreground">
            Day streak
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-foreground">
            Best: {maxStreak}
          </div>
          <div className="text-sm text-muted-foreground">
            All time
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-10 gap-1">
        {days.map((day) => {
          const isActive = day <= streak;
          const isToday = day === streak;
          
          return (
            <div
              key={day}
              className={cn(
                "w-6 h-6 rounded-md transition-all duration-300",
                isActive 
                  ? "bg-gradient-primary shadow-glow" 
                  : "bg-muted/30",
                isToday && "pulse-glow scale-110"
              )}
              title={`Day ${day}`}
            />
          );
        })}
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        Keep the momentum going! 🔥
      </div>
    </div>
  );
};