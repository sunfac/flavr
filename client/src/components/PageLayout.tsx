import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import GlobalHeader from "./GlobalHeader";
import GlobalFooter from "./GlobalFooter";
import GlobalNavigation from "./GlobalNavigation";
import { useState } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  const [showNavigation, setShowNavigation] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => {}}
      />
      
      <main className={cn("container mx-auto px-6 py-6 relative z-10 pb-32 pt-20", className)}>
        {children}
      </main>

      <GlobalFooter />

      <GlobalNavigation 
        isOpen={showNavigation}
        onClose={() => setShowNavigation(false)} 
      />
    </div>
  );
}