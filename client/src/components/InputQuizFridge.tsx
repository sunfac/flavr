import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";


interface QuizData {
  ingredients: string;
  mood: string;
  equipment: string;
  cookingTime: string;
  ambition: string;
  dietary?: string[];
}

interface InputQuizFridgeProps {
  onComplete: (data: QuizData) => void;
  onRecipeIdeas: (ideas: any[]) => void;
  onLoading: (loading: boolean) => void;
}

export default function InputQuizFridge({ onComplete, onRecipeIdeas, onLoading }: InputQuizFridgeProps) {
  const [step, setStep] = useState(1);
  const [quizData, setQuizData] = useState<QuizData>({
    ingredients: "",
    mood: "",
    equipment: "",
    cookingTime: "",
    ambition: "",
    dietary: [],
  });
  const { toast } = useToast();

  const generateIdeasMutation = useMutation({
    mutationFn: async (data: { mode: string; quizData: QuizData; prompt?: string }) => {
      const fetchResponse = await fetch("/api/generate-recipe-ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });
      return fetchResponse.json();
    },
    onSuccess: async (result) => {
      onRecipeIdeas(result.recipes || []);
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

  const handleContinue = () => {
    if (step === 1) {
      if (!quizData.ingredients.trim()) {
        toast({
          title: "Please enter your available ingredients",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!quizData.mood || !quizData.cookingTime || !quizData.equipment) {
        toast({
          title: "Please complete all fields",
          variant: "destructive",
        });
        return;
      }
      
      // Generate recipe ideas using server-side mapped prompts
      onLoading(true);
      generateIdeasMutation.mutate({
        mode: "fridge",
        quizData,
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
          What's in your fridge?
        </h2>
        <p className="text-muted-foreground">
          Tell us what ingredients you have and we'll create something amazing
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2">
        {progressSteps.map((item, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full ${
              step > item.step ? "bg-secondary" : step === item.step ? "bg-secondary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          {/* Ingredients Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              List your available ingredients
            </label>
            <Textarea
              placeholder="e.g., chicken breast, broccoli, rice, garlic, olive oil..."
              value={quizData.ingredients}
              onChange={(e) => setQuizData(prev => ({ ...prev, ingredients: e.target.value }))}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Include proteins, vegetables, pantry items, spices - anything you have available
            </p>
          </div>

          <Button onClick={handleContinue} className="w-full" disabled={!quizData.ingredients.trim()}>
            Continue <i className="fas fa-arrow-right ml-2"></i>
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Mood Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">What style of dish?</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "quick", icon: "fas fa-clock", label: "Quick & Easy", color: "text-primary" },
                { value: "comfort", icon: "fas fa-heart", label: "Comfort Food", color: "text-primary" },
                { value: "healthy", icon: "fas fa-leaf", label: "Healthy", color: "text-secondary" },
                { value: "creative", icon: "fas fa-lightbulb", label: "Creative", color: "text-accent" },
              ].map((mood) => (
                <Card
                  key={mood.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    quizData.mood === mood.value ? "border-secondary shadow-md" : "border-border"
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

          {/* Time & Equipment */}
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Equipment</label>
              <Select value={quizData.equipment} onValueChange={(value) => setQuizData(prev => ({ ...prev, equipment: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Main cooking method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stovetop">Stovetop</SelectItem>
                  <SelectItem value="oven">Oven</SelectItem>
                  <SelectItem value="airfryer">Air Fryer</SelectItem>
                  <SelectItem value="microwave">Microwave</SelectItem>
                  <SelectItem value="any">Any</SelectItem>
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
              className="flex-1 bg-secondary hover:bg-secondary/90"
              disabled={!quizData.mood || !quizData.cookingTime || !quizData.equipment || generateIdeasMutation.isPending}
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
