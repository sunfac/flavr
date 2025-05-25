import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface QuizData {
  ingredients: string[];
  vibe: string;
  cuisines: string[];
  time: number;
  dietary: string[];
  equipment: string[];
  ambition: number;
}

interface FridgeQuizProps {
  onComplete: (data: QuizData) => void;
  onLoading: (loading: boolean) => void;
}

export default function FridgeQuiz({ onComplete, onLoading }: FridgeQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [ingredientInput, setIngredientInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [quizData, setQuizData] = useState<Partial<QuizData>>({
    ingredients: [],
    cuisines: [],
    dietary: [],
    equipment: [],
    time: 30,
    ambition: 3
  });

  const totalSteps = 7;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const questions = [
    {
      title: "What's in your fridge?",
      subtitle: "Add ingredients you want to use",
      type: "ingredients"
    },
    {
      title: "What's your vibe?",
      subtitle: "How are you feeling about cooking?",
      type: "vibe"
    },
    {
      title: "Cuisine preferences",
      subtitle: "Any particular flavors? (optional)",
      type: "cuisines"
    },
    {
      title: "How much time?",
      subtitle: "From quick fixes to weekend projects",
      type: "time"
    },
    {
      title: "Dietary preferences",
      subtitle: "Any restrictions or goals?",
      type: "dietary"
    },
    {
      title: "Available equipment",
      subtitle: "What can you cook with?",
      type: "equipment"
    },
    {
      title: "Ambition level",
      subtitle: "How adventurous are we feeling?",
      type: "ambition"
    }
  ];

  const vibeOptions = [
    { value: "comfort", label: "Comfort food", icon: "🍲", desc: "Warm and cozy" },
    { value: "fresh", label: "Fresh & healthy", icon: "🥗", desc: "Light and nutritious" },
    { value: "decadent", label: "Decadent treat", icon: "🍰", desc: "Indulgent pleasure" },
    { value: "exciting", label: "Something exciting", icon: "🌶️", desc: "Bold and adventurous" },
    { value: "minimal", label: "Minimal effort", icon: "⚡", desc: "Quick and easy" },
    { value: "foodie", label: "Foodie moment", icon: "👨‍🍳", desc: "Restaurant quality" },
    { value: "surprise", label: "Surprise me", icon: "🎲", desc: "Let's discover together" }
  ];

  const cuisineOptions = [
    "Italian", "Indian", "Thai", "Greek", "French", "Korean", "Mexican", "Chinese",
    "Japanese", "Spanish", "Lebanese", "Vietnamese", "Moroccan", "Fusion", "Other"
  ];

  const dietaryOptions = [
    "Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Low-carb", "Low-calorie",
    "Paleo", "Keto", "Halal", "Kosher", "No restrictions"
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
    { value: "bbq", label: "BBQ", icon: "🔥" },
    { value: "basics", label: "Just the basics", icon: "🔪" }
  ];

  const ambitionLabels = {
    1: "Just get fed",
    2: "Simple & tasty",
    3: "Confident cook",
    4: "Ambitious home chef",
    5: "Michelin star effort"
  };

  const timeLabels = (time: number) => {
    if (time <= 15) return "Fast fix";
    if (time <= 45) return "Dinner mode";
    if (time >= 90) return "No time limit";
    return "I'll use it all";
  };

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !quizData.ingredients?.includes(trimmed)) {
      const updatedIngredients = [...(quizData.ingredients || []), trimmed];
      updateQuizData('ingredients', updatedIngredients);
      setIngredientInput("");
      inputRef.current?.focus();
    }
  };

  const removeIngredient = (ingredient: string) => {
    const updated = quizData.ingredients?.filter(item => item !== ingredient) || [];
    updateQuizData('ingredients', updated);
  };

  const handleIngredientKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
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
      ingredients: quizData.ingredients || [],
      vibe: quizData.vibe || "surprise",
      cuisines: quizData.cuisines || [],
      time: quizData.time || 30,
      dietary: quizData.dietary || [],
      equipment: quizData.equipment || [],
      ambition: quizData.ambition || 3
    };
    onComplete(finalData);
  };

  const updateQuizData = (key: keyof QuizData, value: any) => {
    setQuizData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: 'cuisines' | 'dietary' | 'equipment', value: string) => {
    const currentArray = quizData[key] || [];
    const updatedArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateQuizData(key, updatedArray);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return (quizData.ingredients?.length || 0) >= 3;
      case 1: return !!quizData.vibe;
      default: return true;
    }
  };

  const renderQuestion = () => {
    const question = questions[currentStep];

    switch (question.type) {
      case "ingredients":
        return (
          <div className="space-y-6">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyPress={handleIngredientKeyPress}
                placeholder="e.g., eggs, spinach, tomatoes..."
                className="flex-1 h-14 text-lg input-modern"
              />
              <Button
                onClick={addIngredient}
                disabled={!ingredientInput.trim()}
                className="h-14 px-6 gradient-secondary text-white font-semibold"
              >
                <i className="fas fa-plus"></i>
              </Button>
            </div>
            
            {quizData.ingredients && quizData.ingredients.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-600">
                  Ingredients added ({quizData.ingredients.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {quizData.ingredients.map((ingredient, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="glass px-3 py-2 text-sm cursor-pointer hover:scale-105 transition-all duration-300"
                      onClick={() => removeIngredient(ingredient)}
                    >
                      {ingredient}
                      <i className="fas fa-times ml-2 text-xs"></i>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-sm text-slate-600">
                {(quizData.ingredients?.length || 0) < 3 
                  ? `Add ${3 - (quizData.ingredients?.length || 0)} more ingredients to continue`
                  : "Great! You can add more or continue to the next step"
                }
              </p>
            </div>
          </div>
        );

      case "vibe":
        return (
          <div className="space-y-4">
            {vibeOptions.map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                  quizData.vibe === option.value
                    ? 'ring-2 ring-secondary shadow-lg scale-105'
                    : 'hover:shadow-md'
                }`}
                onClick={() => updateQuizData('vibe', option.value)}
              >
                <CardContent className="p-4 flex items-center space-x-4">
                  <div className="text-3xl">{option.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{option.label}</h3>
                    <p className="text-sm text-slate-600">{option.desc}</p>
                  </div>
                  {quizData.vibe === option.value && (
                    <div className="w-6 h-6 gradient-secondary rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-white text-sm"></i>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "cuisines":
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {cuisineOptions.map((cuisine) => (
                <Badge
                  key={cuisine}
                  variant={quizData.cuisines?.includes(cuisine) ? "default" : "secondary"}
                  className={`cursor-pointer transition-all duration-300 px-4 py-2 text-sm hover:scale-105 ${
                    quizData.cuisines?.includes(cuisine)
                      ? 'gradient-secondary text-white shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem('cuisines', cuisine)}
                >
                  {cuisine}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-slate-600 text-center">
              Tap to select multiple cuisines (or skip if you're flexible)
            </p>
          </div>
        );

      case "time":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-secondary mb-2">{quizData.time} min</div>
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
                      ? 'gradient-secondary text-white shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem('dietary', option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-slate-600 text-center">
              Select any dietary preferences or restrictions
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
                      ? 'ring-2 ring-secondary shadow-lg scale-105'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem('equipment', option.value)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="font-medium text-sm">{option.label}</div>
                    {quizData.equipment?.includes(option.value) && (
                      <div className="w-4 h-4 gradient-secondary rounded-full flex items-center justify-center mx-auto mt-2">
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
              <div className="text-3xl font-bold text-secondary mb-2">Level {quizData.ambition}</div>
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

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 relative">
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
              background: 'var(--gradient-secondary)',
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
              style={{ background: 'var(--gradient-secondary)' }}
            >
              {currentStep === totalSteps - 1 ? (
                <>
                  <i className="fas fa-magic mr-2"></i>
                  Generate Ideas
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