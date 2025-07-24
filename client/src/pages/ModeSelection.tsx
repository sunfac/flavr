import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Refrigerator, ChefHat } from "lucide-react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/PageLayout";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <PageLayout className="py-12">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 pt-8"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            What's Cooking?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose how you'd like to discover your next delicious meal
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
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
                
                <CardHeader className="relative text-center py-8">
                  <div className={cn("p-4 rounded-full bg-background/80 backdrop-blur-sm inline-flex mx-auto mb-4", mode.color)}>
                    {mode.icon}
                  </div>
                  <CardTitle className="text-2xl mb-2">{mode.title}</CardTitle>
                  <CardDescription className="text-base">
                    {mode.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative pb-8">
                  <Button
                    className={cn(
                      "w-full group-hover:translate-y-[-2px] transition-transform",
                      mode.color === "text-green-500 dark:text-green-400" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
                    )}
                    size="lg"
                  >
                    Get Started
                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
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
          className="text-center"
        >
          <Button
            size="lg"
            onClick={() => navigate("/cookbook")}
            variant="outline"
            className="group"
          >
            View My Cookbook
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </PageLayout>
  );
}