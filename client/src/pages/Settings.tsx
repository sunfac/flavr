import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { iconMap } from "@/lib/iconMap";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";
import GlobalNavigation from "@/components/GlobalNavigation";
import Loading from "@/components/Loading";
import BiometricAuth from "@/components/BiometricAuth";

export default function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNavigation, setShowNavigation] = useState(false);

  // Get user data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  // Get subscription status
  const { data: subscriptionData, isLoading: subLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
    enabled: !!userData,
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Canceled",
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
        throw new Error('Failed to reactivate subscription');
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

  if (userLoading || subLoading) {
    return <Loading message="Loading settings..." />;
  }

  const user = userData?.user;
  const hasFlavrPlus = subscriptionData?.hasFlavrPlus || user?.hasFlavrPlus;
  const cancelAtPeriodEnd = subscriptionData?.cancelAtPeriodEnd;
  const currentPeriodEnd = subscriptionData?.currentPeriodEnd;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <GlobalHeader 
        onMenuClick={() => setShowNavigation(true)}
        onSettingsClick={() => {}}
        onAuthRequired={() => navigate("/")}
      />
      
      <main className="container mx-auto px-4 py-6 pt-24">
        <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>
        
        {/* Account Information */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Username</p>
              <p className="text-white">{user?.username}</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              Subscription Status
              {hasFlavrPlus ? (
                <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  Flavr+ Active
                </Badge>
              ) : (
                <Badge variant="secondary">Free Plan</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasFlavrPlus ? (
              <>
                <div className="space-y-2">
                  <p className="text-gray-300">You have unlimited access to all Flavr features:</p>
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>✓ Unlimited recipe generation</li>
                    <li>✓ HD recipe images</li>
                    <li>✓ All cooking modes</li>
                    <li>✓ Recipe history & sharing</li>
                    <li>✓ Priority support</li>
                  </ul>
                </div>
                
                {currentPeriodEnd && (
                  <div className="text-sm text-gray-400">
                    {cancelAtPeriodEnd ? (
                      <p>Your subscription will end on {new Date(currentPeriodEnd * 1000).toLocaleDateString()}</p>
                    ) : (
                      <p>Next billing date: {new Date(currentPeriodEnd * 1000).toLocaleDateString()}</p>
                    )}
                  </div>
                )}

                {/* Cancel/Reactivate buttons */}
                {user?.email !== "william@blycontracting.co.uk" && (
                  <div className="pt-4">
                    {cancelAtPeriodEnd ? (
                      <Button 
                        onClick={() => reactivateMutation.mutate()}
                        disabled={reactivateMutation.isPending}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                      >
                        {reactivateMutation.isPending ? "Processing..." : "Reactivate Subscription"}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-500/10"
                      >
                        {cancelMutation.isPending ? "Processing..." : "Cancel Subscription"}
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-300">You're on the free plan with limited features:</p>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>• 3 recipes per month</li>
                  <li>• Basic recipe features</li>
                </ul>
                <Button 
                  onClick={() => navigate("/subscribe")}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700"
                >
                  Upgrade to Flavr+
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-slate-800/50 border-slate-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <iconMap.shield className="w-5 h-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-gray-200">Face ID Authentication</h4>
              <p className="text-sm text-gray-400">
                Enhance your account security with biometric authentication
              </p>
            </div>
            
            <BiometricAuth 
              mode="register"
              onSuccess={() => {
                toast({
                  title: "Face ID Enabled Successfully!",
                  description: "You can now use Face ID to sign in securely",
                });
              }}
              onError={(error: string) => {
                toast({
                  title: "Face ID Setup Failed",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-slate-800/50 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                apiRequest("POST", "/api/logout").then(() => {
                  navigate("/");
                });
              }}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              Log Out
            </Button>
          </CardContent>
        </Card>
      </main>

      <GlobalFooter />

      {/* Navigation Panel */}
      {showNavigation && (
        <GlobalNavigation onClose={() => setShowNavigation(false)} />
      )}
    </div>
  );
}