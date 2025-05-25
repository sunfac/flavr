import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface FooterProps {
  currentMode?: "shopping" | "fridge" | "chef";
}

export default function Footer({ currentMode }: FooterProps) {
  const [, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/20 z-30 backdrop-blur-xl">
      <div className="grid grid-cols-4 h-20 px-2">
        <Button
          variant="ghost"
          className={`flex flex-col items-center justify-center space-y-1 h-full rounded-xl mx-1 transition-all duration-300 group ${
            currentMode === "shopping" 
              ? "gradient-primary text-white shadow-lg scale-105" 
              : "text-slate-600 hover:text-slate-800 hover:scale-105 hover:bg-white/20"
          }`}
          onClick={() => navigate("/shopping")}
        >
          <i className="fas fa-shopping-cart text-xl group-hover:scale-110 transition-transform"></i>
          <span className="text-xs font-medium">Shopping</span>
        </Button>
        
        <Button
          variant="ghost"
          className={`flex flex-col items-center justify-center space-y-1 h-full rounded-xl mx-1 transition-all duration-300 group ${
            currentMode === "fridge" 
              ? "gradient-secondary text-white shadow-lg scale-105" 
              : "text-slate-600 hover:text-slate-800 hover:scale-105 hover:bg-white/20"
          }`}
          onClick={() => navigate("/fridge")}
        >
          <i className="fas fa-refrigerator text-xl group-hover:scale-110 transition-transform"></i>
          <span className="text-xs font-medium">Fridge</span>
        </Button>
        
        <Button
          variant="ghost"
          className={`flex flex-col items-center justify-center space-y-1 h-full rounded-xl mx-1 transition-all duration-300 group ${
            currentMode === "chef" 
              ? "gradient-accent text-white shadow-lg scale-105" 
              : "text-slate-600 hover:text-slate-800 hover:scale-105 hover:bg-white/20"
          }`}
          onClick={() => navigate("/chef")}
        >
          <i className="fas fa-chef-hat text-xl group-hover:scale-110 transition-transform"></i>
          <span className="text-xs font-medium">Chef</span>
        </Button>
        
        <Button
          variant="ghost"
          className="flex flex-col items-center justify-center space-y-1 h-full rounded-xl mx-1 text-slate-600 hover:text-slate-800 hover:scale-105 hover:bg-white/20 transition-all duration-300 group"
          onClick={() => navigate("/settings")}
        >
          <i className="fas fa-history text-xl group-hover:scale-110 transition-transform"></i>
          <span className="text-xs font-medium">History</span>
        </Button>
      </div>
    </nav>
  );
}
