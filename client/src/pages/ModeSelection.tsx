import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Refrigerator, ChefHat } from "lucide-react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/PageLayout";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import QuotaCounter from "@/components/QuotaCounter";

interface ModeCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  gradient: string;
}

const modes: ModeCard[] = [
  {
    title: "Fridge2Fork", 
    description: "Snap a photo or list your ingredients - instant recipes tailored to what you have",
    icon: <Refrigerator className="w-12 h-12" />,
    color: "text-green-500 dark:text-green-400",
    route: "/fridge2fork",
    gradient: "from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20"
  },
  {
    title: "Chef Assist",
    description: "Tell us what you're craving - get personalized recipes in seconds",
    icon: <ChefHat className="w-12 h-12" />,
    color: "text-orange-500 dark:text-orange-400",
    route: "/chef-assist",
    gradient: "from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20"
  }
];

export default function ModeSelection() {
  const [, navigate] = useLocation();

  const handleModeSelect = (mode: ModeCard) => {
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-12">
          {modes.map((mode, index) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                className={cn(
                  "relative overflow-hidden transition-all duration-300 cursor-pointer group h-full",
                  "hover:shadow-xl hover:scale-105",
                  "dark:bg-gray-800/50 dark:border-gray-700"
                )}
                onClick={() => handleModeSelect(mode)}
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  mode.gradient
                )} />
                
                <CardHeader className="relative text-center py-4 md:py-8">
                  <div className={cn("p-3 md:p-4 rounded-full bg-background/80 backdrop-blur-sm inline-flex mx-auto mb-3 md:mb-4", mode.color)}>
                    <Refrigerator className={cn("w-8 h-8 md:w-12 md:h-12", mode.title === "Fridge2Fork" ? "" : "hidden")} />
                    <ChefHat className={cn("w-8 h-8 md:w-12 md:h-12", mode.title === "Chef Assist" ? "" : "hidden")} />
                  </div>
                  <CardTitle className="text-xl md:text-2xl mb-2">{mode.title}</CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    {mode.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative pb-4 md:pb-8">
                  <Button
                    className={cn(
                      "w-full group-hover:translate-y-[-2px] transition-transform",
                      mode.color === "text-green-500 dark:text-green-400" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
                    )}
                    size="lg"
                  >
                    Get Started
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
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
          className="text-center pb-4 md:pb-8"
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