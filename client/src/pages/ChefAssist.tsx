import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChefHat, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLayout } from "@/components/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Extended rotating suggestions
const suggestions = [
  "Quick weeknight pasta",
  "Healthy Asian stir-fry", 
  "Comfort food classics",
  "Mediterranean feast",
  "Mexican street tacos",
  "Japanese ramen bowl",
  "Indian curry night",
  "French bistro dinner",
  "Thai coconut curry",
  "Spanish tapas spread",
  "Korean BBQ at home",
  "Middle Eastern mezze",
  "Italian Sunday dinner",
  "Greek island favorites",
  "Vietnamese pho soup",
  "Moroccan tagine",
  "British pub classics",
  "American BBQ feast",
  "Chinese dim sum",
  "Brazilian churrasco"
];

export default function ChefAssist() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const { toast } = useToast();

  // Rotate suggestions every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleInspireMe = async () => {
    setIsProcessing(true);
    try {
      // Get AI-generated unique suggestion
      const response = await apiRequest("POST", "/api/chef-assist/inspire", {});
      setPrompt(response.suggestion);
    } catch (error) {
      // Fallback to random suggestion if API fails
      const randomIndex = Math.floor(Math.random() * suggestions.length);
      setPrompt(suggestions[randomIndex]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter what you'd like to cook",
        description: "Tell us what you're craving!",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiRequest("POST", "/api/chef-assist/generate", {
        prompt: prompt.trim(),
        servings: 4, // Default servings
        cookingTime: 30 // Default cooking time
      });

      // Navigate directly to recipe card with full recipe
      navigate("/recipe", {
        state: {
          recipe: response.recipe,
          mode: "chef-assist",
          showChat: true // Enable chat for modifications
        }
      });
    } catch (error) {
      toast({
        title: "Error generating recipe",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Display 3 rotating suggestions
  const visibleSuggestions = [
    suggestions[currentSuggestionIndex],
    suggestions[(currentSuggestionIndex + 1) % suggestions.length],
    suggestions[(currentSuggestionIndex + 2) % suggestions.length]
  ];

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex p-3 bg-orange-500/10 rounded-full mb-4">
            <ChefHat className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Chef Assist</h1>
          <p className="text-muted-foreground">
            Tell us what you're craving and we'll create the perfect recipe
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>What would you like to cook?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Describe your craving..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleGenerateRecipe()}
                className="text-lg"
              />
              <Button
                onClick={handleInspireMe}
                variant="outline"
                disabled={isProcessing}
                className="whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Inspire Me
              </Button>
            </div>

            {/* Rotating Suggestions */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try these ideas:</p>
              <AnimatePresence mode="popLayout">
                <div className="flex flex-wrap gap-2">
                  {visibleSuggestions.map((suggestion, index) => (
                    <motion.div
                      key={`${suggestion}-${currentSuggestionIndex}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(suggestion)}
                        className="text-sm"
                      >
                        {suggestion}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>

            <Button
              onClick={handleGenerateRecipe}
              disabled={!prompt.trim() || isProcessing}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating your recipe...
                </>
              ) : (
                <>
                  Generate Recipe
                  <ChefHat className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 bg-muted/50 rounded-lg"
        >
          <h3 className="font-semibold mb-2 text-center">✨ Customize After Generation</h3>
          <p className="text-sm text-muted-foreground text-center">
            Once your recipe is ready, use Zest (our AI assistant) to make changes like:
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div className="text-center">• Scale servings (2-20 people)</div>
            <div className="text-center">• Add dietary restrictions</div>
            <div className="text-center">• Make it spicier or milder</div>
            <div className="text-center">• Elevate with premium ingredients</div>
            <div className="text-center">• Adjust cooking time</div>
            <div className="text-center">• Change cooking methods</div>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  );
}