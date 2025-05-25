import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateChefPrompt2 } from "@/prompts/chefPrompt2";

interface QuizData {
  intent: string;
  occasion: string;
  skill: string;
  equipment: string;
  cookingTime: string;
  servings: string;
}

interface InputQuizChefProps {
  onComplete: (data: QuizData, recipe: any) => void;
  onLoading: (loading: boolean) => void;
}

export default function InputQuizChef({ onComplete, onLoading }: InputQuizChefProps) {
  const [quizData, setQuizData] = useState<QuizData>({
    intent: "",
    occasion: "",
    skill: "",
    equipment: "",
    cookingTime: "",
    servings: "",
  });
  const { toast } = useToast();

  const generateRecipeMutation = useMutation({
    mutationFn: (data: { selectedRecipe: any; mode: string; quizData: QuizData; prompt: string }) =>
      apiRequest("POST", "/api/generate-full-recipe", data),
    onSuccess: async (response) => {
      const result = await response.json();
      onComplete(quizData, result.recipe);
      onLoading(false);
    },
    onError: (error: any) => {
      onLoading(false);
      toast({
        title: "Failed to generate recipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!quizData.intent.trim() || !quizData.occasion || !quizData.skill || !quizData.cookingTime || !quizData.servings) {
      toast({
        title: "Please complete all fields",
        variant: "destructive",
      });
      return;
    }

    // Generate recipe directly (no Prompt 1 step for chef mode)
    onLoading(true);
    const prompt = generateChefPrompt2(quizData);
    generateRecipeMutation.mutate({
      selectedRecipe: { title: "Custom Chef Recipe", description: quizData.intent },
      mode: "chef",
      quizData,
      prompt,
    });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-playfair font-bold text-foreground mb-2">
          Tell me your culinary vision
        </h2>
        <p className="text-muted-foreground">
          Describe exactly what you want to create and I'll guide you through it
        </p>
      </div>

      <div className="space-y-6">
        {/* Intent/Description */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            What do you want to cook?
          </label>
          <Textarea
            placeholder="e.g., I want to cook a romantic Italian dinner using my air fryer that will impress my date..."
            value={quizData.intent}
            onChange={(e) => setQuizData(prev => ({ ...prev, intent: e.target.value }))}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be as detailed as possible - include the mood, style, dietary preferences, special equipment, etc.
          </p>
        </div>

        {/* Occasion */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Occasion</label>
          <Select value={quizData.occasion} onValueChange={(value) => setQuizData(prev => ({ ...prev, occasion: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="What's the occasion?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyday">Everyday meal</SelectItem>
              <SelectItem value="date">Romantic date</SelectItem>
              <SelectItem value="family">Family dinner</SelectItem>
              <SelectItem value="party">Party/Entertaining</SelectItem>
              <SelectItem value="special">Special celebration</SelectItem>
              <SelectItem value="comfort">Comfort food craving</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Skill Level & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Skill level</label>
            <Select value={quizData.skill} onValueChange={(value) => setQuizData(prev => ({ ...prev, skill: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Your skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Time available</label>
            <Select value={quizData.cookingTime} onValueChange={(value) => setQuizData(prev => ({ ...prev, cookingTime: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Total time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2+ hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Equipment & Servings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Main equipment</label>
            <Select value={quizData.equipment} onValueChange={(value) => setQuizData(prev => ({ ...prev, equipment: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Primary tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stovetop">Stovetop</SelectItem>
                <SelectItem value="oven">Oven</SelectItem>
                <SelectItem value="airfryer">Air Fryer</SelectItem>
                <SelectItem value="grill">Grill</SelectItem>
                <SelectItem value="slowcooker">Slow Cooker</SelectItem>
                <SelectItem value="all">Full kitchen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Servings</label>
            <Select value={quizData.servings} onValueChange={(value) => setQuizData(prev => ({ ...prev, servings: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="How many?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 person</SelectItem>
                <SelectItem value="2">2 people</SelectItem>
                <SelectItem value="4">4 people</SelectItem>
                <SelectItem value="6">6+ people</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          disabled={!quizData.intent.trim() || !quizData.occasion || !quizData.skill || !quizData.cookingTime || !quizData.servings || generateRecipeMutation.isPending}
        >
          {generateRecipeMutation.isPending ? "Creating Your Recipe..." : "Create My Recipe"} 
          <i className="fas fa-chef-hat ml-2"></i>
        </Button>
      </div>
    </div>
  );
}
