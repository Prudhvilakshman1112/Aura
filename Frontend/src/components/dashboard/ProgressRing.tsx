import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  variant?: "mental" | "physical" | "career";
  label?: string;
  className?: string;
}

export const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 8,
  variant = "mental",
  label,
  className 
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const offset = circumference - (progress / 100) * circumference;

  const colors = {
    mental: "stroke-mental",
    physical: "stroke-physical", 
    career: "stroke-career"
  };

  const gradients = {
    mental: "url(#mental-gradient)",
    physical: "url(#physical-gradient)",
    career: "url(#career-gradient)"
  };

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      <div className="relative progress-ring">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient id="mental-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--mental-accent))" />
              <stop offset="100%" stopColor="hsl(220 85% 75%)" />
            </linearGradient>
            <linearGradient id="physical-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--physical-accent))" />
              <stop offset="100%" stopColor="hsl(175 85% 70%)" />
            </linearGradient>
            <linearGradient id="career-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--career-accent))" />
              <stop offset="100%" stopColor="hsl(320 85% 75%)" />
            </linearGradient>
          </defs>
          
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="opacity-20"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={gradients[variant]}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px hsl(var(--${variant}-accent) / 0.6))`
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">
            {progress}%
          </span>
        </div>
      </div>
      
      {label && (
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
};