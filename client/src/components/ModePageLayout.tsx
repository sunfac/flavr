import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import GlobalFooter from "./GlobalFooter";

interface ModePageLayoutProps {
  children: ReactNode;
  title: string;
  currentMode?: "chef-assist" | "cookbook" | "capture" | "weekly-planner" | "fridge2fork";
  className?: string;
  onBackClick?: () => void;
}

export function ModePageLayout({ 
  children, 
  title, 
  currentMode = "capture",
  className,
  onBackClick
}: ModePageLayoutProps) {
  const [, navigate] = useLocation();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
      return;
    }

    // Try to go back in history first
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to mode selection page
      navigate("/app");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="text-white hover:bg-white/10 flex items-center gap-2"
            data-testid="button-back-capture"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <h1 className="text-lg font-semibold text-white truncate mx-4">
            {title}
          </h1>
          
          {/* Spacer to center the title */}
          <div className="w-16"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("relative z-10 pb-20", className)}>
        {children}
      </main>

      {/* Global Footer */}
      <GlobalFooter currentMode={currentMode} />
    </div>
  );
}