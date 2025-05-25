import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [, navigate] = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-16 right-4 z-50 w-72">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="font-playfair text-lg">Quick Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/settings")}
            >
              <i className="fas fa-user-cog mr-3"></i>
              Account Settings
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/settings")}
            >
              <i className="fas fa-history mr-3"></i>
              Recipe History
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => handleNavigation("/subscribe")}
            >
              <i className="fas fa-crown mr-3 text-accent"></i>
              Upgrade to Flavr+
            </Button>
            
            <div className="border-t border-border pt-3">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={onClose}
              >
                <i className="fas fa-times mr-3"></i>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
