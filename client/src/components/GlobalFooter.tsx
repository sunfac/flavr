import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/iconMap";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

interface GlobalFooterProps {
  currentMode?: "discover" | "plan" | "capture" | "cookbook";
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
      id: "discover",
      label: "Discover",
      icon: iconMap.chefHat,
      path: "/chef-assist",
    },
    {
      id: "plan",
      label: "Plan",
      icon: iconMap.calendar,
      path: "/weekly-planner",
    },
    {
      id: "capture",
      label: "Capture",
      icon: iconMap.camera,
      path: "/photo-to-recipe",
    },
    {
      id: "cookbook",
      label: "Cookbook", 
      icon: iconMap.bookOpen,
      path: "/cookbook",
    },
  ];

  return (
    <footer className={`global-footer fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border transition-transform duration-300 ease-in-out ${
      isKeyboardVisible ? 'transform translate-y-full' : 'transform translate-y-0'
    }`}>
      <div className="px-4 py-3">
        <div className="flex justify-around items-center max-w-lg mx-auto gap-2">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;
            
            return (
              <Button
                key={mode.id}
                variant="ghost"
                size="sm"
                onClick={() => navigate(mode.path)}
                className={`flex flex-col items-center gap-1 h-auto py-3 px-4 min-w-[70px] ${
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium whitespace-nowrap">{mode.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}