import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FlavrPlusGateProps {
  onClose: () => void;
}

export default function FlavrPlusGate({ onClose }: FlavrPlusGateProps) {
  const [, navigate] = useLocation();

  const handleUpgrade = () => {
    navigate("/subscribe");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-sm w-full animate-slide-up">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-crown text-white text-2xl"></i>
            </div>
            <h2 className="text-xl font-playfair font-bold text-foreground mb-2">
              Upgrade to Flavr+
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              You've used your 5 free recipes this month. Upgrade for unlimited access to AI-generated recipes.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3 text-sm text-foreground">
                <i className="fas fa-check text-[hsl(var(--success))]"></i>
                <span>Unlimited AI recipe generation</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-foreground">
                <i className="fas fa-check text-[hsl(var(--success))]"></i>
                <span>HD recipe images</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-foreground">
                <i className="fas fa-check text-[hsl(var(--success))]"></i>
                <span>Priority customer support</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90"
              >
                Upgrade for $4.99/month
              </Button>
              <Button 
                onClick={onClose}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
