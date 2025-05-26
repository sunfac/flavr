import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalNavigation from "@/components/GlobalNavigation";
import SettingsPanel from "@/components/SettingsPanel";
import UserMenu from "@/components/UserMenu";
import GlobalFooter from "@/components/GlobalFooter";
import Loading from "@/components/Loading";

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  // Get user recipes
  const { data: recipesData } = useQuery({
    queryKey: ["/api/recipes"],
    enabled: !!user?.user,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      navigate("/");
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    },
  });

  if (userLoading) {
    return <Loading message="Loading your settings..." />;
  }

  if (!user?.user) {
    navigate("/");
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleUpgrade = () => {
    navigate("/subscribe");
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      
      <main className="container mx-auto px-4 py-6 pb-20">
        <h1 className="text-2xl font-playfair font-bold text-foreground mb-6">Settings</h1>
        
        <div className="space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="font-playfair">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Username</label>
                <p className="text-foreground">{user.user.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground">{user.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Plan</label>
                <p className="text-foreground flex items-center">
                  {user.user.isPlus ? (
                    <>
                      <i className="fas fa-crown text-accent mr-2"></i>
                      Flavr+ Premium
                    </>
                  ) : (
                    "Free Plan"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="font-playfair">Usage This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Recipes Generated</span>
                <span className="font-medium">
                  {user.user.recipesThisMonth || 0}
                  {!user.user.isPlus && " / 5"}
                </span>
              </div>
              {!user.user.isPlus && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((user.user.recipesThisMonth || 0) / 5 * 100, 100)}%` }}
                  ></div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {user.user.isPlus 
                  ? "Unlimited recipes with Flavr+"
                  : `${5 - (user.user.recipesThisMonth || 0)} recipes remaining`
                }
              </div>
            </CardContent>
          </Card>

          {/* Recipe History */}
          <Card>
            <CardHeader>
              <CardTitle className="font-playfair">Recipe History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                <i className="fas fa-history text-2xl mb-2"></i>
                <p>You have {recipesData?.recipes?.length || 0} saved recipes</p>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Section */}
          {!user.user.isPlus && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="font-playfair text-primary">Upgrade to Flavr+</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <i className="fas fa-check text-success"></i>
                    <span>Unlimited AI recipe generation</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <i className="fas fa-check text-success"></i>
                    <span>HD recipe images</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <i className="fas fa-check text-success"></i>
                    <span>Priority customer support</span>
                  </div>
                </div>
                <Button 
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90"
                >
                  Upgrade for $4.99/month
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Logout */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
