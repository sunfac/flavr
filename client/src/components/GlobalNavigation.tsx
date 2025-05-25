import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      icon: "fas fa-home",
      description: "Back to landing page"
    },
    {
      title: "Choose a Mode",
      path: "/app",
      icon: "fas fa-utensils",
      description: "Select cooking mode"
    },
    {
      title: "My Recipes",
      path: "/settings",
      icon: "fas fa-history",
      description: "View recipe history"
    },
    {
      title: "Settings",
      path: "/settings",
      icon: "fas fa-cog",
      description: "Account & preferences"
    },
    {
      title: "Flavr+",
      path: "/subscribe",
      icon: "fas fa-star",
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
      {/* Menu Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-10 h-10 p-0 rounded-xl glass hover:scale-110 transition-all duration-300 group"
        onClick={toggleMenu}
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-bars'} text-slate-600 group-hover:text-slate-800 transition-all duration-300`}></i>
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Menu */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 glass border-l border-white/20 z-50 backdrop-blur-xl transform transition-transform duration-500 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-utensils text-white text-lg"></i>
              </div>
              <h2 className="text-xl font-playfair font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Flavr
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              <i className="fas fa-times text-slate-600"></i>
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 space-y-3">
            {navigationItems.map((item, index) => (
              <Card
                key={item.path}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 border-0 ${
                  location === item.path 
                    ? 'glass shadow-lg ring-2 ring-orange-200' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                onClick={() => handleNavigate(item.path)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    location === item.path 
                      ? 'gradient-primary text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <i className={`${item.icon} text-sm`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-slate-800">{item.title}</h3>
                      {item.premium && (
                        <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                  <i className="fas fa-chevron-right text-slate-400 text-sm"></i>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom Section */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Current Mode</p>
              <Badge className="glass border border-white/20 text-slate-700">
                {location.includes('/shopping') ? '🛒 Shopping' :
                 location.includes('/fridge') ? '🥦 Fridge to Fork' :
                 location.includes('/chef') ? '👨‍🍳 Chef Assist' :
                 '🏠 Home'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}