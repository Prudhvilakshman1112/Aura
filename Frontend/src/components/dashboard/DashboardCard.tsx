import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "mental" | "physical" | "career";
  size?: "sm" | "md" | "lg";
}

export const DashboardCard = ({ 
  title, 
  children, 
  className, 
  variant = "default",
  size = "md" 
}: DashboardCardProps) => {
  const variants = {
    default: "glass-card",
    mental: "glass-card border-mental/20 hover:shadow-[0_0_40px_hsl(var(--mental-accent)/0.3)]",
    physical: "glass-card border-physical/20 hover:shadow-[0_0_40px_hsl(var(--physical-accent)/0.3)]",
    career: "glass-card border-career/20 hover:shadow-[0_0_40px_hsl(var(--career-accent)/0.3)]"
  };

  const sizes = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8"
  };

  return (
    <div className={cn(
      variants[variant],
      sizes[size],
      "animate-fade-in",
      className
    )}>
      <h3 className="text-lg font-semibold mb-4 text-foreground/90">
        {title}
      </h3>
      {children}
    </div>
  );
};