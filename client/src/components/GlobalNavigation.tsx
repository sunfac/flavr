import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, ChefHat, BookOpen, Star } from "lucide-react";

interface GlobalNavigationProps {
  onClose?: () => void;
}

export default function GlobalNavigation({ onClose }: GlobalNavigationProps) {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    {
      title: "Home",
      path: "/",
      icon: Home,
      description: "Back to landing page"
    },
    {
      title: "Choose a Mode",
      path: "/app",
      icon: ChefHat,
      description: "Select cooking mode"
    },
    {
      title: "My Recipes",
      path: "/settings",
      icon: BookOpen,
      description: "Account & preferences"
    },
    {
      title: "Flavr+",
      path: "/subscribe",
      icon: Star,
      description: "Upgrade to premium",
      premium: true
    }
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    onClose?.();
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Menu Toggle Button with Proper Icon */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-12 h-12 p-0 rounded-2xl glass hover:bg-white/20 transition-all duration-300 group border border-white/10"
          onClick={toggleMenu}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
          ) : (
            <Menu className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
          )}
        </Button>
      </motion.div>

      {/* Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-in Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 h-full w-80 bg-white border-l border-slate-200 z-50 shadow-2xl"
          >
            <div className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img 
                      src="/attached_assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png" 
                      alt="Flavr Logo"
                      className="w-8 h-8 object-contain drop-shadow-lg"
                    />
                  </div>
                  <h2 className="text-xl font-playfair font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Flavr ✨
                  </h2>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 rounded-lg hover:bg-slate-100"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4 text-slate-600" />
                  </Button>
                </motion.div>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 space-y-3">
                {navigationItems.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <motion.div
                      key={`nav-${item.title}-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all duration-300 hover:scale-105 border-0 ${
                          location === item.path 
                            ? 'bg-primary/10 shadow-lg ring-2 ring-primary/20' 
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => handleNavigate(item.path)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              location === item.path 
                                ? 'bg-primary text-white' 
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                                {item.premium && (
                                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs">
                                    Premium
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600">{item.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-500 text-center">
                  Made with ❤️ for home cooks
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}