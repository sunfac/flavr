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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 relative overflow-hidden font-['Inter'] text-slate-50">
      {/* Premium dark background with warm fade */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Elite ambient lighting */}
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-radial from-orange-500/12 via-amber-400/6 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-gradient-radial from-orange-300/8 to-transparent rounded-full blur-2xl"></div>
        {/* Sophisticated dark to warm fade */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-950/60 via-transparent to-amber-950/20"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-zinc-950/40 to-transparent"></div>
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

        {/* Hero Headlines - Premium Typography */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-white leading-[1.1] mb-6 font-['Plus_Jakarta_Sans']">
            Your Private Chef.
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent font-medium">
              Anywhere.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 font-light max-w-2xl mx-auto leading-relaxed tracking-wide">
            Recipes personalized to your cravings, mood, time, and skill level.
          </p>
        </motion.div>

        {/* Premium CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-12"
        >
          <Button 
            onClick={handleStartCooking}
            className="group relative px-8 py-4 md:px-10 md:py-5 text-base md:text-lg font-medium bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-orange-400/50 shadow-2xl hover:scale-[1.02] transition-all duration-300 text-white rounded-2xl"
          >
            <span className="relative z-10 flex items-center">
              Start Cooking with AI
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            <h2 className="text-3xl md:text-4xl font-light text-white mb-6 font-['Plus_Jakarta_Sans'] tracking-wide">
              Crafted for Your Kitchen
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
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

      {/* Central Animated CTA Block */}
      <section className="py-20 px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="bg-gradient-to-br from-orange-500/10 via-amber-400/5 to-orange-600/10 backdrop-blur-xl border border-orange-400/20 rounded-3xl p-12 md:p-16 relative overflow-hidden">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-transparent to-amber-500/20 animate-pulse"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-light text-white mb-4 font-['Plus_Jakarta_Sans']">
                Ready to cook with AI?
              </h2>
              
              <Button 
                onClick={handleStartCooking}
                className="group relative px-12 py-6 text-lg font-medium bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 border-0 shadow-2xl hover:shadow-orange-500/50 hover:scale-[1.05] transition-all duration-300 text-white rounded-full mb-4"
              >
                <span className="relative z-10 flex items-center">
                  Start Now with Flavr
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
              
              <p className="text-slate-300 font-light text-sm tracking-wide">
                Your next meal starts with your mood, ingredients, and Zest.
              </p>
            </div>
          </div>
        </motion.div>
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

      {/* Emotional Hook Sections */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* First Emotional Hook */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center md:text-left"
            >
              <h3 className="text-2xl md:text-3xl font-light text-white mb-4 font-['Plus_Jakarta_Sans']">
                No more food waste.
                <br />
                <span className="text-orange-400">No more guesswork.</span>
              </h3>
              <p className="text-slate-300 font-light leading-relaxed">
                Transform your kitchen into a place of creativity and confidence with AI that knows exactly what to make.
              </p>
            </motion.div>

            {/* Second Emotional Hook */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center md:text-right"
            >
              <h3 className="text-2xl md:text-3xl font-light text-white mb-4 font-['Plus_Jakarta_Sans']">
                Chef-crafted meals.
                <br />
                <span className="text-orange-400">Pantry-level effort.</span>
              </h3>
              <p className="text-slate-300 font-light leading-relaxed">
                Every recipe feels like it came from a personal chef who knows your taste, time, and cooking style.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="py-12 px-6 border-t border-white/10 backdrop-blur-sm relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center">
              <img src={FlavrLogo} alt="Flavr" className="w-8 h-8 mr-3" />
              <span className="text-white font-medium font-['Plus_Jakarta_Sans']">Flavr</span>
            </div>
            
            {/* Links */}
            <div className="flex items-center gap-8 text-sm">
              <button className="text-slate-400 hover:text-white transition-colors font-light">
                Terms
              </button>
              <button className="text-slate-400 hover:text-white transition-colors font-light">
                Privacy
              </button>
              <button className="text-slate-400 hover:text-orange-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.222.083.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="text-center mt-8 pt-8 border-t border-white/5">
            <p className="text-slate-500 text-xs font-light">
              © 2024 Flavr. Crafted with care for culinary creativity.
            </p>
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
          className="fixed bottom-8 right-8 z-50 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-orange-500/20 hover:border-orange-400/40 text-white p-3 rounded-full shadow-2xl hover:scale-110 transition-all duration-300"
        >
          <ChevronUp className="w-5 h-5" />
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