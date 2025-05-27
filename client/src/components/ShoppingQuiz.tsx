import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface QuizData {
  mood: string;
  cuisine: string;
  time: number;
  budget: string;
  dietary: string[];
  equipment: string[];
  ambition: number;
  supermarket: string;
}

interface ShoppingQuizProps {
  onComplete: (data: QuizData) => void;
  onLoading: (loading: boolean) => void;
}

export default function ShoppingQuiz({ onComplete, onLoading }: ShoppingQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [quizData, setQuizData] = useState<Partial<QuizData>>({
    dietary: [],
    equipment: [],
    time: 30,
    ambition: 3
  });

  const totalSteps = 8;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const questions = [
    // Step 1 - Mood
    {
      title: "What's your mood?",
      subtitle: "Let's start with how you're feeling",
      type: "mood"
    },
    // Step 2 - Cuisine
    {
      title: "Pick your cuisine",
      subtitle: "What flavors are calling to you?",
      type: "cuisine"
    },
    // Step 3 - Time
    {
      title: "How much time?",
      subtitle: "From quick bites to weekend projects",
      type: "time"
    },
    // Step 4 - Budget
    {
      title: "What's your budget?",
      subtitle: "We'll find something perfect in your range",
      type: "budget"
    },
    // Step 5 - Dietary
    {
      title: "Dietary preferences",
      subtitle: "Any special requirements?",
      type: "dietary"
    },
    // Step 6 - Equipment
    {
      title: "What can you cook with?",
      subtitle: "Let's see what tools you have",
      type: "equipment"
    },
    // Step 7 - Ambition
    {
      title: "Cooking ambition level",
      subtitle: "How adventurous are we feeling?",
      type: "ambition"
    },
    // Step 8 - Supermarket
    {
      title: "Where do you shop?",
      subtitle: "We'll tailor ingredients to your store",
      type: "supermarket"
    }
  ];

  const moodOptions = [
    { value: "comfort", label: "Comfort food", icon: "🍲", desc: "Warm and cozy" },
    { value: "fresh", label: "Fresh & healthy", icon: "🥗", desc: "Light and nutritious" },
    { value: "decadent", label: "Decadent treat", icon: "🍰", desc: "Indulgent pleasure" },
    { value: "exciting", label: "Something exciting", icon: "🌶️", desc: "Bold and adventurous" },
    { value: "minimal", label: "Minimal effort", icon: "⚡", desc: "Quick and easy" },
    { value: "foodie", label: "Foodie moment", icon: "👨‍🍳", desc: "Restaurant quality" },
    { value: "surprise", label: "Surprise me", icon: "🎲", desc: "Let's discover together" }
  ];

  const cuisineOptions = [
    "Any", "Italian", "Japanese", "Mexican", "Thai", "Greek", "Korean", "Turkish", "Indian",
    "Chinese", "French", "Spanish", "Lebanese", "Vietnamese", "Moroccan", "Fusion", "British"
  ];

  const budgetOptions = [
    { value: "£", label: "Budget-friendly", icon: "💰", desc: "£5-15 per serving" },
    { value: "££", label: "Mid-range", icon: "💳", desc: "£15-30 per serving" },
    { value: "£££", label: "Premium", icon: "💎", desc: "£30+ per serving" }
  ];

  const dietaryOptions = [
    "None", "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Low-carb", "Low-calorie",
    "Paleo", "Keto", "Halal", "Kosher", "Nut-free"
  ];

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
    { value: "bbq", label: "BBQ", icon: "🍖" }
  ];

  const supermarketOptions = [
    "Tesco", "Sainsbury's", "Waitrose", "Morrisons", "ASDA", "Aldi", "Lidl", 
    "Iceland", "Ocado", "Local/Other", "No preference"
  ];

  const ambitionLabels = {
    1: "Just get fed",
    2: "Simple & tasty",
    3: "Confident cook",
    4: "Ambitious home chef",
    5: "Michelin star effort"
  };

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
    const finalData: QuizData = {
      mood: quizData.mood || "surprise",
      cuisine: quizData.cuisine || "Fusion",
      time: quizData.time || 30,
      budget: quizData.budget || "££",
      dietary: quizData.dietary || [],
      equipment: quizData.equipment || [],
      ambition: quizData.ambition || 3,
      supermarket: quizData.supermarket || "No preference"
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
      case 0: return !!quizData.mood;
      case 1: return !!quizData.cuisine;
      case 2: return !!quizData.time;
      case 3: return !!quizData.budget;
      case 7: return !!quizData.supermarket;
      default: return true;
    }
  };

  const renderQuestion = () => {
    const question = questions[currentStep];

    switch (question.type) {
      case "mood":
        return (
          <div className="space-y-4">
            {moodOptions.map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                  quizData.mood === option.value
                    ? 'ring-2 ring-primary shadow-lg scale-105'
                    : 'hover:shadow-md'
                }`}
                onClick={() => updateQuizData('mood', option.value)}
              >
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="text-3xl">{option.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{option.label}</h3>
                    <p className="text-sm text-slate-600">{option.desc}</p>
                  </div>
                  {quizData.mood === option.value && (
                    <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-white text-sm"></i>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "cuisine":
        return (
          <div className="space-y-4">
            <Select value={quizData.cuisine} onValueChange={(value) => updateQuizData('cuisine', value)}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Choose your cuisine..." />
              </SelectTrigger>
              <SelectContent>
                {cuisineOptions.map((cuisine) => (
                  <SelectItem key={cuisine} value={cuisine} className="text-lg py-3">
                    {cuisine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      case "budget":
        return (
          <div className="space-y-4">
            {budgetOptions.map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                  quizData.budget === option.value
                    ? 'ring-2 ring-primary shadow-lg scale-105'
                    : 'hover:shadow-md'
                }`}
                onClick={() => updateQuizData('budget', option.value)}
              >
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="text-3xl">{option.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{option.label}</h3>
                    <p className="text-sm text-slate-600">{option.desc}</p>
                  </div>
                  {quizData.budget === option.value && (
                    <div className="w-6 h-6 gradient-primary rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-white text-sm"></i>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
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

      case "supermarket":
        return (
          <div className="space-y-4">
            <Select value={quizData.supermarket} onValueChange={(value) => updateQuizData('supermarket', value)}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue placeholder="Choose your supermarket..." />
              </SelectTrigger>
              <SelectContent>
                {supermarketOptions.map((market) => (
                  <SelectItem key={market} value={market} className="text-lg py-3">
                    {market}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              style={{ background: 'var(--gradient-primary)' }}
            >
              {currentStep === totalSteps - 1 ? (
                <>
                  <i className="fas fa-magic mr-2"></i>
                  Generate Recipes
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