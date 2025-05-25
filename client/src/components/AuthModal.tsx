import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Sign up to see your recipes!",
  description = "Create your account to unlock personalized AI-generated recipes"
}: AuthModalProps) {
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", email: "", password: "" });

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest("POST", "/api/login", data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Welcome back!",
        description: "You're now logged in and ready to see your recipes.",
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string }) =>
      apiRequest("POST", "/api/register", data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Account created!",
        description: "Welcome to Flavr! Your recipes are ready.",
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.username || !registerData.email || !registerData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(registerData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-2xl font-bold text-display">
            {title}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            {description}
          </p>
        </DialogHeader>

        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Sign Up</TabsTrigger>
            <TabsTrigger value="login">Log In</TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-4 mt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                type="text"
                placeholder="Choose a username"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                className="h-12"
                required
              />
              <Input
                type="email"
                placeholder="Enter your email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                className="h-12"
                required
              />
              <Input
                type="password"
                placeholder="Create a password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                className="h-12"
                required
              />
              <Button
                type="submit"
                className="w-full h-12 text-lg font-semibold"
                disabled={registerMutation.isPending}
                style={{ background: 'var(--gradient-primary)' }}
              >
                {registerMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Creating account...
                  </div>
                ) : (
                  <>
                    <i className="fas fa-magic mr-2"></i>
                    Create Account & See Recipes
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="login" className="space-y-4 mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="h-12"
                required
              />
              <Input
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="h-12"
                required
              />
              <Button
                type="submit"
                className="w-full h-12 text-lg font-semibold"
                disabled={loginMutation.isPending}
                style={{ background: 'var(--gradient-primary)' }}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Logging in...
                  </div>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Log In & See Recipes
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  );
}