import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import Loading from "@/components/Loading";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/settings",
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome to Flavr+!",
        description: "You now have unlimited access to recipes.",
      });
      navigate("/settings");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? "Processing..." : "Subscribe to Flavr+"}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [, navigate] = useLocation();
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/create-subscription")
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
      })
      .catch((error) => {
        console.error("Failed to create subscription:", error);
        navigate("/");
      });
  }, [navigate]);

  if (!clientSecret) {
    return <Loading message="Setting up your subscription..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => setShowSettings(true)}
        onUserClick={() => setShowUserMenu(true)}
      />
      
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-crown text-white text-2xl"></i>
              </div>
              <CardTitle className="font-playfair text-2xl">Upgrade to Flavr+</CardTitle>
              <p className="text-muted-foreground">
                Unlock unlimited recipes and premium features
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Features list */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <i className="fas fa-check text-success"></i>
                  <span>Unlimited AI recipe generation</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <i className="fas fa-check text-success"></i>
                  <span>HD recipe images with every recipe</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <i className="fas fa-check text-success"></i>
                  <span>Priority customer support</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <i className="fas fa-check text-success"></i>
                  <span>Advanced recipe customization</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold font-playfair text-foreground">$4.99</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>

              {/* Payment form */}
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscribeForm />
              </Elements>

              <div className="text-center">
                <button 
                  onClick={() => navigate("/settings")}
                  className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

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
