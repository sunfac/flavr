import { useState } from "react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ChefHat, Utensils, Heart, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

interface RecipeIdea {
  title: string;
  description: string;
  cuisine: string;
  cookingTime: number;
  difficulty: string;
  keyIngredients: string[];
}

export default function RecipeSelection() {
  const [location, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Get recipes from navigation state
  const locationState = (location as any).state || {};
  const recipes = locationState.recipes || [];
  const mode = locationState.mode;
  const quizData = locationState.quizData;

  if (recipes.length === 0) {
    navigate("/fridge2fork");
    return null;
  }

  const currentRecipe = recipes[currentIndex];

  const handleSelect = async () => {
    setIsGenerating(true);
    try {
      // Generate full recipe from the selected idea
      const response = await apiRequest("POST", "/api/generate-full-recipe", {
        recipeIdea: currentRecipe,
        quizData: quizData
      });

      // Navigate to recipe display with full recipe
      navigate("/recipe", {
        state: {
          recipe: response,
          mode: mode,
          showChat: true
        }
      });
    } catch (error) {
      toast({
        title: "Error generating recipe",
        description: "Please try again",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleReject = () => {
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast({
        title: "No more recipes",
        description: "Let's generate some new ideas!",
      });
      navigate("/fridge2fork");
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy": return "text-green-500";
      case "medium": return "text-yellow-500";
      case "hard": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-bold mb-2">Choose Your Recipe</h1>
          <p className="text-muted-foreground">
            Swipe right to cook, left to see more options
          </p>
        </motion.div>

        <div className="relative h-[500px]">
          <AnimatePresence>
            <motion.div
              key={currentRecipe.title}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0, x: -300 }}
              className="absolute inset-0"
            >
              <Card className="h-full">
                <CardContent className="p-6 h-full flex flex-col">
                  {/* Recipe Header */}
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold mb-2">{currentRecipe.title}</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">{currentRecipe.cuisine}</Badge>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{currentRecipe.cookingTime} mins</span>
                      </div>
                      <div className={`flex items-center gap-1 ${getDifficultyColor(currentRecipe.difficulty)}`}>
                        <ChefHat className="w-4 h-4" />
                        <span className="capitalize">{currentRecipe.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground mb-6 flex-1">
                    {currentRecipe.description}
                  </p>

                  {/* Key Ingredients */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Utensils className="w-4 h-4" />
                      Uses Your Ingredients
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentRecipe.keyIngredients?.map((ingredient: string) => (
                        <Badge key={ingredient} variant="outline">
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleReject}
                      className="flex-1"
                      disabled={isGenerating}
                    >
                      <X className="w-5 h-5 mr-2" />
                      Pass
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleSelect}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Heart className="w-5 h-5 mr-2" />
                          Cook This!
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {recipes.map((_: any, index: number) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full transition-colors ${
                index === currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}