import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Refrigerator, ChefHat, CalendarDays, Lock, Camera, ShoppingCart, DollarSign } from "lucide-react";
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
    title: "Fridge Mode", 
    description: "Snap a photo or list your ingredients - instant recipes tailored to what you have",
    icon: <Refrigerator className="w-12 h-12" />,
    color: "text-green-500 dark:text-green-400",
    route: "/fridge2fork",
    gradient: "from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20"
  },
  {
    title: "Shopping Mode",
    description: "Get complete recipes with organized shopping lists for your next grocery trip",
    icon: <ShoppingCart className="w-12 h-12" />,
    color: "text-blue-500 dark:text-blue-400",
    route: "/shopping",
    gradient: "from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20"
  },
  {
    title: "Chef Assist",
    description: "Tell us what you're craving - get personalized recipes with professional guidance",
    icon: <ChefHat className="w-12 h-12" />,
    color: "text-orange-500 dark:text-orange-400",
    route: "/chef-assist",
    gradient: "from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20"
  },
  {
    title: "Budget Planner",
    description: "Smart meal planning that maximizes flavor while staying within your budget",
    icon: <DollarSign className="w-12 h-12" />,
    color: "text-emerald-500 dark:text-emerald-400",
    route: "/budget-planner",
    gradient: "from-emerald-500/10 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/20"
  },
  {
    title: "Photo to Recipe",
    description: "Transform cookbook photos into interactive digital recipes with AI",
    icon: <Camera className="w-12 h-12" />,
    color: "text-indigo-500 dark:text-indigo-400",
    route: "/photo-to-recipe",
    gradient: "from-indigo-500/10 to-indigo-600/10 dark:from-indigo-500/20 dark:to-indigo-600/20",
    isPremium: true
  },
  {
    title: "Meal Planner",
    description: "Plan your week with AI-generated meal schedules and shopping lists",
    icon: <CalendarDays className="w-12 h-12" />,
    color: "text-purple-500 dark:text-purple-400",
    route: "/meal-planner",
    gradient: "from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20",
    isPremium: true,
    isComingSoon: true
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
          <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            What's Cooking?
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 md:mb-6">
            Choose how you'd like to discover your next delicious meal
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-12 max-w-6xl mx-auto">
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
                  "dark:bg-gray-800/50 dark:border-gray-700"
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
                
                <CardHeader className="relative text-center py-4 md:py-8">
                  <div className={cn(
                    "p-3 md:p-4 rounded-full bg-background/80 backdrop-blur-sm inline-flex mx-auto mb-3 md:mb-4 border-2 border-current/20", 
                    mode.color
                  )}>
                    <Refrigerator className={cn("w-8 h-8 md:w-12 md:h-12", mode.title === "Fridge2Fork" ? "" : "hidden")} />
                    <ChefHat className={cn("w-8 h-8 md:w-12 md:h-12", mode.title === "Chef Assist" ? "" : "hidden")} />
                    <Camera className={cn("w-8 h-8 md:w-12 md:h-12", mode.title === "Photo to Recipe" ? "" : "hidden")} />
                    <CalendarDays className={cn("w-8 h-8 md:w-12 md:h-12", mode.title === "Meal Planner" ? "" : "hidden")} />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <CardTitle className="text-xl md:text-2xl font-bold">{mode.title}</CardTitle>
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
                  <CardDescription className="text-sm md:text-base leading-relaxed px-2">
                    {mode.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative pb-4 md:pb-8">
                  <Button
                    className={cn(
                      "w-full transition-all duration-200 font-semibold",
                      mode.isComingSoon 
                        ? "cursor-not-allowed bg-gray-400 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-600 text-white" 
                        : "group-hover:translate-y-[-2px] shadow-lg hover:shadow-xl",
                      !mode.isComingSoon && mode.color === "text-green-500 dark:text-green-400" ? "bg-green-600 hover:bg-green-700" : "",
                      !mode.isComingSoon && mode.color === "text-orange-500 dark:text-orange-400" ? "bg-orange-600 hover:bg-orange-700" : "",
                      !mode.isComingSoon && mode.color === "text-purple-500 dark:text-purple-400" ? "bg-purple-600 hover:bg-purple-700" : ""
                    )}
                    size="lg"
                    disabled={mode.isComingSoon}
                  >
                    {mode.isComingSoon ? "Coming Soon" : "Get Started"}
                    {!mode.isComingSoon && (
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
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