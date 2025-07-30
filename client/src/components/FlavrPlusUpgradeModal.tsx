import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { iconMap } from "@/lib/iconMap";
import FlavrIcon from "@assets/0EBD66C5-C52B-476B-AC48-A6F4E0E3EAE7.png";

interface FlavrPlusUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipesUsed?: number;
}

export default function FlavrPlusUpgradeModal({ 
  isOpen, 
  onClose, 
  recipesUsed = 3 
}: FlavrPlusUpgradeModalProps) {
  const [, navigate] = useLocation();

  const handleUpgrade = () => {
    onClose();
    navigate("/subscribe");
  };

  const handleSignUp = () => {
    onClose(); 
    // Navigate to landing page with signup parameter
    navigate("/?signup=true");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-orange-500/30 text-white backdrop-blur-xl">
        <DialogHeader className="text-center pb-4 md:pb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <img 
                src={FlavrIcon} 
                alt="Flavr Chef Hat" 
                className="w-16 h-16 drop-shadow-lg" 
              />
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full p-1">
                <iconMap.crown className="w-4 h-4 text-white" />
              </div>
            </div>
          </motion.div>
          
          <DialogTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-2">
            Recipe Limit Reached!
          </DialogTitle>
          
          <div className="space-y-3">
            <p className="text-slate-300 text-lg">
              You've used all <span className="font-semibold text-orange-400">{recipesUsed}</span> free recipes this month.
            </p>
            <p className="text-slate-400">
              Upgrade to <span className="font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Flavr+</span> for unlimited AI-generated recipes!
            </p>
          </div>
        </DialogHeader>

        {/* Features List */}
        <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
          <h3 className="text-lg md:text-xl font-semibold text-center mb-3 md:mb-4 text-orange-400">
            Flavr+ Premium Features
          </h3>
          
          <div className="space-y-3">
            {[
              { icon: iconMap.sparkles, text: "Unlimited AI-generated recipes" },
              { icon: iconMap.chefHat, text: "Advanced chef-level techniques" },
              { icon: iconMap.heart, text: "Save unlimited recipes to My Cookbook" },
              { icon: iconMap.shoppingCart, text: "Smart shopping lists with price optimization" },
              { icon: iconMap.users, text: "Share recipes with friends and family" },
              { icon: iconMap.crown, text: "Priority support and new features first" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3"
              >
                <div className="bg-orange-500/20 rounded-full p-2">
                  <feature.icon className="w-5 h-5 text-orange-400" />
                </div>
                <span className="text-slate-300">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-orange-500/20">
          <div className="text-center">
            <div className="flex items-baseline justify-center space-x-2">
              <span className="text-3xl font-bold text-orange-400">£4.99</span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Cancel anytime • No commitment
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 md:space-y-3">
          <Button
            onClick={handleUpgrade}
            className="w-full py-3 md:py-4 text-base md:text-lg font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-400 hover:via-orange-500 hover:to-amber-400 border-0 shadow-xl hover:shadow-orange-500/50 transition-all duration-300 text-white"
          >
            <iconMap.crown className="w-5 h-5 mr-2" />
            Upgrade to Flavr+ Now
          </Button>
          
          <Button
            onClick={handleSignUp}
            variant="outline"
            className="w-full py-2 md:py-3 text-sm md:text-base text-white border-white/30 hover:border-white/50 bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
          >
            <iconMap.userPlus className="w-4 h-4 mr-2" />
            Sign Up for Free Account
          </Button>
          
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}