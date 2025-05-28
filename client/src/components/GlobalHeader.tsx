import { Button } from "@/components/ui/button";
import { Menu, Settings, Crown, LogIn, UserPlus } from "lucide-react";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface GlobalHeaderProps {
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  onAuthRequired?: () => void;
}

export default function GlobalHeader({ 
  onMenuClick, 
  onSettingsClick,
  onAuthRequired 
}: GlobalHeaderProps) {
  const [, navigate] = useLocation();
  
  // Simplified authentication check to prevent errors
  const user = null; // Temporarily disable auth check to show layout

  const handleSettingsClick = () => {
    console.log("Settings clicked");
    console.log("User data:", user);
    
    // Always allow navigation to settings/flavr-plus page
    onSettingsClick?.();
  };

  const handleFlavrPlusClick = () => {
    window.location.href = '/flavr-plus';
  };

  const handleLoginClick = () => {
    navigate("/login");
  };
  return (
    <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4 pointer-events-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Hamburger Menu */}
        <Button 
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-white hover:bg-white/10 relative z-10"
        >
          <Menu className="w-6 h-6" />
        </Button>

        {/* Center: Chef Hat Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
          <img src={FlavrLogo} alt="Flavr" className="w-10 h-10" />
        </div>

        {/* Right: Ultra-compact buttons positioned safely away from logo */}
        <div className="flex items-center gap-0.5 ml-auto">
          {/* Flavr+ button - always visible as info page, icon only on mobile */}
          <Button 
            variant="ghost"
            size="sm"
            onClick={handleFlavrPlusClick}
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 font-medium px-1 py-0.5 text-xs relative z-10 border border-orange-400/30 hover:border-orange-400/50 min-w-0"
          >
            <Crown className="w-3 h-3" />
            <span className="hidden sm:inline ml-0.5 text-xs">Plus</span>
          </Button>
          
          {user ? (
            // Authenticated user - show Settings only
            <Button 
              variant="ghost"
              size="sm"
              onClick={handleSettingsClick}
              className="text-white hover:bg-white/10 relative z-10 px-1 py-0.5 min-w-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          ) : (
            // Not authenticated - show ultra-compact Login and Sign Up buttons
            <>
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleLoginClick}
                className="text-white hover:text-white hover:bg-white/10 font-medium px-1 py-0.5 text-xs relative z-10 min-w-0"
              >
                <LogIn className="w-3 h-3" />
                <span className="hidden sm:inline ml-0.5 text-xs">Login</span>
              </Button>
              
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleLoginClick}
                className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 font-medium px-1 py-0.5 text-xs relative z-10 border border-orange-400/30 hover:border-orange-400/50 min-w-0"
              >
                <UserPlus className="w-3 h-3" />
                <span className="hidden sm:inline ml-0.5 text-xs">Sign Up</span>
              </Button>
            </>
          )}
        </div>
      </div>


    </header>
  );
}