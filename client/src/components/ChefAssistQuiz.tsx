import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface QuizData {
  intent: string;
  dietary: string[];
  time: number;
  ambition: number;
  equipment: string[];
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
    ambition: 3
  });

  const totalSteps = 5;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const questions = [
    {
      title: "What's your culinary vision?",
      subtitle: "Describe what you want to create",
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
    "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Low-carb", "Low-calorie",
    "Paleo", "Keto", "Halal", "Kosher", "No restrictions"
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

  const extrasOptions = [
    { value: "wine", label: "Wine pairing", icon: "🍷" },
    { value: "sides", label: "Side dish suggestion", icon: "🥗" },
    { value: "dessert", label: "Dessert to match", icon: "🍰" },
    { value: "presentation", label: "Presentation tips", icon: "✨" },
    { value: "prep", label: "Batch/prep suggestions", icon: "📋" },
    { value: "restaurant", label: "Make it restaurant-worthy", icon: "⭐" }
  ];

  const ambitionLabels = {
    1: "Just need something edible",
    2: "Simple but delicious",
    3: "Confident cook",
    4: "Ambitious home chef",
    5: "Michelin star effort"
  };

  const timeLabels = (time: number) => {
    if (time <= 15) return "Quick win";
    if (time <= 45) return "Weeknight dinner";
    if (time <= 90) return "Take your time";
    return "No time limit — chef's adventure";
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
    const finalData: QuizData = {
      intent: quizData.intent || "",
      dietary: quizData.dietary || [],
      time: quizData.time || 60,
      ambition: quizData.ambition || 3,
      equipment: quizData.equipment || [],
      extras: quizData.extras || []
    };
    onComplete(finalData);
  };

  const updateQuizData = (key: keyof QuizData, value: any) => {
    setQuizData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'dietary' | 'equipment' | 'extras', value: string) => {
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
              value={quizData.intent}
              onChange={(e) => updateQuizData('intent', e.target.value)}
              placeholder="Describe your culinary vision in detail..."
              className="min-h-32 text-lg input-modern resize-none"
              rows={4}
            />
            
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600">Need inspiration? Try these:</p>
              <div className="space-y-2">
                {intentExamples.map((example, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md"
                    onClick={() => updateQuizData('intent', example)}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm text-slate-700 italic">"{example}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-slate-600">
                {quizData.intent && quizData.intent.length < 10 
                  ? `Add ${10 - quizData.intent.length} more characters to continue`
                  : quizData.intent 
                    ? "Perfect! Your vision is clear"
                    : "Tell us what you want to create"
                }
              </p>
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
                      ? 'gradient-accent text-white shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem('dietary', option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-slate-600 text-center">
              Select any dietary requirements or restrictions
            </p>
          </div>
        );

      case "time":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-accent mb-2">{quizData.time} min</div>
              <div className="text-lg text-slate-600">{timeLabels(quizData.time || 60)}</div>
            </div>
            <div className="px-4">
              <Slider
                value={[quizData.time || 60]}
                onValueChange={(value) => updateQuizData('time', value[0])}
                max={120}
                min={5}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>5 min</span>
                <span>120 min</span>
              </div>
            </div>
          </div>
        );

      case "ambition":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">Level {quizData.ambition}</div>
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
                <span>Just edible</span>
                <span>Michelin effort</span>
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
                      ? 'ring-2 ring-accent shadow-lg scale-105'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem('equipment', option.value)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="font-medium text-sm">{option.label}</div>
                    {quizData.equipment?.includes(option.value) && (
                      <div className="w-4 h-4 gradient-accent rounded-full flex items-center justify-center mx-auto mt-2">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-orange-50 relative">
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
              background: 'var(--gradient-accent)',
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
                className="flex-1 h-14 text-lg glass border-white/20"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="flex-1 h-14 text-lg font-bold text-white shadow-xl transition-all duration-300 hover:scale-105"
              style={{ background: 'var(--gradient-accent)' }}
            >
              {currentStep === totalSteps - 1 ? (
                <>
                  <i className="fas fa-chef-hat mr-2"></i>
                  Create Recipe
                </>
              ) : (
                <>
                  Next
                  <i className="fas fa-arrow-right ml-2"></i>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}