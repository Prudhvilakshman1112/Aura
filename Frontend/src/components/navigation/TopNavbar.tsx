import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Map, 
  Brain, 
  Heart, 
  Calendar, 
  Settings,
  User,
  ChevronDown,
  LogOut,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { createPortal } from "react-dom";
import ProfileSection from "@/components/ProfileSection";

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Map, label: "Roadmaps", path: "/roadmaps" },
  { icon: Brain, label: "Mental Coach", path: "/mental" },
  { icon: Heart, label: "Physical Coach", path: "/physical" },
  { icon: Calendar, label: "Day Tracker", path: "/tracker" },
];

const ProfileDropdown = () => {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const profileOverlay = showProfile ? (
    <div className="fixed inset-0 z-[99999] pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowProfile(false)}
      />
      
      {/* Sidebar Profile */}
      <div className="absolute top-0 right-0 h-screen w-[520px] max-w-[90vw] bg-background/98 backdrop-blur-xl border-l border-white/20 shadow-2xl transform transition-all duration-300 ease-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20 bg-gradient-to-r from-primary/10 to-violet-500/10 flex-shrink-0">
            <h2 className="text-xl font-bold gradient-text flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </h2>
            <button
              onClick={() => setShowProfile(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 text-white hover:text-red-400 hover:bg-red-500/10"
              title="Close Profile"
              aria-label="Close Profile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto profile-scroll p-6">
            <ProfileSection onClose={() => setShowProfile(false)} />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2 px-3 py-1 rounded-lg glass hover:bg-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.name ? getUserInitials(user.name) : 'U'}
            </span>
          </div>
          <div className="text-sm">
            <div className="font-medium text-foreground">{user?.name || 'User'}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 glass-card border-white/10 bg-background/95 backdrop-blur-xl shadow-xl">
        <DropdownMenuItem 
          onClick={() => setShowProfile(true)}
          className="cursor-pointer hover:bg-white/10 transition-colors duration-200 focus:bg-white/10"
        >
          <User className="w-4 h-4 mr-2" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={logout}
          className="cursor-pointer hover:bg-red-500/10 text-red-400 focus:text-red-400 focus:bg-red-500/10 transition-colors duration-200"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
      {/* Render profile overlay using portal */}
      {profileOverlay && createPortal(profileOverlay, document.body)}
    </DropdownMenu>
  );
};

export const TopNavbar = () => {
  const location = useLocation();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="text-2xl font-bold gradient-text">Aura</span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all duration-200",
                      "hover:bg-white/10",
                      isActive && "bg-gradient-primary shadow-glow"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 mr-2",
                      isActive ? "text-white" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-medium text-sm",
                      isActive ? "text-white" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User Profile & Settings */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <NavLink to="/settings">
                  <Settings className="w-4 h-4" />
                </NavLink>
              </Button>
              
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>
      
      {/* Spacer to prevent content from being hidden behind fixed header */}
      <div className="h-20"></div>
    </>
  );
};