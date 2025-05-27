import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface QuizData {
  intent: string;
  dietary: string[];
  time: number;
  ambition: string;
  equipment: string[];
  servings: string;
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
    ambition: "confidentCook",
    servings: "4"
  });

  const totalSteps = 6;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const questions = [
    {
      title: "What's your culinary vision?",
      subtitle: "Describe exactly what you want to create",
      type: "intent"
    },
    {
      title: "Dietary considerations",
      subtitle: "Any restrictions or preferences?",
      type: "dietary"
    },
    {
      title: "Time to create",
      subtitle: "How long can you dedicate to this?",
      type: "time"
    },
    {
      title: "Your ambition level",
      subtitle: "How challenging should this be?",
      type: "ambition"
    },
    {
      title: "How many servings?",
      subtitle: "Planning for how many people?",
      type: "servings"
    },
    {
      title: "Available equipment",
      subtitle: "What tools do you have access to?",
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

  const dietaryOptions = [
    { value: "vegan", label: "Vegan", icon: "🌱" },
    { value: "vegetarian", label: "Vegetarian", icon: "🥕" },
    { value: "glutenFree", label: "Gluten-free", icon: "🌾" },
    { value: "dairyFree", label: "Dairy-free", icon: "🥛" },
    { value: "nutFree", label: "Nut-free", icon: "🥜" },
    { value: "pescatarian", label: "Pescatarian", icon: "🐟" },
    { value: "keto", label: "Keto", icon: "🥑" },
    { value: "paleo", label: "Paleo", icon: "🥩" },
    { value: "lowCarb", label: "Low-carb", icon: "🥬" },
    { value: "highProtein", label: "High-protein", icon: "💪" },
    { value: "lowCalorie", label: "Low-calorie", icon: "⚖️" },
    { value: "noRestrictions", label: "No restrictions", icon: "🍽️" }
  ];

  const equipmentOptions = [
    { value: "stovetop", label: "Stovetop only", icon: "🔥" },
    { value: "oven", label: "Oven only", icon: "🏠" },
    { value: "airfryer", label: "Air fryer", icon: "💨" },
    { value: "microwave", label: "Microwave", icon: "📻" },
    { value: "grill", label: "BBQ/Grill", icon: "🔥" },
    { value: "slowcooker", label: "Slow cooker", icon: "⏰" },
    { value: "blender", label: "Blender", icon: "🌪️" },
    { value: "any", label: "Any equipment", icon: "🔪" }
  ];

  const ambitionOptions = [
    { value: "justFed", label: "Just get fed", icon: "☕", desc: "Minimal effort" },
    { value: "simpleTasty", label: "Simple & tasty", icon: "❤️", desc: "Easy but delicious" },
    { value: "confidentCook", label: "Confident cook", icon: "✨", desc: "Touch of flair" },
    { value: "ambitiousChef", label: "Ambitious chef", icon: "🎯", desc: "Multi-step prep" },
    { value: "michelinEffort", label: "Michelin effort", icon: "👑", desc: "Restaurant quality" }
  ];

  const servingsOptions = [
    { value: "1", label: "Just me", icon: "👤", desc: "1 serving" },
    { value: "2", label: "For two", icon: "👥", desc: "2 servings" },
    { value: "4", label: "Small family", icon: "🏠", desc: "4 servings" },
    { value: "6", label: "Large family", icon: "👨‍👩‍👧‍👦", desc: "6 servings" },
    { value: "8", label: "Party time", icon: "🎉", desc: "8+ servings" }
  ];

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
    const finalData: QuizData = {
      intent: quizData.intent || "",
      dietary: quizData.dietary || [],
      time: quizData.time || 60,
      ambition: quizData.ambition || "confidentCook",
      equipment: quizData.equipment || [],
      servings: quizData.servings || "4"
    };
    onComplete(finalData);
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
          <div className="grid grid-cols-2 gap-3">
            {dietaryOptions.map((option) => (
              <Button
                key={option.value}
                variant={quizData.dietary?.includes(option.value) ? "default" : "outline"}
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => toggleArrayItem("dietary", option.value)}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </Button>
            ))}
          </div>
        );

      case "time":
        return (
          <div className="space-y-6">
            <div className="px-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">10 min</span>
                <span className="text-lg font-semibold">
                  {quizData.time === 120 ? "No time limit" : `${quizData.time} minutes`}
                </span>
                <span className="text-sm text-muted-foreground">2+ hours</span>
              </div>
              
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={quizData.time || 60}
                onChange={(e) => updateQuizData("time", parseInt(e.target.value))}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Quick</span>
                <span>Standard</span>
                <span>No rush</span>
              </div>
            </div>
          </div>
        );

      case "ambition":
        return (
          <div className="grid gap-3">
            {ambitionOptions.map((option) => (
              <Button
                key={option.value}
                variant={quizData.ambition === option.value ? "default" : "outline"}
                className="h-auto p-4 flex items-center gap-4 justify-start"
                onClick={() => updateQuizData("ambition", option.value)}
              >
                <span className="text-2xl">{option.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.desc}</div>
                </div>
              </Button>
            ))}
          </div>
        );

      case "servings":
        return (
          <div className="grid gap-3">
            {servingsOptions.map((option) => (
              <Button
                key={option.value}
                variant={quizData.servings === option.value ? "default" : "outline"}
                className="h-auto p-4 flex items-center gap-4 justify-start"
                onClick={() => updateQuizData("servings", option.value)}
              >
                <span className="text-2xl">{option.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.desc}</div>
                </div>
              </Button>
            ))}
          </div>
        );

      case "equipment":
        return (
          <div className="grid grid-cols-2 gap-3">
            {equipmentOptions.map((option) => (
              <Button
                key={option.value}
                variant={quizData.equipment?.includes(option.value) ? "default" : "outline"}
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => toggleArrayItem("equipment", option.value)}
              >
                <span className="text-2xl">{option.icon}</span>
                <span className="text-sm font-medium text-center">{option.label}</span>
              </Button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Step {currentStep + 1} of {totalSteps}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          {questions[currentStep].title}
        </h2>
        <p className="text-muted-foreground">
          {questions[currentStep].subtitle}
        </p>
      </div>

      {/* Answer Options */}
      <Card>
        <CardContent className="p-6">
          {renderQuestion()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={handleNext}
          disabled={!isStepValid()}
          className="flex items-center gap-2"
        >
          {currentStep === totalSteps - 1 ? "Create Recipe" : "Next"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}