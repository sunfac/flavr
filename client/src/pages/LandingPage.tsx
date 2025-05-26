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
      const scrolled = window.scrollY;
      console.log('Scroll position:', scrolled, 'Show button:', scrolled > 300);
      setShowScrollTop(scrolled > 300);
    };
    
    // Initial check - start with false
    setShowScrollTop(false);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
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
          className="relative group -mb-2.5"
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
          className="flex justify-center"
        >
          <div className="relative">
            {/* Enhanced multi-layer glow effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/40 via-amber-500/30 to-orange-500/40 rounded-full blur-xl opacity-60 animate-pulse"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/50 to-amber-400/50 rounded-full blur-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <Button 
              onClick={handleStartCooking}
              className="relative px-10 py-6 md:px-12 md:py-7 text-lg md:text-xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-400 hover:via-orange-500 hover:to-amber-400 border-0 shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transition-all duration-500 text-white rounded-full backdrop-blur-sm group min-w-[280px] justify-center"
            >
              <span className="relative z-10 flex items-center justify-center">
                Get Cooking Now
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
            </Button>
          </div>
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
      <section id="demo" className="py-16 px-4 relative z-10 overflow-hidden">
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

          {/* Side-by-side layout with enhanced styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start max-w-7xl mx-auto">
            {/* Food Image with clean styling */}
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

            {/* WhatsApp-Style Chat Interface */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              viewport={{ once: true }}
              className="w-full max-w-lg mx-auto lg:mx-0"
            >
              {/* WhatsApp-Style Chat Container */}
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl">
                {/* Chat Header - WhatsApp Style */}
                <div className="bg-slate-800/80 backdrop-blur-sm px-6 py-4 border-b border-slate-700/50">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-orange-400/30 rounded-full blur-sm"></div>
                      <img src={FlavrLogo} alt="Flavr AI" className="relative w-10 h-10 rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-base">Flavr AI Chef</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <p className="text-xs text-green-400">online</p>
                      </div>
                    </div>
                    <div className="text-slate-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path d="M10 4a2 2 0 100-4 2 2 0 000 4z"/>
                        <path d="M10 20a2 2 0 100-4 2 2 0 000 4z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Chat Messages Area - WhatsApp Style */}
                <div className="p-4 h-80 overflow-y-auto bg-slate-900/50 space-y-3">
                  {/* Date Separator */}
                  <div className="text-center">
                    <span className="bg-slate-700/50 text-slate-300 text-xs px-3 py-1 rounded-full">Today</span>
                  </div>
                  
                  {/* Recipe Card - System Message */}
                  <div className="flex justify-center">
                    <div className="bg-slate-700/70 backdrop-blur-sm rounded-lg p-3 max-w-xs">
                      <p className="text-white font-medium text-sm">Red Wine Braised Short Rib</p>
                      <p className="text-slate-300 text-xs">with Pea Purée & Miso Glaze</p>
                    </div>
                  </div>
                  
                  {/* AI Messages - WhatsApp Bubbles */}
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl rounded-tl-md p-3 max-w-xs shadow-lg">
                      <p className="text-white text-sm">Here's how to elevate it with a miso glaze ✨</p>
                      <p className="text-orange-100 text-xs mt-1 opacity-75">2:14 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl rounded-tl-md p-3 max-w-xs shadow-lg">
                      <p className="text-white text-sm">Would you like a wine pairing? 🍷</p>
                      <p className="text-orange-100 text-xs mt-1 opacity-75">2:15 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl rounded-tl-md p-3 max-w-xs shadow-lg">
                      <p className="text-white text-sm">Add a complementary side dish? 🥗</p>
                      <p className="text-orange-100 text-xs mt-1 opacity-75">2:16 PM</p>
                    </div>
                  </div>
                  
                  {/* Typing Indicator */}
                  <div className="flex justify-start">
                    <div className="bg-slate-700/70 rounded-2xl rounded-tl-md p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Input Area - WhatsApp Style */}
                <div className="p-4 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-slate-700/50 rounded-full px-4 py-3 border border-slate-600/50">
                      <p className="text-slate-400 text-sm">Ask about wine pairings...</p>
                    </div>
                    <button className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center hover:from-orange-400 hover:to-orange-500 transition-all duration-300 shadow-lg hover:scale-105">
                      <ArrowRight className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Flavr+ Premium Section - Completely Redesigned */}
      <section id="pricing" className="py-12 px-4 relative z-10 overflow-hidden">
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
            className="flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="relative"
            >
              {/* Premium Button with Multiple Glow Layers */}
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/50 via-amber-400/40 to-yellow-500/50 rounded-full blur-xl opacity-80 animate-pulse"></div>
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-400/30 via-amber-300/20 to-yellow-400/30 rounded-full blur-2xl opacity-60 animate-pulse"></div>
              
              <Button 
                className="relative px-6 py-3 md:px-12 md:py-6 text-base md:text-xl font-bold bg-gradient-to-r from-white via-orange-50 to-white text-orange-600 hover:from-orange-50 hover:via-white hover:to-orange-50 shadow-2xl hover:shadow-orange-500/30 hover:scale-105 transition-all duration-500 rounded-full backdrop-blur-sm group border-2 border-orange-200/50 flex items-center justify-center max-w-xs md:max-w-none mx-auto"
              >
                <span className="bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 bg-clip-text text-transparent">
                  Start Your Culinary Journey
                </span>
                <Star className="ml-2 md:ml-4 w-4 h-4 md:w-6 md:h-6 text-orange-500 fill-current group-hover:rotate-12 group-hover:scale-125 transition-all duration-500" />
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

      {/* Enhanced Footer */}
      <footer className="py-20 px-4 border-t border-white/10 relative z-10 overflow-hidden bg-gradient-to-b from-transparent to-slate-950/30">
        {/* Background ambient elements */}
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-amber-400/8 rounded-full blur-2xl animate-pulse"></div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid md:grid-cols-3 gap-12 items-start mb-12">
            {/* Brand Section */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-6">
                <div className="relative">
                  <div className="absolute -inset-2 bg-orange-400/30 rounded-full blur-lg animate-pulse"></div>
                  <img src={FlavrLogo} alt="Flavr" className="relative w-12 h-12 mr-4" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-2xl tracking-tight">Flavr</h3>
                  <p className="text-slate-400 text-sm">Your AI Chef Companion</p>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed mb-6">
                Transform your kitchen into a culinary playground with AI-powered recipes that understand your taste, time, and skill level.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="w-10 h-10 bg-white/5 hover:bg-orange-500/20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                >
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-orange-400 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-white/5 hover:bg-orange-500/20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                >
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-orange-400 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-white/5 hover:bg-orange-500/20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group"
                >
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-orange-400 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.745.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.750-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001.012.001z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="md:col-span-1">
              <h4 className="text-white font-semibold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-4">
                {["About Us", "How It Works", "Pricing", "Support", "Blog"].map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-orange-400 transition-all duration-300 relative group"
                    >
                      <span className="relative z-10">{link}</span>
                      <div className="absolute -inset-1 bg-orange-400/20 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Legal & Contact */}
            <div className="md:col-span-1">
              <h4 className="text-white font-semibold text-lg mb-6">Legal & Contact</h4>
              <ul className="space-y-4">
                {["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact Us", "Help Center"].map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-slate-400 hover:text-orange-400 transition-all duration-300 relative group"
                    >
                      <span className="relative z-10">{link}</span>
                      <div className="absolute -inset-1 bg-orange-400/20 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-slate-500 text-sm mb-4 md:mb-0">
                © 2025 Flavr. All rights reserved. Made with ❤️ for food lovers everywhere.
              </p>
              <div className="flex items-center space-x-6">
                <span className="text-slate-500 text-sm">Available on</span>
                <div className="flex space-x-3">
                  <div className="px-3 py-1 bg-white/5 rounded-lg text-slate-400 text-xs">Web</div>
                  <div className="px-3 py-1 bg-white/5 rounded-lg text-slate-400 text-xs">iOS</div>
                  <div className="px-3 py-1 bg-white/5 rounded-lg text-slate-400 text-xs">Android</div>
                </div>
              </div>
            </div>
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
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 relative group"
        >
          {/* Enhanced glow effects */}
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/50 via-amber-500/40 to-orange-500/50 rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300 animate-pulse"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-400/70 to-amber-400/70 rounded-full blur-lg opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white p-3 rounded-full shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-orange-300/20 cursor-pointer active:scale-95">
            <ChevronUp className="w-5 h-5 group-hover:animate-bounce" />
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