import { Button } from "@/components/ui/button";
import { Menu, Settings, User } from "lucide-react";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";

interface GlobalHeaderProps {
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  onAuthRequired?: () => void;
}

export default function GlobalHeader({ 
  onMenuClick, 
  onSettingsClick, 
  onUserClick 
}: GlobalHeaderProps) {
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

        {/* Right: Settings */}
        <div className="flex items-center">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log("Settings clicked");
              onSettingsClick?.();
            }}
            className="text-white hover:bg-white/10 relative z-10"
          >
            <Settings className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}