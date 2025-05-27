import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import UpgradeModal from "@/components/UpgradeModal";
import { Calendar, Crown, Lock, Star, Clock, ChefHat } from "lucide-react";

export default function FlavrRituals() {
  const [, navigate] = useLocation();
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Get user authentication status
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const isAuthenticated = !!user?.user;
  const hasFlavrPlus = user?.user?.hasFlavrPlus || false;

  // Close all menus
  const closeAllMenus = () => {
    setShowNavigation(false);
    setShowSettings(false);
    setShowUserMenu(false);
  };

  // Open specific menu and close others
  const openMenu = (menuType: 'navigation' | 'settings' | 'userMenu') => {
    closeAllMenus();
    if (menuType === 'navigation') setShowNavigation(true);
    if (menuType === 'settings') setShowSettings(true);
    if (menuType === 'userMenu') setShowUserMenu(true);
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const mockRituals = [
    {
      id: 1,
      title: "Mediterranean Monday",
      description: "Start your week with fresh, vibrant Mediterranean flavors",
      meals: ["Greek Breakfast Bowl", "Quinoa Tabbouleh", "Herb-Crusted Salmon"],
      duration: "7 days",
      difficulty: "Easy",
      image: "🏺"
    },
    {
      id: 2, 
      title: "Comfort Food Wednesday",
      description: "Midweek warmth with soul-satisfying comfort classics",
      meals: ["Fluffy Pancakes", "Mac & Cheese", "Beef Stew"],
      duration: "7 days",
      difficulty: "Medium",
      image: "🥘"
    },
    {
      id: 3,
      title: "Fresh Friday Feast",
      description: "End your week with light, refreshing seasonal dishes",
      meals: ["Avocado Toast", "Poke Bowl", "Grilled Vegetables"],
      duration: "7 days", 
      difficulty: "Easy",
      image: "🥗"
    }
  ];

  const RitualCard = ({ ritual, isBlurred = false }: { ritual: any, isBlurred?: boolean }) => (
    <Card className={`relative overflow-hidden ${isBlurred ? 'filter blur-sm' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="text-3xl">{ritual.image}</div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {ritual.duration}
          </div>
        </div>
        <CardTitle className="text-lg font-semibold text-white">{ritual.title}</CardTitle>
        <p className="text-sm text-slate-400">{ritual.description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-400">{ritual.difficulty}</span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Weekly Menu:</p>
            {ritual.meals.map((meal: string, index: number) => (
              <p key={index} className="text-xs text-slate-400">• {meal}</p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const PremiumOverlay = () => (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
      <div className="text-center space-y-4 p-6">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Flavr Rituals are exclusive to Flavr+</h3>
          <p className="text-sm text-slate-400 mb-4">Unlock weekly meal plans and premium features</p>
          <Button 
            onClick={handleUpgradeClick}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade for weekly meal plans
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <GlobalHeader 
        onMenuClick={() => openMenu('navigation')}
        onSettingsClick={() => openMenu('settings')}
        onAuthRequired={() => navigate("/")}
      />
      
      <main className="pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Calendar className="w-8 h-8 text-orange-400" />
              <h1 className="text-3xl font-bold text-white">Flavr Rituals</h1>
              {hasFlavrPlus && <Crown className="w-6 h-6 text-orange-400" />}
            </div>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Weekly curated meal plans designed to transform your cooking routine into delicious rituals
            </p>
          </div>

          {/* Premium Status Banner */}
          {hasFlavrPlus ? (
            <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-4 mb-8">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-medium">Flavr+ Active</span>
                <span className="text-slate-400 text-sm">• Unlimited ritual access</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 mb-8">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-400" />
                <span className="text-slate-400">Free users get a preview of Flavr Rituals</span>
              </div>
            </div>
          )}

          {/* Rituals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
            {mockRituals.map((ritual) => (
              <div key={ritual.id} className="relative">
                <RitualCard ritual={ritual} isBlurred={!hasFlavrPlus} />
                {!hasFlavrPlus && <PremiumOverlay />}
              </div>
            ))}
          </div>

          {/* Bottom CTA for Free Users */}
          {!hasFlavrPlus && (
            <div className="text-center mt-12">
              <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-600">
                <h3 className="text-xl font-bold text-white mb-4">Ready to start your culinary rituals?</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Join Flavr+ to unlock unlimited weekly meal plans, premium recipes, and personalized cooking guidance
                </p>
                <Button 
                  onClick={handleUpgradeClick}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Upgrade to Flavr+ - £4.99/month
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <GlobalFooter currentMode="rituals" />
      
      {showNavigation && <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />}
      {showSettings && <SettingsPanel onClose={closeAllMenus} />}
      {showUserMenu && <UserMenu onClose={closeAllMenus} />}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title="Unlock Flavr Rituals"
          description="Get access to weekly meal plans, unlimited recipes, and premium cooking features"
        />
      )}
    </div>
  );
}