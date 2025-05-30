import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/Icon";
import { useLocation } from "wouter";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  recipesUsed?: number;
  recipesLimit?: number;
}

export default function UpgradeModal({ 
  isOpen, 
  onClose,
  title = "You've reached your free recipe limit",
  description = "Unlock unlimited recipes, GPT-4 Turbo, weekly meal plans, and stunning recipe images",
  recipesUsed = 3,
  recipesLimit = 3
}: UpgradeModalProps) {
  const [, navigate] = useLocation();

  const handleUpgradeClick = () => {
    navigate('/flavr-plus');
    onClose();
  };

  const features = [
    {
      icon: <Icon name="sparkles" className="w-5 h-5 text-orange-400" />,
      text: "Unlimited recipe generation"
    },
    {
      icon: <Icon name="crown" className="w-5 h-5 text-orange-400" />,
      text: "GPT-4 Turbo for smarter recipes"
    },
    {
      icon: <Icon name="image" className="w-5 h-5 text-orange-400" />,
      text: "High-quality recipe images"
    },
    {
      icon: <Icon name="calendar" className="w-5 h-5 text-orange-400" />,
      text: "Weekly meal plans & Flavr Rituals"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Icon name="crown" className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold text-white mb-2">
            {title}
          </DialogTitle>
          <p className="text-slate-400 text-sm">
            {description}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Usage Progress */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Monthly recipes used</span>
              <span className="text-orange-400 font-medium">{recipesUsed}/{recipesLimit}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full" 
                style={{ width: `${(recipesUsed / recipesLimit) * 100}%` }}
              />
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {feature.icon}
                </div>
                <span className="text-sm text-slate-300">{feature.text}</span>
                <Icon name="check" className="w-4 h-4 text-green-400 ml-auto" />
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-400 mb-1">£4.99</div>
            <div className="text-sm text-slate-400">per month</div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgradeClick}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
            >
              <Icon name="crown" className="w-4 h-4 mr-2" />
              Upgrade to Flavr+
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}