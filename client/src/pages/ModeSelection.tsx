import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChefHat, CalendarDays, Lock, Camera, ShoppingCart, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/PageLayout";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import QuotaCounter from "@/components/QuotaCounter";
import FloatingChatButton from "@/components/FloatingChatButton";

interface ModeCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  gradient: string;
  isPremium?: boolean;
  isComingSoon?: boolean;
}

const modes: ModeCard[] = [
  {
    title: "Discover",
    description: "Find chef-inspired dishes perfectly matched to your taste profile and mood",
    icon: <ChefHat className="w-12 h-12" />,
    color: "text-primary",
    route: "/chef-assist",
    gradient: "from-primary/10 to-primary/20"
  },
  {
    title: "Plan",
    description: "Generate weekly meal plans with smart shopping lists tailored to your preferences",
    icon: <CalendarDays className="w-12 h-12" />,
    color: "text-secondary",
    route: "/weekly-planner",
    gradient: "from-secondary/10 to-secondary/20",
    isPremium: true
  },
  {
    title: "Capture",
    description: "Transform cookbook photos and ingredient lists into interactive digital recipes",
    icon: <Camera className="w-12 h-12" />,
    color: "text-accent",
    route: "/photo-to-recipe",
    gradient: "from-accent/10 to-accent/20",
    isPremium: true
  }
];

export default function ModeSelection() {
  const [, navigate] = useLocation();

  const handleModeSelect = (mode: ModeCard) => {
    if (mode.isComingSoon) {
      return; // Do nothing for coming soon modes
    }
    navigate(mode.route);
  };

  return (
    <PageLayout className="py-4 md:py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-16 pt-12 md:pt-16"
        >
          <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Your Private Chef
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 md:mb-6">
            Premium culinary experiences, perfectly tailored to your taste
          </p>
          <div className="flex justify-center">
            <QuotaCounter showUpgradeHint={true} />
          </div>
        </motion.div>

        {/* Talk to Private Chef Button - Fixed above mode cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center mb-8 md:mb-12"
        >
          <FloatingChatButton variant="fixed" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 md:mb-12 max-w-7xl mx-auto">
          {modes.map((mode, index) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                className={cn(
                  "relative overflow-hidden transition-all duration-300 group h-full",
                  mode.isComingSoon 
                    ? "cursor-not-allowed hover:shadow-lg hover:scale-[1.02] opacity-90" 
                    : "cursor-pointer hover:shadow-xl hover:scale-105",
                  "bg-card/80 border-border backdrop-blur-sm"
                )}
                onClick={() => handleModeSelect(mode)}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
                  mode.isComingSoon 
                    ? "opacity-30" 
                    : "opacity-0 group-hover:opacity-100",
                  mode.gradient
                )} />
                
                <CardHeader className="relative text-center py-4 md:py-6">
                  <div className={cn(
                    "p-2 sm:p-3 md:p-4 rounded-full bg-background/80 backdrop-blur-sm inline-flex mx-auto mb-2 sm:mb-3 md:mb-4 border-2 border-current/20", 
                    mode.color
                  )}>
                    <ChefHat className={cn("w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10", mode.title === "Discover" ? "" : "hidden")} />
                    <Camera className={cn("w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10", mode.title === "Capture" ? "" : "hidden")} />
                    <CalendarDays className={cn("w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10", mode.title === "Plan" ? "" : "hidden")} />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
                    <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">{mode.title}</CardTitle>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {mode.isPremium && (
                      <Badge variant="outline" className="text-xs font-semibold bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300">
                        <Lock className="w-3 h-3 mr-1" />
                        Flavr+
                      </Badge>
                    )}
                    {mode.isComingSoon && (
                      <Badge variant="outline" className="text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs sm:text-sm md:text-base leading-snug px-1 sm:px-2 text-center">
                    {mode.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative pb-3 sm:pb-4 md:pb-6">
                  <Button
                    className={cn(
                      "w-full transition-all duration-200 font-semibold text-xs sm:text-sm",
                      mode.isComingSoon 
                        ? "cursor-not-allowed bg-gray-400 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-600 text-white" 
                        : "group-hover:translate-y-[-2px] shadow-lg hover:shadow-xl",
                      !mode.isComingSoon && mode.title === "Discover" ? "bg-primary hover:bg-primary/90" : "",
                      !mode.isComingSoon && mode.title === "Plan" ? "bg-secondary hover:bg-secondary/90" : "",
                      !mode.isComingSoon && mode.title === "Capture" ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""
                    )}
                    size="default"
                    disabled={mode.isComingSoon}
                  >
                    {mode.isComingSoon ? "Coming Soon" : "Get Started"}
                    {!mode.isComingSoon && (
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center pb-16 md:pb-20"
        >
          <Button
            size="default"
            onClick={() => navigate("/cookbook")}
            variant="outline"
            className="group text-sm md:text-base"
          >
            View My Cookbook
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </PageLayout>
  );
}