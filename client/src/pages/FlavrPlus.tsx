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
import { iconMap } from "@/lib/iconMap";

export default function FlavrPlus() {
  const [, navigate] = useLocation();
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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
    // For now, just show a coming soon message
    alert("Stripe integration coming soon! This will redirect to secure payment processing.");
  };

  const features = [
    {
      icon: {React.createElement(iconMap.sparkles, { className="w-5 h-5 text-orange-400" / })},
      title: "Unlimited Recipes",
      description: "Generate as many recipes as you want, no monthly limits"
    },
    {
      icon: {React.createElement(iconMap.crown, { className="w-5 h-5 text-orange-400" / })},
      title: "GPT-4 Turbo",
      description: "Access to the most advanced AI for smarter, more creative recipes"
    },
    {
      icon: <Image className="w-5 h-5 text-orange-400" />,
      title: "Premium Images",
      description: "High-quality DALL·E generated images for every recipe"
    },
    {
      icon: {React.createElement(iconMap.calendar, { className="w-5 h-5 text-orange-400" / })},
      title: "Flavr Rituals",
      description: "Weekly curated meal plans and cooking challenges"
    }
  ];

  if (hasFlavrPlus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <GlobalHeader 
          onMenuClick={() => openMenu('navigation')}
          onSettingsClick={() => openMenu('settings')}
          onAuthRequired={() => navigate("/")}
        />
        
        <main className="pt-20 pb-24 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                {React.createElement(iconMap.crown, { className="w-8 h-8 text-white" / })}
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">You're already a Flavr+ member!</h1>
              <p className="text-slate-400 mb-6">
                Enjoy unlimited recipes, premium features, and exclusive content.
              </p>
              <Button 
                onClick={() => navigate('/flavr-rituals')}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
              >
                {React.createElement(iconMap.calendar, { className="w-4 h-4 mr-2" / })}
                Explore Flavr Rituals
              </Button>
            </div>
          </div>
        </main>

        <GlobalFooter currentMode="chef" />
        
        {showNavigation && <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />}
        {showSettings && <SettingsPanel onClose={closeAllMenus} />}
        {showUserMenu && {React.createElement(iconMap.userMenu, { onClose={closeAllMenus} / })}}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <GlobalHeader 
        onMenuClick={() => openMenu('navigation')}
        onSettingsClick={() => openMenu('settings')}
        onAuthRequired={() => navigate("/")}
      />
      
      <main className="pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-6">
              {React.createElement(iconMap.crown, { className="w-12 h-12 text-orange-400" / })}
              <h1 className="text-4xl font-bold text-white">Flavr+</h1>
            </div>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Unlock the full power of AI-driven cooking with unlimited recipes, premium features, and exclusive content
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-lg mx-auto mb-12">
            <Card className="bg-slate-800/50 border-orange-500/20 border-2">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium inline-block mb-4">
                  Most Popular
                </div>
                <CardTitle className="text-3xl font-bold text-white">£4.99</CardTitle>
                <p className="text-slate-400">per month</p>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleUpgradeClick}
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold mb-6"
                >
                  {React.createElement(iconMap.crown, { className="w-5 h-5 mr-2" / })}
                  Start Your Flavr+ Journey
                </Button>
                
                <div className="text-center text-sm text-slate-400">
                  Cancel anytime • Secure payment with Stripe
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="bg-slate-800/30 border-slate-600">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-slate-400 text-sm">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Section */}
          <div className="bg-slate-800/30 rounded-lg p-8">
            <h3 className="text-xl font-bold text-white text-center mb-8">Free vs Flavr+</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-slate-300 mb-4">Free Plan</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li>• 3 recipes per month</li>
                  <li>• Basic recipe generation</li>
                  <li>• Standard images</li>
                  <li>• Limited customization</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-orange-400 mb-4 flex items-center gap-2">
                  {React.createElement(iconMap.star, { className="w-4 h-4" / })}
                  Flavr+ Plan
                </h4>
                <ul className="space-y-2 text-sm text-white">
                  <li className="flex items-center gap-2">
                    {React.createElement(iconMap.check, { className="w-4 h-4 text-green-400" / })}
                    Unlimited recipes
                  </li>
                  <li className="flex items-center gap-2">
                    {React.createElement(iconMap.check, { className="w-4 h-4 text-green-400" / })}
                    GPT-4 Turbo AI
                  </li>
                  <li className="flex items-center gap-2">
                    {React.createElement(iconMap.check, { className="w-4 h-4 text-green-400" / })}
                    Premium DALL·E images
                  </li>
                  <li className="flex items-center gap-2">
                    {React.createElement(iconMap.check, { className="w-4 h-4 text-green-400" / })}
                    Flavr Rituals access
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <GlobalFooter currentMode="chef" />
      
      {showNavigation && <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />}
      {showSettings && <SettingsPanel onClose={closeAllMenus} />}
      {showUserMenu && {React.createElement(iconMap.userMenu, { onClose={closeAllMenus} / })}}
    </div>
  );
}