import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { iconMap } from "@/lib/iconMap";
import FlavrIcon from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";

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
  title = "Join Flavr today!",
  description = "Create your account to unlock personalized AI-generated recipes"
}: AuthModalProps) {
  console.log("AuthModal component rendered with isOpen:", isOpen);
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", email: "", password: "" });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Login successful!", data);
      await queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      const meResult = await queryClient.refetchQueries({ queryKey: ["/api/me"] });
      console.log("Refetch /api/me result:", meResult);
      toast({
        title: "Welcome back! 👋",
        description: "Ready to start cooking?",
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
    mutationFn: async (data: { username: string; email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/register", data);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("Registration successful!", data);
      await queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      const meResult = await queryClient.refetchQueries({ queryKey: ["/api/me"] });
      console.log("Refetch /api/me result:", meResult);
      toast({
        title: "Welcome to Flavr! 🎉",
        description: "Your culinary journey begins now",
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-orange-500/20 text-white backdrop-blur-xl">
        <DialogHeader className="text-center pb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <img 
                src={FlavrIcon} 
                alt="Flavr Chef Hat" 
                className="w-12 h-12 drop-shadow-lg" 
              />
              <iconMap.sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
            </div>
          </motion.div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700">
            <TabsTrigger 
              value="signup" 
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all duration-300"
            >
              <iconMap.sparkles className="w-4 h-4 mr-2" />
              Sign Up
            </TabsTrigger>
            <TabsTrigger 
              value="login"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white transition-all duration-300"
            >
              <iconMap.user className="w-4 h-4 mr-2" />
              Log In
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="relative">
                <iconMap.user className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Username"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400"
                  required
                />
              </div>
              <div className="relative">
                <iconMap.mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400"
                  required
                />
              </div>
              <div className="relative">
                <iconMap.lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-orange-500/25"
              >
                {registerMutation.isPending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <iconMap.sparkles className="w-5 h-5 mr-2" />
                    Create Account & See Recipes
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="login" className="space-y-4 mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <iconMap.mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Email or Username"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400"
                  required
                />
              </div>
              <div className="relative">
                <iconMap.lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-orange-500/25"
              >
                {loginMutation.isPending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <iconMap.chefHat className="w-5 h-5 mr-2" />
                    Log In & Start Cooking
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-center text-xs text-slate-400 mt-4">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  );
}