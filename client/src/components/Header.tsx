import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import UserMenu from "./UserMenu";
import SettingsPanel from "./SettingsPanel";

interface HeaderProps {
  currentMode?: "shopping" | "fridge" | "chef";
}

export default function Header({ currentMode }: HeaderProps) {
  const [, navigate] = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleModeSelect = (mode: string) => {
    navigate(`/${mode}`);
  };

  return (
    <>
      <header className="glass sticky top-0 z-50 backdrop-blur-xl border-b border-white/20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                  <i className="fas fa-utensils text-white text-lg"></i>
                </div>
                <div className="absolute inset-0 gradient-primary rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <h1 
                className="text-2xl font-playfair font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => navigate("/")}
              >
                Flavr
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 p-0 rounded-xl glass hover:scale-110 transition-all duration-300 group"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <i className="fas fa-user text-slate-600 group-hover:text-slate-800 transition-colors"></i>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 p-0 rounded-xl glass hover:scale-110 transition-all duration-300 group"
                onClick={() => setShowSettings(!showSettings)}
              >
                <i className="fas fa-cog text-slate-600 group-hover:text-slate-800 transition-colors"></i>
              </Button>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        {currentMode && (
          <div className="border-t border-white/10 bg-white/30 backdrop-blur-sm">
            <div className="px-6 py-4">
              <div className="flex space-x-3">
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
                  <i className="fas fa-shopping-cart mr-2"></i>Shopping
                </Button>
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
                  <i className="fas fa-refrigerator mr-2"></i>Fridge
                </Button>
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
                  <i className="fas fa-chef-hat mr-2"></i>Chef
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

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
