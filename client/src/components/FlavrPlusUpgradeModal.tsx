import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown } from "@/lib/icons";

interface FlavrPlusUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  recipesUsed: number;
  recipesLimit: number;
}

export default function FlavrPlusUpgradeModal({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  recipesUsed, 
  recipesLimit 
}: FlavrPlusUpgradeModalProps) {
  const freeFeatures = [
    "3 free recipes per month",
    "All three cooking modes",
    "Basic recipe generation",
    "Chef assistant chat"
  ];

  const plusFeatures = [
    "Unlimited recipe generation",
    "HD recipe images with every recipe",
    "Access to Flavr Rituals",
    "Priority customer support",
    "Advanced recipe customization",
    "Recipe history and favorites",
    "Meal planning tools",
    "Nutrition information"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            You've Used All {recipesLimit} Free Recipes This Month!
          </DialogTitle>
          
          <DialogDescription className="text-lg text-slate-600">
            Unlock unlimited recipe magic with Flavr+ and never hit limits again
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Usage Display */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-2">
              {recipesUsed}/{recipesLimit} Recipes Used
            </div>
            <div className="w-full bg-orange-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(recipesUsed / recipesLimit) * 100}%` }}
              />
            </div>
            <p className="text-sm text-orange-700 mt-2">
              Your free recipes reset on the 1st of each month
            </p>
          </div>

          {/* Feature Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="border border-slate-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Free</h3>
                <div className="text-2xl font-bold text-slate-600">$0</div>
                <Badge variant="outline" className="mt-2">Current Plan</Badge>
              </div>
              <ul className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Flavr+ Plan */}
            <div className="border-2 border-orange-300 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-orange-100 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-orange-800">Flavr+</h3>
                <div className="text-2xl font-bold text-orange-600">$9.99</div>
                <div className="text-sm text-orange-600">per month</div>
              </div>
              
              <ul className="space-y-3">
                {plusFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <Zap className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-orange-800 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center space-y-4 pt-4">
            <Button 
              onClick={onUpgrade}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-lg font-semibold hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to Flavr+ Now
            </Button>
            
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-500">
              <span>✓ Cancel anytime</span>
              <span>✓ 7-day free trial</span>
              <span>✓ Instant access</span>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}