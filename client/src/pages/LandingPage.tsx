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
import FlavrFullLogo from "@assets/AD24FB4E-3BFB-4891-8859-5DEA19E45222.png";
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

      {/* Hero Section - Clean Apple Design */}
      <section id="hero" className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative z-10 pt-20">
        {/* Logo with Enhanced Glow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative group mb-6"
        >
          <div className="w-48 md:w-56 mx-auto relative">
            {/* Multi-layer glow effect */}
            <div className="absolute inset-0 bg-gradient-radial from-white/30 via-white/15 to-transparent rounded-full blur-xl scale-110 group-hover:scale-125 transition-transform duration-500"></div>
            <div className="absolute inset-0 bg-gradient-radial from-orange-300/20 via-orange-200/10 to-transparent rounded-full blur-2xl scale-125 group-hover:scale-150 transition-transform duration-700"></div>
            
            <img 
              src={FlavrFullLogo} 
              alt="Flavr - Your Private Chef"
              className="w-full h-auto object-contain drop-shadow-2xl group-hover:scale-105 transition-all duration-500 relative z-10"
            />
          </div>
        </motion.div>

        {/* Headlines with Staggered Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-4 tracking-tight">
            Your Private Chef.
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 bg-clip-text text-transparent">
              Anywhere.
            </span>
          </h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl md:text-2xl text-slate-300 font-light max-w-3xl mx-auto leading-relaxed"
          >
            AI recipes personalized to your mood, time, and skill level.
          </motion.p>
        </motion.div>

        {/* Enhanced CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="relative"
        >
          {/* Button glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          
          <Button 
            onClick={handleStartCooking}
            className="relative px-8 py-5 md:px-10 md:py-6 text-lg md:text-xl font-semibold bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-400 hover:via-orange-500 hover:to-amber-400 border-0 shadow-2xl hover:shadow-orange-500/40 hover:scale-105 transition-all duration-500 text-white rounded-full backdrop-blur-sm group"
          >
            <span className="relative z-10 flex items-center">
              Get Cooking Now
              <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </Button>
        </motion.div>

        {/* Ambient Background Elements */}
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl animate-pulse"></div>
      </section>

      {/* Feature Section - Apple-Inspired */}
      <section id="features" className="py-24 px-4 relative z-10 overflow-hidden">
        {/* Background ambient elements */}
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight"
            >
              Your AI Chef
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 bg-clip-text text-transparent">
                Understands You
              </span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-slate-300 font-light max-w-3xl mx-auto leading-relaxed"
            >
              Meet your intelligent culinary companion that reads your mood, adapts to your schedule, and grows with your skills—creating restaurant-quality experiences in your own kitchen.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: ChefHat,
                title: "Intuitive Recipe Creation",
                description: "Your AI chef reads your cravings, dietary needs, and skill level—then crafts recipes that feel like they were made just for you. No more guesswork, just pure culinary magic.",
                gradient: "from-orange-500/20 to-red-500/20"
              },
              {
                icon: Sparkles,
                title: "Learns Your Taste",
                description: "Every dish you make teaches your AI chef more about your preferences. Watch as it evolves to suggest flavor combinations that surprise and delight your palate.",
                gradient: "from-amber-500/20 to-orange-500/20"
              },
              {
                icon: Timer,
                title: "Adapts to Your Life",
                description: "Whether you're rushing through a 15-minute dinner or savoring a weekend cooking session, your AI chef crafts experiences that fit perfectly into your rhythm.",
                gradient: "from-yellow-500/20 to-amber-500/20"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: index * 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                viewport={{ once: true }}
                className="relative group"
              >
                {/* Glass morphism container with glow */}
                <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl hover:shadow-3xl transition-all duration-700 group-hover:bg-white/8">
                  {/* Multi-layer glow effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`}></div>
                  <div className={`absolute -inset-2 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-700`}></div>
                  
                  <div className="relative z-10">
                    {/* Icon with enhanced glow */}
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-orange-400/20 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <feature.icon className="relative w-14 h-14 text-orange-400 group-hover:text-orange-300 group-hover:scale-110 transition-all duration-500" />
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-orange-50 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-slate-300 group-hover:text-slate-200 leading-relaxed text-lg transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                  
                  {/* Floating accent dots */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-orange-400/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                  <div className="absolute bottom-4 left-4 w-1 h-1 bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Recipe Demo Section - Apple-Inspired */}
      <section id="demo" className="py-24 px-4 relative z-10 overflow-hidden">
        {/* Background ambient elements */}
        <div className="absolute top-1/4 right-1/3 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight"
            >
              Feel the
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 bg-clip-text text-transparent">
                Connection
              </span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-slate-300 font-light max-w-3xl mx-auto leading-relaxed"
            >
              Your AI chef doesn't just give you recipes—it engages with you, understanding your culinary journey and guiding you toward dishes that spark joy and confidence.
            </motion.p>
          </motion.div>

          {/* Side-by-side layout with glass morphism */}
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Food Image with enhanced styling */}
            <motion.div
              initial={{ opacity: 0, x: -50, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                {/* Glow effect for image container */}
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>
                
                <div className="relative">
                  <img
                    src={HeroFoodImage}
                    alt="Gourmet short rib with pea purée"
                    className="w-full rounded-2xl shadow-2xl group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                  
                  {/* Floating badge */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-slate-800">
                    AI Enhanced
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Chat Interface with glass morphism */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              viewport={{ once: true }}
              className="w-full max-w-md mx-auto lg:mx-0 relative group"
            >
              {/* Chat Container with enhanced glass morphism */}
              <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-white/20 via-orange-500/20 to-white/20 rounded-3xl blur-xl opacity-60"></div>
                <div className="absolute -inset-2 bg-gradient-to-r from-white/10 via-orange-400/10 to-white/10 rounded-3xl blur-2xl opacity-40"></div>
                
                <div className="relative z-10">
                  {/* Chat Header */}
                  <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-white/20">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-orange-400/30 rounded-full blur-sm"></div>
                      <img src={FlavrLogo} alt="Flavr AI" className="relative w-12 h-12" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">Flavr AI</p>
                      <p className="text-sm text-slate-300">Your cooking assistant</p>
                    </div>
                    <div className="ml-auto w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="space-y-4 mb-6">
                    {/* Recipe Title */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                      <p className="font-semibold text-white">Red Wine Braised Short Rib</p>
                      <p className="text-slate-300 text-sm">with Pea Purée & Miso Glaze</p>
                    </div>
                    
                    {/* AI Messages */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-4 rounded-tl-md shadow-lg">
                      <p className="text-sm">Here's how to elevate it with a miso glaze ✨</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-4 rounded-tl-md shadow-lg">
                      <p className="text-sm">Would you like a wine pairing? 🍷</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-4 rounded-tl-md shadow-lg">
                      <p className="text-sm">Add a complementary side dish? 🥗</p>
                    </div>
                  </div>
                  
                  {/* Chat Input */}
                  <div className="pt-6 border-t border-white/20">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-full px-4 py-3 border border-white/20">
                        <p className="text-sm text-slate-300">Ask about wine pairings...</p>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center hover:from-orange-400 hover:to-orange-500 transition-all duration-300 cursor-pointer shadow-lg">
                        <ArrowRight className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Flavr+ Premium Section - Completely Redesigned */}
      <section id="pricing" className="py-32 px-4 relative z-10 overflow-hidden">
        {/* Dynamic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-orange-500/15 to-amber-500/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-gradient-to-r from-red-500/10 to-orange-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-yellow-500/10 to-amber-400/10 rounded-full blur-2xl animate-pulse"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center justify-center mb-8"
            >
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-orange-400/40 via-amber-400/30 to-yellow-400/40 rounded-full blur-xl animate-pulse"></div>
                <img src={FlavrLogo} alt="Flavr+" className="relative w-20 h-20 mr-4" />
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent tracking-tight">
                Flavr+
              </h2>
            </motion.div>

            <motion.h3 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            >
              Unleash Your
              <br />
              <span className="bg-gradient-to-r from-orange-300 via-amber-200 to-yellow-300 bg-clip-text text-transparent">
                Culinary Potential
              </span>
            </motion.h3>
            
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-xl md:text-2xl text-slate-300 font-light max-w-4xl mx-auto leading-relaxed mb-12"
            >
              Transform from curious cook to confident chef with unlimited access to advanced features that elevate every dish you create.
            </motion.p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: "∞",
                title: "Unlimited Recipes",
                description: "Endless culinary exploration with no limits on your creativity"
              },
              {
                icon: "🍷",
                title: "Wine Pairings",
                description: "Expert sommelier-level recommendations for every dish"
              },
              {
                icon: "📋",
                title: "Meal Plans",
                description: "Personalized weekly plans that adapt to your lifestyle"
              },
              {
                icon: "⭐",
                title: "Chef Techniques",
                description: "Professional secrets that transform good into extraordinary"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative group"
              >
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all duration-500 group-hover:scale-105">
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="relative inline-block"
            >
              {/* Premium Button with Multiple Glow Layers */}
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/50 via-amber-400/40 to-yellow-500/50 rounded-full blur-xl opacity-80 animate-pulse"></div>
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-400/30 via-amber-300/20 to-yellow-400/30 rounded-full blur-2xl opacity-60 animate-pulse"></div>
              
              <Button 
                className="relative px-12 py-6 md:px-16 md:py-8 text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-orange-50 to-white text-orange-600 hover:from-orange-50 hover:via-white hover:to-orange-50 shadow-2xl hover:shadow-orange-500/30 hover:scale-110 transition-all duration-700 rounded-full backdrop-blur-sm group border-2 border-orange-200/50"
              >
                <span className="flex items-center">
                  <span className="bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 bg-clip-text text-transparent">
                    Start Your Culinary Journey
                  </span>
                  <Star className="ml-4 w-6 h-6 text-orange-500 fill-current group-hover:rotate-12 group-hover:scale-125 transition-all duration-500" />
                </span>
              </Button>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="text-slate-400 text-lg mt-6"
            >
              Join thousands of home chefs who've discovered their passion
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer - Clean Design */}
      <footer className="py-16 px-4 border-t border-white/10 relative z-10 overflow-hidden">
        {/* Background ambient elements */}
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-amber-400/5 rounded-full blur-2xl"></div>
        
        <div className="max-w-6xl mx-auto relative flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-6 md:mb-0">
            <div className="relative">
              <div className="absolute -inset-1 bg-orange-400/20 rounded-full blur-sm"></div>
              <img src={FlavrLogo} alt="Flavr" className="relative w-10 h-10 mr-4" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Flavr</p>
              <p className="text-slate-400 text-sm">© 2025 All rights reserved.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-8">
            {["Privacy", "Terms", "Instagram", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-slate-300 hover:text-white transition-all duration-300 relative group text-lg"
              >
                <span className="relative z-10">{link}</span>
                <div className="absolute -inset-2 bg-orange-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* Enhanced Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 relative group"
        >
          {/* Button glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 hover:scale-110 backdrop-blur-sm">
            <ChevronUp className="w-6 h-6" />
          </div>
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