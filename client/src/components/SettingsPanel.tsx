import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Check if user is logged in
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const isAuthenticated = user?.user;

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
      navigate("/");
      onClose();
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-16 right-4 z-50 w-72">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="font-playfair text-lg">Quick Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/settings")}
            >
              <i className="fas fa-user-cog mr-3"></i>
              Account Settings
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/settings")}
            >
              <i className="fas fa-history mr-3"></i>
              Recipe History
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/subscribe")}
            >
              <i className="fas fa-crown mr-3 text-accent"></i>
              Upgrade to Flavr+
            </Button>
            
            <div className="border-t border-border pt-3">
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <i className="fas fa-sign-out-alt mr-3"></i>
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              )}
              
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={onClose}
              >
                <i className="fas fa-times mr-3"></i>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
