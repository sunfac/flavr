import { Button } from "@/components/ui/button";
import { iconMap } from "@/lib/iconMap";
import { useLocation } from "wouter";

interface GlobalFooterProps {
  currentMode?: "fridge2fork" | "chef-assist" | "cookbook";
}

export default function GlobalFooter({ currentMode }: GlobalFooterProps) {
  const [, navigate] = useLocation();

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
      id: "cookbook",
      label: "My Cookbook", 
      icon: iconMap.bookOpen,
      path: "/cookbook",
    },
  ];

  return (
    <footer className="global-footer fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700">
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