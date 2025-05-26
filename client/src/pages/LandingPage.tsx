import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";
import { motion } from "framer-motion";
import { ChefHat, Sparkles, Timer, Star, ArrowRight, Menu, Settings, User, ChevronUp, Bot, Refrigerator, ShoppingCart } from "lucide-react";
import AuthModal from "@/components/AuthModal";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTitle, setAuthTitle] = useState("Join Flavr");
  const [authDescription, setAuthDescription] = useState("Start cooking with AI today");
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Check authentication status
  const { data: user = {} } = useQuery({
    queryKey: ["/api/me"],
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartCooking = () => {
    navigate("/mode-selection");
  };

  const handleGetStarted = () => {
    setAuthTitle("Join Flavr");
    setAuthDescription("Start your culinary journey with AI");
    setShowAuthModal(true);
  };

  const handleLogin = () => {
    setAuthTitle("Welcome Back");
    setAuthDescription("Continue your cooking adventure");
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    navigate("/mode-selection");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white overflow-x-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-r from-orange-600/3 to-amber-500/3 rounded-full blur-3xl"></div>
      </div>

      {/* Header Navigation */}
      <nav className="relative z-50 px-6 py-6 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src={FlavrLogo} alt="Flavr" className="w-10 h-10" />
            <span className="text-2xl font-semibold font-['Plus_Jakarta_Sans'] text-white">
              Flavr
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button className="text-slate-300 hover:text-white transition-colors font-medium">
              How it Works
            </button>
            <button className="text-slate-300 hover:text-white transition-colors font-medium">
              Flavr+
            </button>
            <button className="text-slate-300 hover:text-white transition-colors font-medium">
              Pricing
            </button>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {user && Object.keys(user).length > 0 ? (
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => navigate("/mode-selection")}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white border-0 rounded-full px-6 py-2"
                >
                  Continue Cooking
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                  <User className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={handleLogin}
                  variant="ghost" 
                  className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full px-4 py-2"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white border-0 rounded-full px-6 py-2"
                >
                  Get Started
                </Button>
              </div>
            )}
            
            <Button variant="ghost" size="icon" className="md:hidden text-slate-300 hover:text-white">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Modern & Engaging */}
      <section id="hero" className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative z-10 pt-20">
        {/* Subtle Logo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative group mb-8"
        >
          <div className="w-32 h-32 md:w-40 md:h-40 mx-auto">
            <img 
              src={FlavrLogo} 
              alt="Flavr"
              className="w-full h-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </motion.div>

        {/* Bold Modern Headlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white leading-[0.9] mb-6 font-['Plus_Jakarta_Sans']">
            Your Private AI Chef.
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              One Chat Away.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed mb-4">
            Flavr creates bespoke meals based on your mood, ingredients, and ambition.
          </p>
          <p className="text-sm text-slate-400 font-light tracking-wide">
            No logins, no waste, just smarter cooking.
          </p>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-16"
        >
          <Button 
            onClick={handleStartCooking}
            className="group relative px-12 py-6 text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 border-0 shadow-2xl hover:shadow-orange-500/50 hover:scale-[1.05] transition-all duration-300 text-white rounded-full"
          >
            <span className="relative z-10 flex items-center">
              Start Cooking Now
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Button>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="features" className="py-20 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4 font-['Plus_Jakarta_Sans']">
              How It Works
            </h2>
            <p className="text-lg text-slate-400 font-light">
              Three simple steps to transform your cooking experience
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: "Meet Zest",
                description: "Chat-based AI that adapts to you",
                detail: "Your personal cooking assistant learns your preferences and cooking style"
              },
              {
                icon: Refrigerator,
                title: "Use what you have",
                description: "Zero-waste fridge cooking",
                detail: "Transform leftover ingredients into restaurant-quality meals"
              },
              {
                icon: ShoppingCart,
                title: "Smart shopping",
                description: "Full lists, perfect pairings",
                detail: "Get precise ingredient lists with wine pairings and substitutions"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.15 }}
                className="text-center group"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-orange-400/30 group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="w-10 h-10 text-orange-400 group-hover:text-orange-300 transition-colors duration-300" strokeWidth={1.5} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-amber-500/30 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2 font-['Plus_Jakarta_Sans']">{feature.title}</h3>
                <p className="text-orange-400 font-medium mb-3">{feature.description}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{feature.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Flavr+ Section */}
      <section id="pricing" className="py-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4 font-['Plus_Jakarta_Sans']">
              Unlock Flavr+
            </h2>
            <p className="text-lg text-slate-400 font-light">
              Take your culinary journey to the next level
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-gradient-to-br from-orange-500/10 via-amber-400/5 to-orange-600/10 backdrop-blur-xl border border-orange-400/20 rounded-3xl p-8 md:p-12 relative overflow-hidden"
          >
            {/* Soft glow background */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-amber-500/10"></div>
            
            <div className="relative z-10">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-200 font-medium">Unlimited recipe generations</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-200 font-medium">Weekly chef-curated drops</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-200 font-medium">Bonus chat packs & wine pairing mode</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-200 font-medium">Early access to Flavr Rituals (meal planner)</span>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <Button 
                  onClick={() => navigate("/subscribe")}
                  className="group relative px-10 py-4 text-lg font-semibold bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-orange-400/50 shadow-2xl hover:scale-[1.02] transition-all duration-300 text-white rounded-full"
                >
                  <span className="relative z-10 flex items-center">
                    Upgrade to Flavr+
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {[
              {
                quote: "Game changer for my weekly dinners.",
                author: "Jess",
                stars: 5
              },
              {
                quote: "Finally stopped wasting my fridge food.",
                author: "Tom",
                stars: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center"
              >
                <div className="flex justify-center mb-3">
                  {[...Array(testimonial.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-orange-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-200 font-medium mb-3 text-lg">"{testimonial.quote}"</p>
                <p className="text-slate-400 font-light">— {testimonial.author}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Block */}
      <section className="py-20 px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4 font-['Plus_Jakarta_Sans']">
            Ditch the guesswork.
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Cook with Zest.
            </span>
          </h2>
          
          <p className="text-lg text-slate-400 font-light mb-8 max-w-2xl mx-auto">
            It only takes one ingredient and your vibe.
          </p>
          
          <Button 
            onClick={handleStartCooking}
            className="group relative px-12 py-6 text-xl font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 border-0 shadow-2xl hover:shadow-orange-500/50 hover:scale-[1.05] transition-all duration-300 text-white rounded-full"
          >
            <span className="relative z-10 flex items-center">
              Start Your First Recipe
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Button>
        </motion.div>
      </section>

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
        onSuccess={handleAuthSuccess}
        title={authTitle}
        description={authDescription}
      />
    </div>
  );
}