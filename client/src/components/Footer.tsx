import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface FooterProps {
  currentMode?: "shopping" | "fridge" | "chef";
}

export default function Footer({ currentMode }: FooterProps) {
  const [, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
      <div className="grid grid-cols-4 h-16">
        <Button
          variant="ghost"
          className={`flex flex-col items-center justify-center space-y-1 h-full rounded-none ${
            currentMode === "shopping" ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => navigate("/shopping")}
        >
          <i className="fas fa-shopping-cart text-lg"></i>
          <span className="text-xs font-medium">Shopping</span>
        </Button>
        
        <Button
          variant="ghost"
          className={`flex flex-col items-center justify-center space-y-1 h-full rounded-none ${
            currentMode === "fridge" ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => navigate("/fridge")}
        >
          <i className="fas fa-refrigerator text-lg"></i>
          <span className="text-xs font-medium">Fridge</span>
        </Button>
        
        <Button
          variant="ghost"
          className={`flex flex-col items-center justify-center space-y-1 h-full rounded-none ${
            currentMode === "chef" ? "text-primary" : "text-muted-foreground"
          }`}
          onClick={() => navigate("/chef")}
        >
          <i className="fas fa-chef-hat text-lg"></i>
          <span className="text-xs font-medium">Chef</span>
        </Button>
        
        <Button
          variant="ghost"
          className="flex flex-col items-center justify-center space-y-1 h-full rounded-none text-muted-foreground"
          onClick={() => navigate("/settings")}
        >
          <i className="fas fa-history text-lg"></i>
          <span className="text-xs font-medium">History</span>
        </Button>
      </div>
    </nav>
  );
}
