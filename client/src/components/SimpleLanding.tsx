import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/AuthModal";

export default function SimpleLanding() {
  const [, navigate] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  const handleStartCooking = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-6xl font-bold text-white mb-4">Flavr</h1>
        <p className="text-xl text-gray-300 mb-8">Your AI-powered recipe assistant</p>
        
        <div className="space-y-4">
          <Button 
            onClick={handleStartCooking}
            className="px-8 py-4 text-lg bg-orange-600 hover:bg-orange-700 text-white rounded-full"
          >
            Start Cooking
          </Button>
          
          <div className="flex gap-4 justify-center">
            <Button 
              variant="outline"
              onClick={() => {
                setAuthMode("login");
                setShowAuthModal(true);
              }}
              className="text-white border-white hover:bg-white hover:text-black"
            >
              Login
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                setAuthMode("signup");
                setShowAuthModal(true);
              }}
              className="text-white border-white hover:bg-white hover:text-black"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
        title={authMode === "login" ? "Welcome back!" : "Join Flavr today!"}
        description={authMode === "login" ? "Sign in to continue" : "Create your account"}
      />
    </div>
  );
}