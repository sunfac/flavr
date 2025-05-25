import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

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
      <DialogContent className="sm:max-w-md mx-4 p-0 overflow-hidden rounded-3xl border-0 bg-transparent">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="glass bg-card/95 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl"
        >
          {/* Header with cooking emoji */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center space-y-4 mb-8"
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl mx-auto"
            >
              👨‍🍳
            </motion.div>
            <DialogTitle className="text-2xl font-bold text-display">
              {title}
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              {description}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="register" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 backdrop-blur-sm rounded-2xl p-1 mb-6">
                <TabsTrigger 
                  value="register" 
                  className="rounded-xl font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Sign Up ✨
                </TabsTrigger>
                <TabsTrigger 
                  value="login"
                  className="rounded-xl font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all duration-300"
                >
                  Log In 🔐
                </TabsTrigger>
              </TabsList>

              <TabsContent value="register" className="space-y-4">
                <motion.form 
                  onSubmit={handleRegister} 
                  className="space-y-4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input
                      type="text"
                      placeholder="Choose a username"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      className="h-14 text-lg rounded-2xl border-2 border-border/50 focus:border-primary/50 transition-all duration-300 bg-background/50"
                      required
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="h-14 text-lg rounded-2xl border-2 border-border/50 focus:border-primary/50 transition-all duration-300 bg-background/50"
                      required
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input
                      type="password"
                      placeholder="Create a password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="h-14 text-lg rounded-2xl border-2 border-border/50 focus:border-primary/50 transition-all duration-300 bg-background/50"
                      required
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl transition-all duration-300"
                      disabled={registerMutation.isPending}
                      style={{ background: 'var(--gradient-primary)' }}
                    >
                      {registerMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Creating account...
                        </div>
                      ) : (
                        <>
                          <span className="mr-2">✨</span>
                          Create Account & See Recipes
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              </TabsContent>

              <TabsContent value="login" className="space-y-4">
                <motion.form 
                  onSubmit={handleLogin} 
                  className="space-y-4"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="h-14 text-lg rounded-2xl border-2 border-border/50 focus:border-primary/50 transition-all duration-300 bg-background/50"
                      required
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="h-14 text-lg rounded-2xl border-2 border-border/50 focus:border-primary/50 transition-all duration-300 bg-background/50"
                      required
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl transition-all duration-300"
                      disabled={loginMutation.isPending}
                      style={{ background: 'var(--gradient-primary)' }}
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Logging in...
                        </div>
                      ) : (
                        <>
                          <span className="mr-2">🔑</span>
                          Log In & See Recipes
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.form>
              </TabsContent>
            </Tabs>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-xs text-muted-foreground border-t border-border/30 pt-4 mt-6"
          >
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}