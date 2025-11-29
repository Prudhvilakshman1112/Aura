import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Map, 
  Brain, 
  Heart, 
  Calendar, 
  Settings,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Map, label: "Roadmaps", path: "/roadmaps" },
  { icon: Brain, label: "Mental Coach", path: "/mental" },
  { icon: Heart, label: "Physical Coach", path: "/physical" },
  { icon: Calendar, label: "Day Tracker", path: "/tracker" },
  { icon: Settings, label: "Settings", path: "/settings" }
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className={cn(
      "fixed left-0 top-0 h-full z-50 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="glass-card h-full rounded-none rounded-r-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold gradient-text">Aura</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-white/10"
            >
              {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-3 py-3 rounded-xl transition-all duration-200",
                  "hover:bg-white/10 group",
                  isActive && "bg-gradient-primary shadow-glow"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!collapsed && (
                  <span className={cn(
                    "ml-3 font-medium transition-colors",
                    isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        {!collapsed && (
          <div className="absolute bottom-6 left-4 right-4">
            <div className="glass p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                  <span className="text-white font-semibold">JS</span>
                </div>
                <div>
                  <div className="font-medium text-foreground">John Student</div>
                  <div className="text-xs text-muted-foreground">Computer Science</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};