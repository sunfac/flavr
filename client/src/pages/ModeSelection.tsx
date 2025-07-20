import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Refrigerator, ChefHat, Clock, Calendar, Crown, PiggyBank } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { iconMap } from "@/lib/iconMap";
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

  const isAuthenticated = user?.user?.id;

  const modes = [
    {
      id: "shopping",
      title: "Shopping Mode",
      icon: ShoppingCart,
      description: "Personalized recipes with shopping lists",
      subtitle: "Perfect for meal planning & grocery runs"
    },
    {
      id: "fridge",
      title: "Fridge to Fork",
      icon: Refrigerator,
      description: "Transform what you have into meals",
      subtitle: "Zero waste, maximum creativity"
    },
    {
      id: "chef",
      title: "Chef Assist",
      icon: ChefHat,
      description: "Expert guidance for special occasions",
      subtitle: "Elevate your culinary skills"
    },
    {
      id: "budget-planner",
      title: "Budget Planner",
      icon: PiggyBank,
      description: "Weekly meal plans optimized for your budget",
      subtitle: "Smart shopping, authentic recipes, maximum value"
    },
    {
      id: "flavr-rituals",
      title: "Flavr Rituals",
      icon: Calendar,
      description: "Weekly meal planning with smart shopping",
      subtitle: "Plan ahead, waste less, eat better",
      premium: true
    }
  ];

  const handleModeSelect = (modeId: string) => {
    if (modeId === "flavr-rituals") {
      navigate("/flavr-rituals");
    } else if (modeId === "budget-planner") {
      navigate("/budget-planner");
    } else {
      navigate(`/app/${modeId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      {/* Consistent header across all modes */}
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => setShowSettings(true)}
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

      <main className="container mx-auto px-6 py-6 relative z-10 pb-24">
        {/* Minimal Hero Section */}
        <div className="text-center mb-8 pt-12">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Choose Your Mode
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
            How would you like to cook today?
          </p>
        </div>

        {/* Minimal Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {modes.map((mode, index) => (
            <Card 
              key={mode.id}
              className="bg-card/90 backdrop-blur-xl border border-border/50 group shadow-lg hover:shadow-orange-500/20 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-orange-500/40 relative"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleModeSelect(mode.id);
              }}
            >
              <CardContent className="text-center p-8">
                {mode.premium && (
                  <Badge className="absolute top-3 right-3 bg-gradient-to-r from-orange-400 to-red-400 text-white border-0 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Plus
                  </Badge>
                )}
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg">
                    <mode.icon className="w-7 h-7 text-orange-400 group-hover:text-orange-300 transition-colors duration-300" strokeWidth={1.5} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-orange-600/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-orange-300 transition-colors duration-300">
                  {mode.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed mb-1">
                  {mode.description}
                </p>
                
                <p className="text-muted-foreground/70 text-xs">
                  {mode.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
          

        </div>
        
        {/* Digital Cookbook Button */}
        <div className="text-center mt-8">
          <Button
            onClick={() => navigate("/cookbook")}
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 mb-4"
          >
            <iconMap.book className="w-4 h-4 mr-2" />
            My Digital Cookbook
          </Button>
          <p className="text-sm text-muted-foreground/60">
            Tap any mode to get started with personalized recipes
          </p>
        </div>
      </main>

      {/* Consistent footer across all modes */}
      <GlobalFooter />

      {/* Navigation overlays */}
      <GlobalNavigation 
        isOpen={showNavigation}
        onClose={() => setShowNavigation(false)} 
      />
      
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
      
      {showUserMenu && (
        <UserMenu onClose={() => setShowUserMenu(false)} />
      )}
    </div>
  );
}