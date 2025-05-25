import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", email: "", password: "" });

  // Check if user is already logged in
  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user?.user) {
      navigate("/shopping");
    }
  }, [user, navigate]);

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiRequest("POST", "/api/login", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      navigate("/shopping");
      toast({
        title: "Welcome back!",
        description: "You've been successfully logged in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string }) =>
      apiRequest("POST", "/api/register", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      navigate("/shopping");
      toast({
        title: "Welcome to Flavr!",
        description: "Your account has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  if (user?.user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-utensils text-white text-3xl"></i>
            </div>
            <h1 className="text-4xl md:text-6xl font-playfair font-bold text-foreground mb-4">
              Welcome to Flavr
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-powered recipe discovery that adapts to your mood, ingredients, and cooking style. 
              Turn any craving into a perfect meal.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-shopping-cart text-primary text-xl"></i>
                </div>
                <h3 className="font-playfair font-semibold mb-2">Smart Shopping</h3>
                <p className="text-sm text-muted-foreground">
                  Get personalized recipes with complete shopping lists
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-secondary/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-refrigerator text-secondary text-xl"></i>
                </div>
                <h3 className="font-playfair font-semibold mb-2">Fridge to Fork</h3>
                <p className="text-sm text-muted-foreground">
                  Transform available ingredients into delicious meals
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-accent/20">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-chef-hat text-accent text-xl"></i>
                </div>
                <h3 className="font-playfair font-semibold mb-2">Chef Assist</h3>
                <p className="text-sm text-muted-foreground">
                  Get expert-level guidance for your culinary ambitions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Auth Section */}
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center font-playfair">Get Started</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Input
                        type="email"
                        placeholder="Email"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="password"
                        placeholder="Password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Input
                        type="text"
                        placeholder="Username"
                        value={registerData.username}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="Email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="password"
                        placeholder="Password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
