import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ChefHat, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageLayout } from "@/components/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { iconMap } from "@/lib/iconMap";

// Use the original chef assist examples
const chefExamples = [
  "I want to recreate peri-peri chicken like Nando's",
  "I want to make a Zinger Tower Burger like the one from KFC",
  "I want to cook a Greggs-style steak bake at home",
  "I want to make a teriyaki chicken donburi like Itsu",
  "I want to bake a luxurious chocolate and salted caramel celebration cake",
  "I want to make sourdough pizza from scratch with honey and Nduja",
  "I want to cook a Michelin-style mushroom risotto with truffle oil",
  "I want to make a romantic date-night steak dinner with chimichurri",
  "I want to cook a dish using seasonal UK ingredients this month",
  "I want to make a vibrant summer salad with strawberries and feta",
  "I want to make a 15-minute garlic and chilli prawn pasta",
  "I want to make a comforting mac & cheese with three cheeses",
  "I want to bring an amazing BBQ dish to a summer party",
  "I want to make something impressive for a dinner party",
  "I want to make a vegan lentil shepherd's pie with crispy mash",
  "I want to cook a Korean-inspired beef bulgogi rice bowl",
  "I want to make a cosy dish for a cold, rainy evening",
  "I'm craving something spicy that wakes up my taste buds",
  "I want a light and refreshing meal for a hot summer day",
  "I need a comforting dish after a stressful day",
  "I want to treat myself with something rich and indulgent",
  "I want a colourful, feel-good dinner that lifts my mood",
  "I want to slow-cook something that fills the house with delicious smells",
  "I want to cook something fun and playful with the kids",
  "A light summery meal",
  "I want to make a healthy weeknight dinner that's still exciting",
  "I want to cook something warming and hearty for winter",
  "I want to create a fresh and zesty dish with citrus flavours",
  "I want to make a one-pot wonder that's both filling and flavourful",
  "Zuma inspired miso black cod",
  "A healthy authentic butter chicken recipe",
  "A Wagamama inspired katsu curry",
  "An amazing dish to impress at a dinner party",
  "A Dishoom-style black daal with garlic naan",
  "A Gordon Ramsay beef wellington with mushroom duxelles",
  "A Nobu-inspired yellowtail sashimi with jalapeño",
  "A Hakkasan crispy duck with pancakes and hoisin",
  "A Jamie Oliver 15-minute prawn linguine",
  "A Ottolenghi-style roasted cauliflower with tahini",
  "A Rick Stein fish pie with saffron mash",
  "A Yotam Ottolenghi lamb shawarma with pickled vegetables",
  "A Marcus Wareing chocolate fondant with salted caramel",
  "A Tom Kerridge slow-cooked pork belly with apple sauce"
];

// Helper function to get random examples
const getRandomSelection = (arr: string[], count: number) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export default function ChefAssist() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const { toast } = useToast();

  // Generate 9 random examples on component mount to show 3 different sets
  const randomExamples = useMemo(() => getRandomSelection(chefExamples, 9), []);

  // Rotate examples every 8 seconds (show 3 at a time)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 3) % randomExamples.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [randomExamples.length]);

  const handleInspireMe = async () => {
    setIsProcessing(true);
    try {
      // Get AI-generated unique suggestion
      const response = await apiRequest("POST", "/api/chef-assist/inspire", {});
      const data = await response.json() as { suggestion: string };
      setPrompt(data.suggestion);
    } catch (error) {
      console.error('Inspire error:', error);
      // Fallback to random suggestion if API fails
      const randomIndex = Math.floor(Math.random() * chefExamples.length);
      setPrompt(chefExamples[randomIndex]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!prompt || !prompt.trim()) {
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
      const data = await response.json() as { recipe: any };

      // Navigate directly to recipe card with full recipe
      navigate("/recipe", {
        state: {
          recipe: data.recipe,
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

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Original quiz-style layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-8">
              {/* Question header matching original quiz style */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">What's your culinary vision?</h2>
                <p className="text-lg text-slate-400">Describe what you want to create today</p>
              </div>

              {/* Textarea matching original quiz style */}
              <div className="space-y-6">
                <Textarea
                  placeholder="Tell me about the dish you have in mind..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[150px] text-lg bg-slate-800/50 border-slate-600 text-white focus:border-orange-400 rounded-xl placeholder:text-slate-500"
                />

                {/* Inspire Me button matching original style */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleInspireMe}
                    variant="outline"
                    disabled={isProcessing}
                    className="border-orange-400 text-orange-400 hover:bg-orange-400/10"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Inspire Me
                  </Button>
                </div>

                {/* Cycling suggestion chips - small list style */}
                <div className="space-y-2">
                  <p className="text-sm text-slate-400 text-center">Example ideas to get you started:</p>
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-1 max-w-lg mx-auto">
                      {randomExamples.slice(currentExampleIndex, currentExampleIndex + 3).map((example, index) => (
                        <motion.div
                          key={`${example}-${currentExampleIndex}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <button
                            onClick={() => setPrompt(example)}
                            className="w-full text-left py-2 px-3 text-sm text-slate-300 hover:text-orange-400 hover:bg-slate-800/30 rounded-lg transition-colors border-l-2 border-orange-400/20 hover:border-orange-400/60"
                          >
                            • {example}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </div>

                {/* Continue button matching original quiz style */}
                <Button
                  onClick={handleGenerateRecipe}
                  disabled={!prompt.trim() || isProcessing}
                  className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium text-lg rounded-xl shadow-lg"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating your recipe...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageLayout>
  );
}