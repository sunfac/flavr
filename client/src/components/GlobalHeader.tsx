import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/iconMap";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Extract icon components for proper React usage
const Menu = iconMap.menu;
const Crown = iconMap.crown;
const Settings = iconMap.settings;
const LogIn = iconMap.login;
const UserPlus = iconMap.userPlus;

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
  
  // Check authentication status
  const { data: userData } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });
  
  const user = userData;

  const handleSettingsClick = () => {
    console.log("Settings clicked");
    console.log("User data:", user);
    
    // Navigate to settings page
    navigate("/settings");
  };

  const handleFlavrPlusClick = () => {
    window.location.href = '/flavr-plus';
  };

  const handleLoginClick = () => {
    navigate("/login");
  };
  
  const handleSignUpClick = () => {
    navigate("/login?signup=true");
  };
  return (
    <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4 pointer-events-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Hamburger Menu and Flavr+ */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-white hover:bg-white/10 relative z-10"
          >
            <Menu className="w-6 h-6" />
          </Button>
          
          {/* Flavr+ button - always visible as info page, icon only */}
          <Button 
            variant="ghost"
            size="sm"
            onClick={handleFlavrPlusClick}
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 font-medium px-1.5 py-1 relative z-10 border border-orange-400/30 hover:border-orange-400/50"
          >
            <Crown className="w-4 h-4" />
          </Button>
        </div>

        {/* Center: Chef Hat Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
          <button 
            onClick={() => navigate('/')}
            className="hover:opacity-80 transition-opacity"
          >
            <img src={FlavrLogo} alt="Flavr" className="w-10 h-10" />
          </button>
        </div>

        {/* Right: Mobile-optimized authentication/settings buttons */}
        <div className="flex items-center gap-0.5 ml-auto md:gap-1">
          {user && onSettingsClick ? (
            // Authenticated user - show Settings only if onSettingsClick is provided
            <Button 
              variant="ghost"
              size="sm"
              onClick={handleSettingsClick}
              className="text-white hover:bg-white/10 relative z-10 px-1.5 py-0.5"
            >
              <Settings className="w-4 h-4" />
            </Button>
          ) : !user ? (
            // Not authenticated - mobile-first positioning with icons-only option on small screens
            <>
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleLoginClick}
                className="text-white hover:text-white hover:bg-white/10 font-medium px-1 py-0.5 text-xs relative z-10 md:px-3 md:py-1.5 md:text-sm min-h-0 h-auto xs:px-1.5"
              >
                <LogIn className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden xs:inline text-xs md:text-sm ml-0.5 md:ml-1">Login</span>
              </Button>
              
              <Button 
                variant="ghost"
                size="sm"
                onClick={handleSignUpClick}
                className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 font-medium px-1 py-0.5 text-xs relative z-10 border border-orange-400/30 hover:border-orange-400/50 md:px-3 md:py-1.5 md:text-sm min-h-0 h-auto xs:px-1.5"
              >
                <UserPlus className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden xs:inline text-xs md:text-sm ml-0.5 md:ml-1">Sign Up</span>
              </Button>
            </>
          ) : null}
        </div>
      </div>


    </header>
  );
}