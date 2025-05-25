import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface UserMenuProps {
  onClose: () => void;
}

export default function UserMenu({ onClose }: UserMenuProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear();
      navigate("/");
      onClose();
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    },
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed top-16 right-4 z-50 w-64">
        <Card className="animate-slide-up">
          <CardContent className="p-4 space-y-4">
            {user?.user && (
              <div className="border-b border-border pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-white"></i>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user.user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.user.email}</p>
                    {user.user.isPlus && (
                      <div className="flex items-center text-xs text-accent">
                        <i className="fas fa-crown mr-1"></i>
                        Flavr+ Member
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation("/settings")}
              >
                <i className="fas fa-cog mr-3"></i>
                Settings
              </Button>
              
              {user?.user && !user.user.isPlus && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-primary"
                  onClick={() => handleNavigation("/subscribe")}
                >
                  <i className="fas fa-crown mr-3"></i>
                  Upgrade to Flavr+
                </Button>
              )}
              
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <i className="fas fa-sign-out-alt mr-3"></i>
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
