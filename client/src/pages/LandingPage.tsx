import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";
import FlavrFullLogo from "@assets/935FA3C5-A4E6-4FA8-A5E7-772FD650688C.png";
import HeroFoodImage from "@assets/3D8C8E94-9BC0-4F6A-95F2-8951941A709B.png";
import { motion } from "framer-motion";
import { ChefHat, Sparkles, Timer, Star, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

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
      apiRequest("POST", "/api/auth/signup", userData),
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
    if (user?.user) {
      navigate("/shopping");
    } else {
      setAuthMode("signup");
      setShowAuthModal(true);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 relative overflow-hidden">
      {/* Premium dark background with ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-orange-300 to-orange-400 rounded-full opacity-10 blur-2xl"></div>
      </div>

      {/* Hero Section - Full Viewport */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative z-10">
        {/* Large Premium Logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative group mb-12"
        >
          <div className="w-48 h-48 md:w-64 md:h-64 mx-auto mb-8">
            <img 
              src={FlavrFullLogo} 
              alt="Flavr - Your Private Chef"
              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="absolute inset-0 rounded-full blur-3xl opacity-30 bg-orange-500 group-hover:opacity-50 transition-opacity duration-500"></div>
        </motion.div>

        {/* Hero Headlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
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

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Button 
            onClick={handleStartCooking}
            className="px-12 py-6 text-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 border-0 shadow-2xl hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300 text-white rounded-full"
          >
            Get Cooking Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </section>

      {/* Feature Section */}
      <section className="py-24 px-6 relative z-10">
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
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
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

            {/* Chat UI Demo */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-6"
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">
                See Flavr in Action
              </h3>
              
              {/* Chat Messages */}
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 max-w-sm">
                  <p className="text-white font-medium mb-2">Red Wine Braised Short Rib</p>
                  <p className="text-slate-300 text-sm">with Pea Purée & Miso Glaze</p>
                </div>
                
                <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-4 max-w-xs ml-auto">
                  <p className="text-orange-100 text-sm">Here's how to elevate it with a miso glaze. ✨</p>
                </div>
                
                <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-4 max-w-xs ml-auto">
                  <p className="text-orange-100 text-sm">Would you like a wine pairing? 🍷</p>
                </div>
                
                <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-4 max-w-xs ml-auto">
                  <p className="text-orange-100 text-sm">Add a side dish? 🥗</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Flavr+ CTA Section */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl p-12 md:p-16 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                <img src={FlavrLogo} alt="Flavr+" className="w-16 h-16 mr-4" />
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  Flavr+
                </h2>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
                Take Your Kitchen to the Next Level
              </h3>
              <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
                Unlock premium features: unlimited recipes, advanced dietary filtering, wine pairings, and more.
              </p>
              <Button 
                className="px-8 py-4 text-lg font-semibold bg-white text-orange-600 hover:bg-orange-50 shadow-2xl hover:scale-105 transition-all duration-300 rounded-full"
              >
                Upgrade to Flavr+ <Star className="ml-2 w-5 h-5" />
              </Button>
            </div>
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
    </div>
  );
}