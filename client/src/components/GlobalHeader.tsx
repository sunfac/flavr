import { Button } from "@/components/ui/button";
import { Menu, Settings, Crown, Home, Calendar, CreditCard } from "lucide-react";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";

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
  const [location, navigate] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Check authentication status
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const handleSettingsClick = () => {
    console.log("Settings clicked");
    console.log("User data:", user);
    
    // Always allow navigation to settings/flavr-plus page
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
            console.log("Menu clicked - toggling menu");
            setIsMenuOpen(!isMenuOpen);
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
          {(!user?.user?.hasFlavrPlus) && (
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

      {/* Dropdown Navigation Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <nav className="flex flex-col space-y-3">
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/');
                  setIsMenuOpen(false);
                }}
                className="justify-start text-white hover:bg-white/10 px-4 py-3"
              >
                <Home className="w-5 h-5 mr-3" />
                Home
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/flavr-rituals');
                  setIsMenuOpen(false);
                }}
                className="justify-start text-white hover:bg-white/10 px-4 py-3"
              >
                <Calendar className="w-5 h-5 mr-3" />
                Flavr Rituals
              </Button>
              
              {(!user?.user?.hasFlavrPlus) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/flavr-plus');
                    setIsMenuOpen(false);
                  }}
                  className="justify-start text-orange-400 hover:bg-orange-500/10 px-4 py-3"
                >
                  <Crown className="w-5 h-5 mr-3" />
                  Upgrade to Flavr+
                </Button>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}