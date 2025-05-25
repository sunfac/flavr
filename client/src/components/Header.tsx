import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import UserMenu from "./UserMenu";
import SettingsPanel from "./SettingsPanel";
import GlobalNavigation from "./GlobalNavigation";
import { motion } from "framer-motion";
import { ChefHat, Settings, User } from "lucide-react";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";

interface HeaderProps {
  currentMode?: "shopping" | "fridge" | "chef";
}

export default function Header({ currentMode }: HeaderProps) {
  const [, navigate] = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleModeSelect = (mode: string) => {
    navigate(`/app/${mode}`);
  };

  return (
    <>
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass sticky top-0 z-50 backdrop-blur-xl border-b border-white/20 bg-background/80"
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <motion.div 
              className="flex items-center space-x-4"
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate("/")}
            >
              <motion.div 
                className="relative group cursor-pointer"
                whileHover={{ rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-12 h-12 flex items-center justify-center">
                  <img 
                    src={FlavrLogo} 
                    alt="Flavr Logo"
                    className="w-10 h-10 object-contain drop-shadow-lg"
                  />
                </div>
                <motion.div 
                  className="absolute inset-0 rounded-2xl blur-lg opacity-20 bg-orange-400"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <motion.h1 
                className="text-2xl font-playfair font-bold bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 bg-clip-text text-transparent cursor-pointer select-none"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Flavr ✨
              </motion.h1>
            </motion.div>

            {/* Navigation Actions */}
            <div className="flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-12 h-12 p-0 rounded-2xl glass hover:bg-white/20 transition-all duration-300 group border border-white/10"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <User className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-12 h-12 p-0 rounded-2xl glass hover:bg-white/20 transition-all duration-300 group border border-white/10"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
                </Button>
              </motion.div>

              <GlobalNavigation />
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        {currentMode && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-white/10 bg-white/30 backdrop-blur-sm"
          >
            <div className="px-6 py-4">
              <div className="flex space-x-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 h-11 rounded-xl font-medium transition-all duration-300 ${
                      currentMode === "shopping" 
                        ? "gradient-primary text-white shadow-lg" 
                        : "glass text-slate-700 hover:text-slate-900 hover:scale-105"
                    }`}
                    onClick={() => handleModeSelect("shopping")}
                  >
                    🛒 Shopping
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 h-11 rounded-xl font-medium transition-all duration-300 ${
                      currentMode === "fridge" 
                        ? "gradient-secondary text-white shadow-lg" 
                        : "glass text-slate-700 hover:text-slate-900 hover:scale-105"
                    }`}
                    onClick={() => handleModeSelect("fridge")}
                  >
                    🥗 Fridge
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 h-11 rounded-xl font-medium transition-all duration-300 ${
                      currentMode === "chef" 
                        ? "gradient-accent text-white shadow-lg" 
                        : "glass text-slate-700 hover:text-slate-900 hover:scale-105"
                    }`}
                    onClick={() => handleModeSelect("chef")}
                  >
                    👨‍🍳 Chef
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* User Menu */}
      {showUserMenu && (
        <UserMenu onClose={() => setShowUserMenu(false)} />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}