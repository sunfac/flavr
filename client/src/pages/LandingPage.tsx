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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-emerald-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-orange-200 to-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 floating"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-emerald-200 to-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 floating-delayed"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-gradient-to-r from-amber-200 to-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 floating"></div>
      </div>

      <Header />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-8">
            <div className="relative group mx-auto mb-8 w-fit">
              <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-500 animate-bounce-gentle">
                <img 
                  src="/attached_assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png" 
                  alt="Flavr Logo"
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </div>
              <div className="absolute inset-0 rounded-full blur-xl opacity-20 bg-orange-400 group-hover:opacity-40 transition-opacity duration-500"></div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-display leading-tight mb-6" style={{
              background: 'var(--gradient-dopamine)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Welcome to Flavr
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
              AI-powered recipe discovery that adapts to your mood, ingredients, and cooking style. 
              <span className="block mt-2 font-bold text-2xl" style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Turn any craving into a perfect meal.
              </span>
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="glass card-modern group border-0 shadow-2xl hover:shadow-orange-200/50 transition-all duration-500">
              <CardContent className="pt-8 pb-8">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg">
                    <i className="fas fa-shopping-cart text-white text-2xl"></i>
                  </div>
                  <div className="absolute inset-0 gradient-primary rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                </div>
                <h3 className="font-playfair font-bold text-xl mb-3 text-slate-800">Smart Shopping</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get personalized recipes with complete shopping lists tailored to your preferences
                </p>
              </CardContent>
            </Card>
            
            <Card className="glass card-modern group border-0 shadow-2xl hover:shadow-emerald-200/50 transition-all duration-500">
              <CardContent className="pt-8 pb-8">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 gradient-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg">
                    <i className="fas fa-refrigerator text-white text-2xl"></i>
                  </div>
                  <div className="absolute inset-0 gradient-secondary rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                </div>
                <h3 className="font-playfair font-bold text-xl mb-3 text-slate-800">Fridge to Fork</h3>
                <p className="text-slate-600 leading-relaxed">
                  Transform available ingredients into delicious meals with zero waste
                </p>
              </CardContent>
            </Card>
            
            <Card className="glass card-modern group border-0 shadow-2xl hover:shadow-amber-200/50 transition-all duration-500">
              <CardContent className="pt-8 pb-8">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="w-16 h-16 gradient-accent rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg">
                    <i className="fas fa-chef-hat text-white text-2xl"></i>
                  </div>
                  <div className="absolute inset-0 gradient-accent rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
                </div>
                <h3 className="font-playfair font-bold text-xl mb-3 text-slate-800">Chef Assist</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get expert-level guidance for your culinary ambitions and special occasions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main CTA Button */}
          <div className="mb-16">
            <Button
              onClick={() => navigate("/app")}
              className="h-20 px-16 text-2xl font-bold text-white shadow-2xl transition-all duration-500 hover:scale-110 animate-pulse-gentle relative overflow-hidden group"
              style={{ background: 'var(--gradient-dopamine)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <i className="fas fa-sparkles mr-4 text-3xl group-hover:rotate-12 transition-transform duration-300"></i>
              <span className="relative z-10 tracking-wide">Ask the AI Chef</span>
            </Button>
          </div>
        </div>

        {/* Auth Section */}
        <div className="max-w-lg mx-auto animate-scale-in">
          <Card className="glass card-modern border-0 shadow-2xl backdrop-blur-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-playfair font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Get Started</CardTitle>
              <p className="text-slate-600 mt-2">Join thousands creating amazing meals with AI</p>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 glass p-1 h-12">
                  <TabsTrigger value="login" className="btn-modern font-medium">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="btn-modern font-medium">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        required
                        className="input-modern h-12 bg-white/50 border-white/20 placeholder:text-slate-500"
                      />
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="input-modern h-12 bg-white/50 border-white/20 placeholder:text-slate-500"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 btn-modern gradient-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In to Flavr"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="register" className="mt-6">
                  <form onSubmit={handleRegister} className="space-y-6">
                    <div className="space-y-4">
                      <Input
                        type="text"
                        placeholder="Choose a username"
                        value={registerData.username}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                        required
                        className="input-modern h-12 bg-white/50 border-white/20 placeholder:text-slate-500"
                      />
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        required
                        className="input-modern h-12 bg-white/50 border-white/20 placeholder:text-slate-500"
                      />
                      <Input
                        type="password"
                        placeholder="Create a password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="input-modern h-12 bg-white/50 border-white/20 placeholder:text-slate-500"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 btn-modern gradient-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Your Account"}
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
