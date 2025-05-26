import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";
import FlavrFullLogo from "@assets/DB23351A-869B-42C9-A1B2-E6C2685B7586.png";
import HeroFoodImage from "@assets/3D8C8E94-9BC0-4F6A-95F2-8951941A709B.png";
import { motion } from "framer-motion";
import { ChefHat, Sparkles, Timer, Star, ArrowRight, Menu, Settings, User, ChevronUp } from "lucide-react";
import AuthModal from "@/components/AuthModal";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // User query
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/me'],
    enabled: true,
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user?.user) {
      navigate("/shopping");
    }
  }, [user, navigate]);

  const loginMutation = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      apiRequest("POST", "/api/auth/login", credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setShowAuthModal(false);
      toast({
        title: "Welcome back! 👋",
        description: "Ready to start cooking?",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: (userData: { username: string; email: string; password: string }) =>
      apiRequest("POST", "/api/register", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setShowAuthModal(false);
      toast({
        title: "Welcome to Flavr! 🎉",
        description: "Your culinary journey begins now",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleStartCooking = () => {
    console.log("Button clicked! User:", user);
    // Always navigate to app - let quota system handle auth when needed
    navigate("/app");
  };

  const handleLogin = () => {
    setAuthMode("login");
    setShowAuthModal(true);
  };

  // Show loading while checking auth
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't render if user is logged in (will redirect)
  if (user?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Premium dark background matching logo's black elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle orange glow that matches the chef hat's orange speech bubble */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-orange-500/15 via-orange-400/8 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-radial from-orange-300/10 to-transparent rounded-full blur-2xl"></div>
        {/* Dark ambient lighting that blends with logo's black outline */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/30 via-transparent to-black/50"></div>
      </div>

      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => setShowSettings(true)}
        onUserClick={() => {
          setAuthMode("signup");
          setShowAuthModal(true);
        }}
      />

      {/* Navigation Bar */}
      <nav className="absolute top-20 left-0 right-0 z-40 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-full px-6 py-3 flex justify-center space-x-8">
            <button 
              onClick={() => scrollToSection('hero')}
              className="text-white/80 hover:text-white transition-colors duration-300 text-sm font-medium"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('features')}
              className="text-white/80 hover:text-white transition-colors duration-300 text-sm font-medium"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('demo')}
              className="text-white/80 hover:text-white transition-colors duration-300 text-sm font-medium"
            >
              Demo
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className="text-white/80 hover:text-white transition-colors duration-300 text-sm font-medium"
            >
              Flavr+
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Viewport */}
      <section id="hero" className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative z-10 pt-16">
        {/* Large Premium Logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative group mb-2 mt-8"
        >
          <div className="w-80 h-80 md:w-[28rem] md:h-[28rem] mx-auto mb-2">
            <img 
              src={FlavrFullLogo} 
              alt="Flavr - Your Private Chef"
              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="absolute inset-0 rounded-full blur-[100px] opacity-15 bg-gradient-to-b from-orange-300 via-orange-400 to-transparent group-hover:opacity-25 transition-opacity duration-500"></div>
        </motion.div>

        {/* Hero Headlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-4"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-4">
            Your Private Chef.
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              Anywhere.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-light max-w-3xl mx-auto leading-relaxed">
            Recipes personalized to your cravings, mood, time, and skill level.
          </p>
        </motion.div>

        {/* CTA Button - Prominent on Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-8"
        >
          <Button 
            onClick={handleStartCooking}
            className="px-8 py-6 md:px-12 md:py-6 text-lg md:text-xl font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 border-0 shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 text-white rounded-full w-full max-w-xs md:w-auto"
          >
            Get Cooking Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Crafted for Your Kitchen
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Experience cooking like never before with AI that understands your taste, time, and skill.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ChefHat,
                title: "Chef-Crafted Recipes",
                description: "Recipes tailored to your preferences, dietary needs, and cooking expertise."
              },
              {
                icon: Sparkles,
                title: "Smart AI Adaptation",
                description: "Our AI learns and adapts as you cook, making each recipe better than the last."
              },
              {
                icon: Timer,
                title: "Time-Based Cooking",
                description: "Perfect recipes whether you have 15 minutes or 3 hours to create something amazing."
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 group"
              >
                <feature.icon className="w-12 h-12 text-orange-400 mb-6 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-slate-300 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Recipe Demo Section */}
      <section id="demo" className="py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              See Flavr in Action
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Watch how our AI transforms your cooking experience with real-time guidance and suggestions.
            </p>
          </motion.div>

          {/* Side-by-side layout */}
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Food Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <img
                src={HeroFoodImage}
                alt="Gourmet short rib with pea purée"
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent"></div>
            </motion.div>

            {/* Chat Interface */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full max-w-md mx-auto lg:mx-0"
            >
              {/* Chat Container */}
              <div className="bg-white/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-2xl">
                {/* Chat Header */}
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-200">
                  <img src={FlavrLogo} alt="Flavr AI" className="w-10 h-10" />
                  <div>
                    <p className="font-semibold text-slate-800 text-lg">Flavr AI</p>
                    <p className="text-sm text-slate-500">Your cooking assistant</p>
                  </div>
                  <div className="ml-auto w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                
                {/* Chat Messages */}
                <div className="space-y-4 mb-6">
                  {/* Recipe Title */}
                  <div className="bg-slate-100 rounded-xl p-4">
                    <p className="font-semibold text-slate-800">Red Wine Braised Short Rib</p>
                    <p className="text-slate-600 text-sm">with Pea Purée & Miso Glaze</p>
                  </div>
                  
                  {/* AI Messages */}
                  <div className="bg-orange-500 text-white rounded-xl p-4 rounded-tl-sm">
                    <p className="text-sm">Here's how to elevate it with a miso glaze ✨</p>
                  </div>
                  
                  <div className="bg-orange-500 text-white rounded-xl p-4 rounded-tl-sm">
                    <p className="text-sm">Would you like a wine pairing? 🍷</p>
                  </div>
                  
                  <div className="bg-orange-500 text-white rounded-xl p-4 rounded-tl-sm">
                    <p className="text-sm">Add a complementary side dish? 🥗</p>
                  </div>
                </div>
                
                {/* Chat Input */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-slate-100 rounded-full px-4 py-3">
                      <p className="text-sm text-slate-500">Ask about wine pairings...</p>
                    </div>
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors cursor-pointer">
                      <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Flavr+ CTA Section */}
      <section id="pricing" className="py-16 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-8 md:p-12 text-center shadow-2xl"
          >
            {/* Logo and title */}
            <div className="flex items-center justify-center mb-6">
              <img src={FlavrLogo} alt="Flavr+" className="w-12 h-12 mr-3" />
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Flavr+
              </h2>
            </div>
            
            {/* Headline */}
            <h3 className="text-xl md:text-2xl font-semibold text-white mb-4">
              Take Your Kitchen to the Next Level
            </h3>
            
            {/* Description */}
            <p className="text-base text-orange-50 mb-8 max-w-2xl mx-auto">
              Unlock unlimited recipes, advanced dietary filtering, wine pairings, personalized meal plans, and exclusive chef techniques.
            </p>
            
            {/* CTA Button */}
            <Button 
              className="px-8 py-3 text-base font-semibold bg-white text-orange-600 hover:bg-orange-50 shadow-xl hover:scale-105 transition-all duration-300 rounded-full"
            >
              Upgrade to Flavr+ 
              <Star className="ml-2 w-4 h-4 fill-current" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <img src={FlavrLogo} alt="Flavr" className="w-8 h-8 mr-3" />
            <p className="text-slate-400">© 2025 Flavr. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            {["Privacy", "Terms", "Instagram", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-slate-400 hover:text-orange-400 transition-colors duration-300"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 hover:scale-110"
        >
          <ChevronUp className="w-6 h-6" />
        </motion.button>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          navigate("/app");
        }}
        title={authMode === "login" ? "Welcome back!" : "Join Flavr today!"}
        description={authMode === "login" ? "Sign in to continue your culinary journey" : "Create your account to unlock personalized AI-generated recipes"}
      />

      {/* Navigation Panel */}
      {showNavigation && (
        <GlobalNavigation onClose={() => setShowNavigation(false)} />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* User Menu */}
      {showUserMenu && (
        <UserMenu onClose={() => setShowUserMenu(false)} />
      )}
    </div>
  );
}