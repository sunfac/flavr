import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowLeft, Sparkles } from "lucide-react";
import FlavrLogo from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";

export default function LoginPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  
  // Check URL params for signup mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === 'true') {
      setIsLogin(false);
    }
  }, [location]);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      navigate("/");
    },
    onError: (error: any) => {
      toast({ 
        title: "Login failed", 
        description: error.message || "Invalid credentials",
        variant: "destructive" 
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/register", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Welcome to Flavr!", description: "Account created successfully." });
      navigate("/");
      // Show subscription offer after a moment, but don't force redirect
      setTimeout(() => {
        toast({
          title: "Upgrade to Flavr+? 🚀",
          description: "Get unlimited recipes and premium features. Visit /subscribe to upgrade!",
        });
      }, 2000);
    },
    onError: (error: any) => {
      toast({ 
        title: "Signup failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      loginMutation.mutate({ email, password });
    } else {
      if (!username.trim()) {
        toast({ title: "Error", description: "Username is required", variant: "destructive" });
        return;
      }
      signupMutation.mutate({ username, email, password });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="absolute left-4 top-4 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={FlavrLogo} alt="Flavr" className="w-12 h-12" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {isLogin ? "Welcome back!" : "Join Flavr"}
            </CardTitle>
            <p className="text-slate-400">
              {isLogin ? "Sign in to access your recipes" : "Create your account to start cooking"}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                      required={!isLogin}
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
                disabled={loginMutation.isPending || signupMutation.isPending}
              >
                {(loginMutation.isPending || signupMutation.isPending) ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {isLogin ? "Sign In" : "Create Account"}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail("");
                  setPassword("");
                  setUsername("");
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>


          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}