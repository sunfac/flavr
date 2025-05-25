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
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <i className="fas fa-utensils text-white text-sm"></i>
              </div>
              <h1 
                className="text-xl font-playfair font-bold text-foreground cursor-pointer"
                onClick={() => navigate("/")}
              >
                Flavr
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 rounded-full"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <i className="fas fa-user text-muted-foreground text-sm"></i>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 rounded-full"
                onClick={() => setShowSettings(!showSettings)}
              >
                <i className="fas fa-cog text-muted-foreground text-sm"></i>
              </Button>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        {currentMode && (
          <div className="bg-card border-b border-border">
            <div className="px-4 py-3">
              <div className="flex space-x-2">
                <Button
                  variant={currentMode === "shopping" ? "default" : "secondary"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleModeSelect("shopping")}
                >
                  <i className="fas fa-shopping-cart mr-2"></i>Shopping
                </Button>
                <Button
                  variant={currentMode === "fridge" ? "default" : "secondary"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleModeSelect("fridge")}
                >
                  <i className="fas fa-refrigerator mr-2"></i>Fridge
                </Button>
                <Button
                  variant={currentMode === "chef" ? "default" : "secondary"}
                  size="sm"
                  className="flex-1"
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
