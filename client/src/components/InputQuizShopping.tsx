import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateShoppingPrompt1 } from "@/prompts/shoppingPrompt1";

interface QuizData {
  mood: string;
  cuisine: string;
  cookingTime: string;
  budget: string;
  diet?: string;
  equipment?: string;
  ambition?: string;
}

interface InputQuizShoppingProps {
  onComplete: (data: QuizData) => void;
  onRecipeIdeas: (ideas: any[]) => void;
  onLoading: (loading: boolean) => void;
}

export default function InputQuizShopping({ onComplete, onRecipeIdeas, onLoading }: InputQuizShoppingProps) {
  const [step, setStep] = useState(1);
  const [quizData, setQuizData] = useState<QuizData>({
    mood: "",
    cuisine: "",
    cookingTime: "",
    budget: "",
    diet: "",
    equipment: "",
    ambition: "",
  });
  const { toast } = useToast();

  const generateIdeasMutation = useMutation({
    mutationFn: (data: { mode: string; quizData: QuizData; prompt: string }) =>
      apiRequest("POST", "/api/generate-recipe-ideas", data),
    onSuccess: async (response) => {
      const result = await response.json();
      onRecipeIdeas(result.recipeIdeas.recipes || []);
      onComplete(quizData);
      onLoading(false);
    },
    onError: (error: any) => {
      onLoading(false);
      toast({
        title: "Failed to generate recipe ideas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMoodSelect = (mood: string) => {
    setQuizData(prev => ({ ...prev, mood }));
  };

  const handleCuisineSelect = (cuisine: string) => {
    setQuizData(prev => ({ ...prev, cuisine }));
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!quizData.mood) {
        toast({
          title: "Please select your mood",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!quizData.cuisine || !quizData.cookingTime || !quizData.budget) {
        toast({
          title: "Please complete all fields",
          variant: "destructive",
        });
        return;
      }
      
      // Generate recipe ideas
      onLoading(true);
      const prompt = generateShoppingPrompt1(quizData);
      generateIdeasMutation.mutate({
        mode: "shopping",
        quizData,
        prompt,
      });
    }
  };

  const progressSteps = [
    { step: 1, completed: step > 1 },
    { step: 2, completed: false },
    { step: 3, completed: false },
    { step: 4, completed: false },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-playfair font-bold text-foreground mb-2">
          What's your cooking mood?
        </h2>
        <p className="text-muted-foreground">
          Tell us what you're craving and we'll find the perfect recipe
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2">
        {progressSteps.map((item, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              step > item.step ? "bg-primary" : step === item.step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          {/* Mood Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">How are you feeling?</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "adventurous", icon: "fas fa-mountain", label: "Adventurous", color: "text-primary" },
                { value: "comfort", icon: "fas fa-heart", label: "Comfort", color: "text-primary" },
                { value: "healthy", icon: "fas fa-leaf", label: "Healthy", color: "text-secondary" },
                { value: "indulgent", icon: "fas fa-crown", label: "Indulgent", color: "text-accent" },
              ].map((mood) => (
                <Card
                  key={mood.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    quizData.mood === mood.value ? "border-primary shadow-md" : "border-border"
                  }`}
                  onClick={() => handleMoodSelect(mood.value)}
                >
                  <CardContent className="p-4 text-center">
                    <i className={`${mood.icon} text-2xl ${mood.color} mb-2`}></i>
                    <div className="text-sm font-medium">{mood.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Button onClick={handleContinue} className="w-full" disabled={!quizData.mood}>
            Continue <i className="fas fa-arrow-right ml-2"></i>
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Cuisine Preference */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Preferred cuisine?</label>
            <div className="grid grid-cols-3 gap-2">
              {["Italian", "Asian", "Mexican", "American", "Mediterranean", "Surprise Me"].map((cuisine) => (
                <Button
                  key={cuisine}
                  variant={quizData.cuisine === cuisine.toLowerCase() ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCuisineSelect(cuisine.toLowerCase())}
                >
                  {cuisine === "Mediterranean" ? "Med." : cuisine}
                </Button>
              ))}
            </div>
          </div>

          {/* Time & Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Cooking time</label>
              <Select value={quizData.cookingTime} onValueChange={(value) => setQuizData(prev => ({ ...prev, cookingTime: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5+ hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Budget</label>
              <Select value={quizData.budget} onValueChange={(value) => setQuizData(prev => ({ ...prev, budget: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">$10-20</SelectItem>
                  <SelectItem value="medium">$20-40</SelectItem>
                  <SelectItem value="high">$40+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleContinue} 
              className="flex-1"
              disabled={!quizData.cuisine || !quizData.cookingTime || !quizData.budget || generateIdeasMutation.isPending}
            >
              {generateIdeasMutation.isPending ? "Generating..." : "Find Recipes"} 
              <i className="fas fa-arrow-right ml-2"></i>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
