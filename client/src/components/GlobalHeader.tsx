import { Button } from "@/components/ui/button";
import { Menu, Settings, Crown } from "lucide-react";
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
  
  // Check authentication status
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const handleSettingsClick = () => {
    console.log("Settings clicked");
    console.log("User data:", user);
    
    // Check if user is authenticated - fix the data structure check
    if (!user?.id) {
      console.log("User not authenticated, prompting sign-in");
      onAuthRequired?.();
      return;
    }
    
    // User is authenticated, open settings
    console.log("User authenticated, opening settings");
    onSettingsClick?.();
  };

  const handleFlavrPlusClick = () => {
    navigate('/flavr-plus');
  };
  return (
    <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4 pointer-events-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Hamburger Menu */}
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => {
            console.log("Menu clicked");
            onMenuClick?.();
          }}
          className="text-white hover:bg-white/10 relative z-10"
        >
          <Menu className="w-6 h-6" />
        </Button>

        {/* Center: Chef Hat Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
          <img src={FlavrLogo} alt="Flavr" className="w-10 h-10" />
        </div>

        {/* Right: Flavr+ and Settings */}
        <div className="flex items-center gap-2">
          {/* Show Flavr+ button only if user is not already a Flavr+ member */}
          {(!user?.hasFlavrPlus) && (
            <Button 
              variant="ghost"
              size="sm"
              onClick={handleFlavrPlusClick}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 font-medium px-2 py-1 text-sm relative z-10 border border-orange-400/30 hover:border-orange-400/50"
            >
              <Crown className="w-4 h-4 mr-1" />
              Plus
            </Button>
          )}
          
          <Button 
            variant="ghost"
            size="icon"
            onClick={handleSettingsClick}
            className="text-white hover:bg-white/10 relative z-10"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}