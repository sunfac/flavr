import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalNavigation from "@/components/GlobalNavigation";
import GlobalFooter from "@/components/GlobalFooter";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import Loading from "@/components/Loading";
import AuthModal from "@/components/AuthModal";
import { Crown } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
console.log("Loading Stripe with public key:", import.meta.env.VITE_STRIPE_PUBLIC_KEY ? "Present" : "Missing");
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  console.log("SubscribeForm rendered:", { stripe: !!stripe, elements: !!elements });

  // Don't render form until Stripe is ready
  if (!stripe || !elements) {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-3">
        <div className="animate-spin w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full" />
        <p className="text-slate-400 text-xs">Loading payment form...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      console.log("Stripe not ready - stripe:", !!stripe, "elements:", !!elements);
      toast({
        title: "Payment System Loading",
        description: "Please wait for the payment form to load completely.",
        variant: "destructive",
      });
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
      // Payment successful - navigate immediately and let the app refresh naturally
      toast({
        title: "Welcome to Flavr+!",
        description: "You now have unlimited access to recipes.",
      });
      
      // Navigate after a brief delay to let the toast show
      setTimeout(() => {
        navigate("/settings");
      }, 1000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <PaymentElement 
          options={{
            layout: "tabs",
            wallets: {
              applePay: "auto",
              googlePay: "auto"
            }
          }}
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            <span>Processing Payment...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            <span>Subscribe to Flavr+</span>
          </div>
        )}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [stripeLoaded, setStripeLoaded] = useState(false);

  // Check if Stripe is loaded
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkStripe = async () => {
      try {
        const stripe = await stripePromise;
        if (stripe) {
          console.log("Stripe loaded successfully");
          setStripeLoaded(true);
        } else {
          console.error("Failed to load Stripe - no stripe instance");
        }
      } catch (error) {
        console.error("Error loading Stripe:", error);
      }
    };
    
    checkStripe();
    
    // Fallback timeout
    timeoutId = setTimeout(() => {
      if (!stripeLoaded) {
        console.error("Stripe loading timeout - falling back to basic form");
        setStripeLoaded(true); // Allow form to show even if Stripe fails
      }
    }, 10000);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [stripeLoaded]);

  // Close all menus
  const closeAllMenus = () => {
    setShowNavigation(false);
    setShowSettings(false);
    setShowUserMenu(false);
  };

  // Open specific menu and close others
  const openMenu = (menuType: 'navigation' | 'settings' | 'userMenu') => {
    closeAllMenus();
    if (menuType === 'navigation') setShowNavigation(true);
    if (menuType === 'settings') setShowSettings(true);
    if (menuType === 'userMenu') setShowUserMenu(true);
  };

  // Get user data to check premium status
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  // Get subscription status - moved before conditional returns
  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/subscription-status"],
    enabled: !!(user as any)?.user,
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reactivate-subscription");
      if (!response.ok) {
        throw new Error("Failed to reactivate subscription");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Reactivated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch payment intent when component mounts
  useEffect(() => {
    // If user is not authenticated, we'll show the auth modal instead of redirecting
    if (!user && !isLoading) {
      // Don't redirect or show error - let the user see the subscription page and signup
      return;
    }
    
    // If user is authenticated and doesn't have Flavr+, create subscription
    if ((user as any)?.user && !(user as any).user.hasFlavrPlus) {
      apiRequest("POST", "/api/create-subscription")
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            if (errorData.message && errorData.message.includes("set up Stripe")) {
              toast({
                title: "Stripe Configuration Required",
                description: errorData.message,
                variant: "destructive",
              });
            } else {
              throw new Error(errorData.error || 'Failed to create subscription');
            }
            return;
          }
          const data = await res.json();
          console.log("Subscription API response:", data);
          
          // Handle case where no payment is required
          if (data.status === 'no_payment_required') {
            toast({
              title: "Subscription Activated!",
              description: "Welcome to Flavr+ Premium! Your subscription is now active.",
            });
            // Refresh page to show premium status
            window.location.reload();
            return;
          }
          
          console.log("Setting clientSecret:", data.clientSecret ? "present" : "missing");
          setClientSecret(data.clientSecret);
          
          // Provide feedback that payment form is ready
          if (data.clientSecret) {
            setTimeout(() => {
              toast({
                title: "Payment Form Ready! 💳",
                description: "Complete your Flavr+ subscription below",
              });
            }, 1000);
          }
        })
        .catch((error) => {
          console.error("Failed to create subscription:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to initialize payment. Please try again.",
            variant: "destructive",
          });
        });
    }
  }, [user, isLoading, toast, navigate]);

  const hasFlavrPlus = (user as any)?.user?.hasFlavrPlus || (subscriptionData as any)?.hasFlavrPlus;
  const cancelAtPeriodEnd = (subscriptionData as any)?.cancelAtPeriodEnd;
  const currentPeriodEnd = (subscriptionData as any)?.currentPeriodEnd;

  if (isLoading) {
    return <Loading message="Loading your account..." />;
  }

  // Show subscription page with signup option for non-authenticated users
  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <GlobalHeader 
          onMenuClick={() => openMenu('navigation')}
          onSettingsClick={() => openMenu('settings')}
          onAuthRequired={() => setShowAuthModal(true)}
        />
        
        <main className="container mx-auto px-4 py-6 pt-24 pb-8 min-h-screen">
          <div className="max-w-md mx-auto w-full">
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 w-full">
              <CardHeader className="text-center px-4 py-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="text-white w-8 h-8" />
                </div>
                <CardTitle className="font-playfair text-xl sm:text-2xl text-orange-400">Join Flavr+</CardTitle>
                <p className="text-gray-300 text-sm sm:text-base">
                  Unlimited AI-powered recipes and premium features
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6 px-4 py-6">
                {/* Premium Features */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <span>Unlimited AI recipe generation</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <span>HD recipe images</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <span>All cooking modes</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <span>Recipe history & sharing</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <span>Photo-to-Recipe conversion</span>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-xl sm:text-2xl font-bold text-white">£7.99/month</p>
                  <Button 
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-base sm:text-lg py-4 sm:py-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Get Started with Flavr+
                  </Button>
                  <p className="text-xs text-gray-400 px-2">
                    Sign up now and start your premium cooking journey
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <GlobalFooter />

        {/* Navigation Menu */}
        {showNavigation && (
          <GlobalNavigation 
            onClose={() => setShowNavigation(false)}
          />
        )}

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel 
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* User Menu */}
        {showUserMenu && (
          <UserMenu 
            onClose={() => setShowUserMenu(false)}
          />
        )}

        {/* Auth Modal for signup/login */}
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            // Give additional feedback about the subscription flow
            setTimeout(() => {
              toast({
                title: "Ready for Flavr+! 🚀",
                description: "Setting up your premium subscription...",
              });
            }, 1500); // Wait for the auth success message to show first
          }}
          title="Join Flavr+"
          description="Create your account to subscribe to premium features"
          initialMode="signup"
        />
      </div>
    );
  }

  // Show subscription management for existing Flavr+ users
  if (hasFlavrPlus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <GlobalHeader 
          onMenuClick={() => openMenu('navigation')}
          onSettingsClick={() => openMenu('settings')}
          onAuthRequired={() => navigate("/")}
        />
        
        <main className="container mx-auto px-4 py-6 pt-24">
          <div className="max-w-md mx-auto">
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-crown text-white text-2xl"></i>
                </div>
                <CardTitle className="font-playfair text-2xl text-orange-400">Flavr+ Subscription</CardTitle>
                <p className="text-gray-300">
                  {(user as any)?.user?.email === "william@blycontracting.co.uk" 
                    ? "Your developer account has unlimited access to all Flavr features"
                    : "Manage your premium subscription"
                  }
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Premium Features */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <i className="fas fa-check text-green-400"></i>
                    <span>✓ Unlimited AI recipe generation</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <i className="fas fa-check text-green-400"></i>
                    <span>✓ HD recipe images</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <i className="fas fa-check text-green-400"></i>
                    <span>✓ All cooking modes</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <i className="fas fa-check text-green-400"></i>
                    <span>✓ Recipe history & sharing</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-300">
                    <i className="fas fa-check text-green-400"></i>
                    <span>✓ Developer access</span>
                  </div>
                </div>

                {/* Subscription status */}
                {currentPeriodEnd && (
                  <div className="text-center text-sm text-gray-400">
                    {cancelAtPeriodEnd ? (
                      <p>Your subscription will end on {new Date(currentPeriodEnd * 1000).toLocaleDateString()}</p>
                    ) : (
                      <p>Next billing date: {new Date(currentPeriodEnd * 1000).toLocaleDateString()}</p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate("/app")}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                  >
                    Start Cooking with Flavr
                  </Button>
                  
                  {/* Subscription management buttons */}
                  {(user as any)?.user?.email !== "william@blycontracting.co.uk" && (
                    <>
                      {cancelAtPeriodEnd ? (
                        <Button 
                          onClick={() => reactivateMutation.mutate()}
                          disabled={reactivateMutation.isPending}
                          variant="outline"
                          className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          {reactivateMutation.isPending ? "Processing..." : "Reactivate Subscription"}
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => cancelMutation.mutate()}
                          disabled={cancelMutation.isPending}
                          variant="outline"
                          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          {cancelMutation.isPending ? "Processing..." : "Cancel Subscription"}
                        </Button>
                      )}
                    </>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/my-recipes")}
                    className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  >
                    View My Recipes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <GlobalFooter />

        {/* Navigation Menu */}
        {showNavigation && (
          <GlobalNavigation 
            onClose={() => setShowNavigation(false)}
          />
        )}

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel 
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* User Menu */}
        {showUserMenu && (
          <UserMenu 
            onClose={() => setShowUserMenu(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-orange-600 rounded-full blur-3xl"></div>
      </div>
      
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => setShowSettings(true)}
        onAuthRequired={() => navigate("/")}
      />
      
      <main className="container mx-auto px-4 py-6 pt-20 pb-32 relative z-10 min-h-screen flex items-center">
        <div className="max-w-xs mx-auto w-full">
          <div className="text-center mb-4">
            <div className="relative inline-block">
              <Crown className="w-12 h-12 text-orange-400 mx-auto mb-3 drop-shadow-lg" />
              <div className="absolute -inset-2 bg-orange-400/20 rounded-full blur-lg"></div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Almost there!</h1>
            <p className="text-slate-300 text-sm">Complete your payment to unlock unlimited recipes</p>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl blur opacity-50"></div>
            <Card className="relative bg-slate-800/80 backdrop-blur-sm border-orange-500/30 border shadow-2xl">
              <CardHeader className="text-center border-b border-slate-700/50 pb-4">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium inline-block mb-3">
                  Flavr+ Premium
                </div>
                <CardTitle className="text-xl font-bold text-white">£7.99/month</CardTitle>
                <p className="text-slate-400 text-xs">Unlimited recipes • Cancel anytime</p>
              </CardHeader>
              
              <CardContent className="pt-3 space-y-3 px-3 pb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                    <span>Unlimited AI recipe generation</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                    <span>HD recipe images with every recipe</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                    <span>Priority customer support</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                    <span>Advanced recipe customization</span>
                  </div>
                </div>

                {/* Payment form */}
                {clientSecret && stripeLoaded ? (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Stripe Payment Form (£7.99/month)</p>
                    <Elements 
                      stripe={stripePromise} 
                      options={{ 
                        clientSecret,
                        appearance: {
                          theme: 'night',
                          variables: {
                            colorPrimary: '#fb923c',
                            colorBackground: '#0f172a',
                            colorText: '#f1f5f9',
                            colorDanger: '#ef4444',
                            borderRadius: '8px'
                          }
                        }
                      }}
                    >
                      <SubscribeForm />
                    </Elements>
                  </div>
                ) : clientSecret ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <div className="animate-spin w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full" />
                    <p className="text-slate-400 text-xs">Loading Stripe payment system...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <div className="animate-spin w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full" />
                    <p className="text-slate-400 text-xs">Setting up your subscription...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <GlobalFooter />

      {/* Navigation Menu */}
      {showNavigation && (
        <GlobalNavigation 
          onClose={() => setShowNavigation(false)}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* User Menu */}
      {showUserMenu && (
        <UserMenu 
          onClose={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );

}
