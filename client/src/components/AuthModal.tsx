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
import BiometricAuth from "@/components/BiometricAuth";
import FlavrIcon from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  initialMode?: "login" | "signup";
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  title = "Join Flavr today!",
  description = "Create your account to unlock personalized AI-generated recipes",
  initialMode = "signup"
}: AuthModalProps) {
  console.log("AuthModal component rendered with isOpen:", isOpen);
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", email: "", password: "" });
  const [activeTab, setActiveTab] = useState(initialMode);

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

  const handleBiometricSuccess = (user?: any) => {
    if (user) {
      toast({
        title: "Welcome back! 👋",
        description: "Successfully signed in with Face ID",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      onSuccess();
      onClose();
    }
  };

  const handleBiometricError = (error: string) => {
    toast({
      title: "Biometric Authentication Failed",
      description: error,
      variant: "destructive",
    });
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

        <Tabs defaultValue={initialMode} className="w-full">
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

            {/* Face ID Setup Option for new users */}
            <div className="mt-4 p-4 bg-slate-800/30 border border-slate-600/50 rounded-lg">
              <BiometricAuth 
                mode="register" 
                onSuccess={() => {
                  toast({
                    title: "Face ID Enabled! 🎉",
                    description: "You can now use Face ID to sign in quickly and securely.",
                  });
                }}
                onError={handleBiometricError}
              />
            </div>
            
            {/* OAuth Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-400">Or continue with</span>
              </div>
            </div>
            
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = '/api/auth/google'}
                className="w-full flex items-center gap-3 py-3 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = '/api/auth/apple'}
                className="w-full flex items-center gap-3 py-3 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="login" className="space-y-4 mt-6">
            {/* Face ID Authentication Option */}
            <BiometricAuth 
              mode="authenticate" 
              email={loginData.email}
              onSuccess={handleBiometricSuccess}
              onError={handleBiometricError}
            />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-400">Or continue with email</span>
              </div>
            </div>

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
            
            {/* OAuth Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-400">Or continue with</span>
              </div>
            </div>
            
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = '/api/auth/google'}
                className="w-full flex items-center gap-3 py-3 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = '/api/auth/apple'}
                className="w-full flex items-center gap-3 py-3 bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center text-xs text-slate-400 mt-4">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  );
}