import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/iconMap";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

interface GlobalFooterProps {
  currentMode?: "fridge2fork" | "chef-assist" | "cookbook" | "chat";
}

export default function GlobalFooter({ currentMode }: GlobalFooterProps) {
  const [, navigate] = useLocation();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const heightDifference = initialViewportHeight - currentHeight;
        // Consider keyboard visible if viewport shrunk by more than 150px
        setIsKeyboardVisible(heightDifference > 150);
      }
    };

    // Listen for visual viewport changes (keyboard show/hide)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }

    // Fallback for older browsers
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      setIsKeyboardVisible(heightDifference > 150);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const modes = [
    {
      id: "fridge2fork",
      label: "Fridge2Fork",
      icon: iconMap.refrigerator,
      path: "/fridge2fork",
    },
    {
      id: "chef-assist",
      label: "Chef Assist",
      icon: iconMap.chefHat,
      path: "/chef-assist",
    },
    {
      id: "chat",
      label: "Chat Mode",
      icon: iconMap.messageCircle,
      path: "/chat",
    },
    {
      id: "cookbook",
      label: "My Cookbook", 
      icon: iconMap.bookOpen,
      path: "/cookbook",
    },
  ];

  return (
    <footer className={`global-footer fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700 transition-transform duration-300 ease-in-out ${
      isKeyboardVisible ? 'transform translate-y-full' : 'transform translate-y-0'
    }`}>
      <div className="px-4 py-3">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;
            
            return (
              <Button
                key={mode.id}
                variant="ghost"
                size="sm"
                onClick={() => navigate(mode.path)}
                className={`flex flex-col items-center space-y-1 h-auto py-2 px-3 ${
                  isActive 
                    ? 'text-orange-400 bg-orange-500/10' 
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{mode.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}