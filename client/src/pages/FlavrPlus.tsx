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
import { Crown, Check, Sparkles, Image, Calendar, Star } from "lucide-react";

export default function FlavrPlus() {
  const [, navigate] = useLocation();
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Get user authentication status
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const isAuthenticated = !!(user as any)?.user;
  const hasFlavrPlus = (user as any)?.user?.hasFlavrPlus || false;

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
    // Navigate to subscribe page with Stripe integration
    navigate("/subscribe");
  };

  const features = [
    {
      icon: <Sparkles className="w-5 h-5 text-orange-400" />,
      title: "Unlimited Recipes",
      description: "Generate as many recipes as you want, no monthly limits"
    },
    {
      icon: <Crown className="w-5 h-5 text-orange-400" />,
      title: "GPT-4 Turbo",
      description: "Access to the most advanced AI for smarter, more creative recipes"
    },
    {
      icon: <Image className="w-5 h-5 text-orange-400" />,
      title: "Premium Images",
      description: "High-quality DALL·E generated images for every recipe"
    },
    {
      icon: <Calendar className="w-5 h-5 text-orange-400" />,
      title: "Weekly Planner",
      description: "AI-generated meal plans with shopping lists and .ics export"
    }
  ];

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

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
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">You're already a Flavr+ member!</h1>
              <p className="text-slate-400 mb-6">
                Enjoy unlimited recipes, premium features, and exclusive content.
              </p>
              <Button 
                onClick={() => navigate('/weekly-planner')}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Open Weekly Planner
              </Button>
            </div>
          </div>
        </main>

        <GlobalFooter currentMode="chef-assist" />
        
        {showNavigation && <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />}
        {showSettings && <SettingsPanel onClose={closeAllMenus} />}
        {showUserMenu && <UserMenu onClose={closeAllMenus} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-orange-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600 rounded-full blur-3xl"></div>
      </div>
      
      <GlobalHeader 
        onMenuClick={() => openMenu('navigation')}
        onSettingsClick={() => openMenu('settings')}
        onAuthRequired={() => navigate("/")}
      />
      
      <main className="pt-20 pb-24 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative">
                <Crown className="w-14 h-14 text-orange-400 drop-shadow-lg" />
                <div className="absolute -inset-2 bg-orange-400/20 rounded-full blur-xl"></div>
              </div>
              <h1 className="text-5xl font-bold text-white bg-gradient-to-r from-white to-orange-100 bg-clip-text">Flavr+</h1>
            </div>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Unlock the full power of AI-driven cooking with unlimited recipes, premium features, and exclusive content
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-orange-400">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">Join thousands of premium chefs</span>
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          {/* Pricing Card */}
          <div className="max-w-lg mx-auto mb-12 relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl blur opacity-75"></div>
            <Card className="relative bg-slate-800/80 backdrop-blur-sm border-orange-500/30 border-2 shadow-2xl">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium inline-block mb-6 shadow-lg">
                  ⭐ Most Popular Choice
                </div>
                <div className="relative">
                  <CardTitle className="text-4xl font-bold text-white mb-2">£7.99</CardTitle>
                  <div className="absolute -top-2 -right-4 text-sm text-orange-400 font-medium">per month</div>
                </div>
                <p className="text-slate-300 text-sm">Unlimited access to everything</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button 
                  onClick={handleUpgradeClick}
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Crown className="w-6 h-6 mr-3" />
                  Start Your Flavr+ Journey
                </Button>
                
                <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Secure with Stripe</span>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-2">Trusted by premium chefs worldwide</div>
                  <div className="flex justify-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-orange-400 fill-current" />
                    ))}
                  </div>
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
                  <Star className="w-4 h-4" />
                  Flavr+ Plan
                </h4>
                <ul className="space-y-2 text-sm text-white">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Unlimited recipes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    GPT-4 Turbo AI
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Premium DALL·E images
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Weekly Planner with analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Savings & Waste Meter
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Monthly Taste Portrait
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <GlobalFooter currentMode="chef-assist" />
      
      {showNavigation && <GlobalNavigation onClose={closeAllMenus} onAuthRequired={() => navigate("/")} />}
      {showSettings && <SettingsPanel onClose={closeAllMenus} />}
      {showUserMenu && <UserMenu onClose={closeAllMenus} />}
    </div>
  );
}