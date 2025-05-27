import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  ChefHat, 
  Users, 
  Flame, 
  Zap, 
  Microwave,
  Wind,
  Home,
  Utensils,
  Timer,
  ArrowLeft, 
  ArrowRight 
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuizData {
  intent: string;
  dietary: string[];
  time: number;
  ambition: number;
  equipment: string[];
  servings: number;
}

interface ChefAssistQuizProps {
  onComplete: (data: QuizData) => void;
  onLoading: (loading: boolean) => void;
}

export default function ChefAssistQuiz({ onComplete, onLoading }: ChefAssistQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [quizData, setQuizData] = useState<Partial<QuizData>>({
    intent: "",
    dietary: [],
    equipment: [],
    time: 60,
    ambition: 3,
    servings: 4
  });
  const { toast } = useToast();

  const totalSteps = 6;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const generateRecipeMutation = useMutation({
    mutationFn: (data: { selectedRecipe: any; mode: string; quizData: any; prompt?: string }) =>
      apiRequest("POST", "/api/generate-full-recipe", data),
    onSuccess: async (response) => {
      const result = await response.json();
      onComplete(result.recipe);
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

  const questions = [
    {
      title: "What's your culinary vision?",
      subtitle: "Describe exactly what you want to create",
      type: "intent"
    },
    {
      title: "Dietary preferences",
      subtitle: "Any restrictions or goals?",
      type: "dietary"
    },
    {
      title: "How much time?",
      subtitle: "From quick fixes to weekend projects",
      type: "time"
    },
    {
      title: "Ambition level",
      subtitle: "How adventurous are we feeling?",
      type: "ambition"
    },
    {
      title: "How many servings?",
      subtitle: "Planning for how many people?",
      type: "servings"
    },
    {
      title: "Available equipment",
      subtitle: "What can you cook with?",
      type: "equipment"
    }
  ];

  const intentExamples = [
    "A rich chocolate fudge cake for a birthday",
    "An elite BBQ dish for six guests", 
    "A romantic vegan dinner with wow factor",
    "Authentic Italian pasta from scratch",
    "Show-stopping dessert for dinner party",
    "Comfort food with a gourmet twist"
  ];

  // Match exact dietary options from other modes
  const dietaryOptions = [
    "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Low-carb", "Low-calorie",
    "Paleo", "Keto", "Halal", "Kosher", "Nut-free", "No restrictions"
  ];

  // Match exact equipment options from other modes  
  const equipmentOptions = [
    { value: "stovetop", label: "Stovetop", icon: "🔥" },
    { value: "oven", label: "Oven", icon: "🏠" },
    { value: "microwave", label: "Microwave", icon: "📻" },
    { value: "airfryer", label: "Air Fryer", icon: "💨" },
    { value: "grill", label: "Grill", icon: "🔥" },
    { value: "slowcooker", label: "Slow Cooker", icon: "⏰" },
    { value: "pressure", label: "Pressure Cooker", icon: "⚡" },
    { value: "blender", label: "Blender", icon: "🌪️" },
    { value: "rice", label: "Rice Cooker", icon: "🍚" },
    { value: "bbq", label: "BBQ", icon: "🍖" },
    { value: "any", label: "Any equipment", icon: "🔪" },
    { value: "basics", label: "Just the basics", icon: "🔪" }
  ];

  // Match exact ambition labels from other modes
  const ambitionLabels = {
    1: "Just get fed",
    2: "Simple & tasty", 
    3: "Confident cook",
    4: "Ambitious home chef",
    5: "Michelin star effort"
  };

  // Match exact time labels from other modes
  const timeLabels = (time: number) => {
    if (time <= 15) return "Quick fix";
    if (time <= 30) return "Easy weeknight";
    if (time <= 60) return "Weekend cooking";
    return "No time limit";
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    onLoading(true);
    
    // Transform data to match server expectations
    const finalData: QuizData = {
      intent: quizData.intent || "",
      dietary: quizData.dietary || [],
      time: quizData.time || 60,
      ambition: quizData.ambition || 3,
      equipment: quizData.equipment || [],
      servings: quizData.servings || 4
    };

    // Convert to server format and generate recipe directly (Chef mode bypasses Tinder cards)
    const serverQuizData = {
      intent: finalData.intent,
      dietary: finalData.dietary,
      time: finalData.time,
      ambition: finalData.ambition,
      equipment: finalData.equipment,
      servings: finalData.servings
    };

    generateRecipeMutation.mutate({
      selectedRecipe: { title: "Custom Chef Recipe", description: finalData.intent },
      mode: "chef",
      quizData: serverQuizData
    });
  };

  const updateQuizData = (key: keyof QuizData, value: any) => {
    setQuizData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'dietary' | 'equipment', value: string) => {
    const currentArray = quizData[key] || [];
    const updatedArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateQuizData(key, updatedArray);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return quizData.intent && quizData.intent.trim().length >= 10;
      default: return true;
    }
  };

  const renderQuestion = () => {
    const question = questions[currentStep];

    switch (question.type) {
      case "intent":
        return (
          <div className="space-y-6">
            <Textarea
              placeholder="Describe your culinary vision in detail..."
              value={quizData.intent || ""}
              onChange={(e) => updateQuizData("intent", e.target.value)}
              className="min-h-32 text-base resize-none"
            />
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Need inspiration? Try one of these:</p>
              <div className="grid gap-2">
                {intentExamples.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-3 text-left justify-start whitespace-normal"
                    onClick={() => updateQuizData("intent", example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case "dietary":
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {dietaryOptions.map((option) => (
                <Badge
                  key={option}
                  variant={quizData.dietary?.includes(option) ? "default" : "secondary"}
                  className={`cursor-pointer transition-all duration-300 px-4 py-2 text-sm hover:scale-105 ${
                    quizData.dietary?.includes(option)
                      ? 'gradient-primary text-white shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem('dietary', option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-slate-600 text-center">
              Tap to select multiple options (or skip if none apply)
            </p>
          </div>
        );

      case "time":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{quizData.time} min</div>
              <div className="text-lg text-slate-600">{timeLabels(quizData.time || 30)}</div>
            </div>
            <div className="px-4">
              <Slider
                value={[quizData.time || 30]}
                onValueChange={(value) => updateQuizData('time', value[0])}
                max={90}
                min={5}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>5 min</span>
                <span>90 min</span>
              </div>
            </div>
          </div>
        );

      case "ambition":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">Level {quizData.ambition}</div>
              <div className="text-lg text-slate-600">
                {ambitionLabels[quizData.ambition as keyof typeof ambitionLabels]}
              </div>
            </div>
            <div className="px-4">
              <Slider
                value={[quizData.ambition || 3]}
                onValueChange={(value) => updateQuizData('ambition', value[0])}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>Just get fed</span>
                <span>Michelin effort</span>
              </div>
            </div>
          </div>
        );

      case "servings":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{quizData.servings} servings</div>
              <div className="text-lg text-slate-600">Perfect portion size</div>
            </div>
            <div className="px-4">
              <Slider
                value={[quizData.servings || 4]}
                onValueChange={(value) => updateQuizData('servings', value[0])}
                max={12}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>1 person</span>
                <span>Large party</span>
              </div>
            </div>
          </div>
        );

      case "equipment":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {equipmentOptions.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                    quizData.equipment?.includes(option.value)
                      ? 'ring-2 ring-primary shadow-lg scale-105'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem('equipment', option.value)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="font-medium text-sm">{option.label}</div>
                    {quizData.equipment?.includes(option.value) && (
                      <div className="w-4 h-4 gradient-primary rounded-full flex items-center justify-center mx-auto mt-2">
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-emerald-50 relative">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 glass backdrop-blur-xl border-b border-white/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-slate-600">
            Step {currentStep + 1} of {totalSteps}
          </div>
          <div className="text-sm font-medium text-slate-600">
            {Math.round(progress)}%
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Content */}
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Question Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-display mb-3" style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {questions[currentStep].title}
            </h1>
            <p className="text-lg text-slate-600">
              {questions[currentStep].subtitle}
            </p>
          </div>

          {/* Question Content */}
          <div className="mb-8 animate-scale-in">
            {renderQuestion()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-6">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 h-12"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={!isStepValid() || generateRecipeMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 h-12 text-lg font-semibold"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {generateRecipeMutation.isPending ? "Creating..." : 
               currentStep === totalSteps - 1 ? "Create Recipe" : "Next"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}