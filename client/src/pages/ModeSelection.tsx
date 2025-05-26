import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Refrigerator, ChefHat, Clock } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import { getRemainingRecipes } from "@/lib/quotaManager";

export default function ModeSelection() {
  const [, navigate] = useLocation();
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Check if user is logged in for quota display
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const isAuthenticated = user?.user;

  const modes = [
    {
      id: "shopping",
      title: "Shopping Mode",
      icon: ShoppingCart,
      description: "Get personalized recipes with complete shopping lists tailored to your preferences and budget",
      gradient: "gradient-primary",
      color: "orange"
    },
    {
      id: "fridge",
      title: "Fridge to Fork",
      icon: Refrigerator,
      description: "Transform available ingredients into delicious meals with zero waste and maximum creativity",
      gradient: "gradient-secondary",
      color: "emerald"
    },
    {
      id: "chef",
      title: "Chef Assist",
      icon: ChefHat,
      description: "Get expert-level guidance for special occasions and culinary ambitions",
      gradient: "gradient-accent",
      color: "amber"
    }
  ];

  const handleModeSelect = (modeId: string) => {
    navigate(`/app/${modeId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      {/* Consistent header across all modes */}
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => setShowSettings(true)}
        onUserClick={() => setShowUserMenu(true)}
      />
      
      {/* Recipe Remaining Banner - positioned below header with proper spacing */}
      {!isAuthenticated && (
        <div className="w-full bg-card/90 backdrop-blur-sm border-b border-border mt-16 md:mt-20">
          <div className="max-w-sm mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-1.5 text-xs md:text-sm text-muted-foreground">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span>{getRemainingRecipes()} free recipes remaining</span>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-6 py-8 relative z-10 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-12 pt-20">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Choose Your Mode
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Select how you'd like to create your next amazing meal with AI
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {modes.map((mode, index) => (
            <Card 
              key={mode.id}
              className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 group shadow-2xl hover:shadow-orange-500/25 transition-all duration-500 cursor-pointer hover:scale-105"
              onClick={() => handleModeSelect(mode.id)}
            >
              <CardHeader className="text-center pb-4">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-xl">
                    <mode.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-2">
                  {mode.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="text-center pb-8">
                <p className="text-slate-600 leading-relaxed mb-6">
                  {mode.description}
                </p>
                <Button 
                  className="w-full h-14 text-white font-bold shadow-xl transition-all duration-500 hover:scale-105 relative overflow-hidden group"
                  style={{ background: `var(--gradient-${mode.id === 'shopping' ? 'primary' : mode.id === 'fridge' ? 'secondary' : 'accent'})` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleModeSelect(mode.id);
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <span className="relative z-10 tracking-wide text-lg">Start {mode.title}</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Back to Landing */}
        <div className="text-center mt-12">
          <Button
            variant="ghost"
            className="text-slate-600 hover:text-slate-800 transition-colors"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </Button>
        </div>
      </main>

      {/* Consistent footer across all modes */}
      <GlobalFooter />

      {/* Navigation overlays */}
      {showNavigation && (
        <GlobalNavigation onClose={() => setShowNavigation(false)} />
      )}
      
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
      
      {showUserMenu && (
        <UserMenu onClose={() => setShowUserMenu(false)} />
      )}
    </div>
  );
}