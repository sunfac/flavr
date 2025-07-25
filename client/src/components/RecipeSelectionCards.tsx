import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, Heart, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRecipeStore } from "@/stores/recipeStore";
import { useLocation } from "wouter";

interface RecipeIdea {
  title: string;
  description: string;
  cuisine: string;
  cookTime: string;
  difficulty: string;
  keyIngredients: string[];
}

interface RecipeSelectionCardsProps {
  recipes: RecipeIdea[];
  quizData: any;
  onBack: () => void;
}

export default function RecipeSelectionCards({ recipes, quizData, onBack }: RecipeSelectionCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { updateActiveRecipe } = useRecipeStore();
  const [, navigate] = useLocation();

  const currentRecipe = recipes[currentIndex];

  const handleLike = async () => {
    setIsGenerating(true);
    try {
      // Generate full recipe from selected suggestion
      const fullRecipeResponse = await apiRequest("POST", "/api/generate-full-recipe", {
        recipeIdea: currentRecipe,
        quizData: quizData
      });
      const fullRecipeData = await fullRecipeResponse.json();
      
      if (fullRecipeData.recipe) {
        // Store generation parameters for rerolling
        const generationParams = {
          mode: 'fridge' as const,
          originalInputs: {
            recipeIdea: currentRecipe,
            quizData: quizData
          }
        };
        // Set imageLoading initially if no image
        if (!fullRecipeData.recipe.image && !fullRecipeData.recipe.imageUrl) {
          fullRecipeData.recipe.imageLoading = true;
        }
        updateActiveRecipe(fullRecipeData.recipe, generationParams);
        navigate("/recipe");
      } else {
        throw new Error("Failed to generate full recipe");
      }
    } catch (error: any) {
      console.error("Recipe generation error:", error);
      
      // Handle quota limit error specifically
      let errorMessage = "Please try again";
      let errorTitle = "Error generating recipe";
      
      try {
        // Try to parse the response error from apiRequest
        if (error.message && error.message.includes("403:")) {
          // Format is "403: {JSON response}"
          const jsonPart = error.message.substring(error.message.indexOf(': ') + 2);
          const errorData = JSON.parse(jsonPart);
          if (errorData.error) {
            errorMessage = errorData.error;
            errorTitle = "Recipe limit reached";
          }
        } else if (error.message && error.message.includes("You have no free recipes")) {
          errorMessage = error.message;
          errorTitle = "Recipe limit reached";
        }
      } catch (parseError) {
        console.log("Could not parse error, using default message");
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handlePass = () => {
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All recipes passed, go back to ingredient input
      toast({
        title: "No more recipes",
        description: "Try adding different ingredients for new suggestions",
      });
      onBack();
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
          <h3 className="text-xl font-semibold text-white">Creating your recipe...</h3>
          <p className="text-slate-300">This will just take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Progress indicator */}
        <div className="text-center mb-6">
          <p className="text-slate-300 text-sm">
            Recipe {currentIndex + 1} of {recipes.length}
          </p>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / recipes.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Recipe Card */}
        <Card className="bg-slate-800/90 border-slate-700 backdrop-blur-sm mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-white text-xl mb-2">
                  {currentRecipe.title}
                </CardTitle>
                <CardDescription className="text-slate-300 text-base leading-relaxed">
                  {currentRecipe.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Recipe details */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                <ChefHat className="w-3 h-3 mr-1" />
                {currentRecipe.cuisine}
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                <Clock className="w-3 h-3 mr-1" />
                {currentRecipe.cookTime}
              </Badge>
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                {currentRecipe.difficulty}
              </Badge>
            </div>

            {/* Key ingredients */}
            <div>
              <h4 className="text-white font-medium mb-2">Key Ingredients:</h4>
              <div className="flex flex-wrap gap-1">
                {currentRecipe.keyIngredients.map((ingredient, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={handlePass}
            variant="outline"
            size="lg"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-slate-800/50"
          >
            <X className="w-5 h-5 mr-2" />
            Pass
          </Button>
          <Button
            onClick={handleLike}
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            <Heart className="w-5 h-5 mr-2" />
            Cook This!
          </Button>
        </div>

        {/* Back button */}
        <div className="text-center mt-6">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-slate-400 hover:text-white"
          >
            ← Back to ingredients
          </Button>
        </div>
      </div>
    </div>
  );
}