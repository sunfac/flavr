import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  ChefHat, 
  Utensils, 
  Sparkles, 
  Home, 
  Leaf, 
  Crown, 
  Target, 
  Zap, 
  Star, 
  Shuffle, 
  DollarSign, 
  CreditCard, 
  Flame, 
  Building, 
  Microwave, 
  Wind, 
  Timer, 
  ChefHat as Cooker,
  Circle,
  CircleDot,
  Hand,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Store,
  PoundSterling,
  ShoppingBag,
  Coins,
  Banknote,
  Users,
  Heart,
  Waves,
  Beef,
  Blend,
  Soup,
  User,
  Users2,
  PartyPopper,
  Snowflake,
  Globe,
  Coffee,
  Smartphone
} from "lucide-react";

export interface QuestionConfig {
  id: string;
  label: string;
  subtitle?: string;
  type: 'text' | 'textarea' | 'dropdown' | 'multi-select' | 'slider' | 'tags' | 'checkbox' | 'cards' | 'equipment-grid' | 'ingredient-list';
  options?: Array<{ value: string; label: string; icon?: string; desc?: string }>;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  placeholder?: string;
  dynamicLabel?: (value: number) => string;
  examples?: string[];
  validation?: (value: any) => boolean | string;
}

interface SlideQuizShellProps {
  title: string;
  subtitle?: string;
  questions: QuestionConfig[];
  onSubmit: (answers: Record<string, any>) => void;
  onLoading?: (loading: boolean) => void;
  theme?: 'shopping' | 'fridge' | 'chef';
}

export default function SlideQuizShell({ 
  title, 
  subtitle, 
  questions, 
  onSubmit, 
  onLoading,
  theme = 'shopping' 
}: SlideQuizShellProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [direction, setDirection] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [tempInput, setTempInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentQ = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    // Clear temp input when changing questions
    setTempInput('');
  }, [currentQuestionIndex]);

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setDirection(1);
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setDirection(-1);
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsCompleting(true);
    onLoading?.(true);
    
    setTimeout(() => {
      onSubmit(answers);
      onLoading?.(false);
    }, 1000);
  };

  const canProceed = () => {
    const currentAnswer = answers[currentQ.id];
    if (currentQ.required) {
      if (currentQ.type === 'multi-select') {
        return Array.isArray(currentAnswer) && currentAnswer.length > 0;
      }
      return currentAnswer !== undefined && currentAnswer !== '' && currentAnswer !== null;
    }
    return true;
  };

  const currentAnswer = answers[currentQ.id];

  const renderIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Home, Leaf, Crown, Target, Zap, Star, Shuffle, DollarSign, CreditCard, 
      Flame, Building, Microwave, Wind, Timer, Cooker,
      Clock, ChefHat, Utensils, Sparkles, ShoppingCart, Store,
      PoundSterling, ShoppingBag, Coins, Banknote, Users, Heart,
      Waves, Beef, Blend, Soup, User, Users2, PartyPopper,
      Snowflake, Globe, Coffee, Smartphone
    };
    
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : <div className="w-4 h-4" />;
  };

  const renderSliderWithLabel = (value: number) => {
    if (currentQ.dynamicLabel) {
      return currentQ.dynamicLabel(value);
    }
    if (currentQ.id === 'ambition') {
      const labels = ['Just Get Fed', 'Casual Cook', 'Weekend Chef', 'Passionate Cook', 'Michelin Madness'];
      return labels[Math.max(0, Math.min(4, value - 1))];
    }
    if (currentQ.id === 'time') {
      if (value <= 15) return `${value} min`;
      if (value <= 90) return `${value} min`;
      return 'No time limit';
    }
    return `${value}`;
  };

  const renderQuestion = () => {
    switch (currentQ.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <Input
              placeholder={currentQ.placeholder}
              value={currentAnswer || ''}
              onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
              className="h-14 text-lg bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400 rounded-xl"
            />
            {currentQ.examples && (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {currentQ.examples.map((example, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-orange-500/20 border-slate-600 text-slate-300"
                      onClick={() => updateAnswer(currentQ.id, example)}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'ingredient-list':
        const ingredients = Array.isArray(currentAnswer) ? currentAnswer : [];

        const addIngredients = () => {
          if (!tempInput.trim()) return;
          
          // Split by commas and clean up
          const newIngredients = tempInput
            .split(',')
            .map(ingredient => ingredient.trim())
            .filter(ingredient => ingredient.length > 0);
          
          const updatedIngredients = [...ingredients, ...newIngredients];
          updateAnswer(currentQ.id, updatedIngredients);
          setTempInput('');
        };

        const removeIngredient = (index: number) => {
          const updatedIngredients = ingredients.filter((_, i) => i !== index);
          updateAnswer(currentQ.id, updatedIngredients);
        };

        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={currentQ.placeholder}
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addIngredients()}
                className="h-14 text-lg bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400 rounded-xl flex-1"
              />
              <Button
                onClick={addIngredients}
                disabled={!tempInput.trim()}
                className="h-14 px-6 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 rounded-xl"
              >
                Add
              </Button>
            </div>
            
            <p className="text-xs text-slate-400">
              Add multiple ingredients separated by commas (e.g., "eggs, spinach, tomatoes")
            </p>

            {ingredients.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-300">Added ingredients:</p>
                <div className="flex flex-wrap gap-2">
                  {ingredients.map((ingredient, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-orange-500/20 border border-orange-400/30 text-orange-200 hover:bg-orange-500/30 cursor-pointer"
                      onClick={() => removeIngredient(index)}
                    >
                      {ingredient} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={currentQ.placeholder}
            value={currentAnswer || ''}
            onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
            className="min-h-32 text-lg bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400 rounded-xl"
          />
        );

      case 'dropdown':
        return (
          <Select value={currentAnswer || ''} onValueChange={(value) => updateAnswer(currentQ.id, value)}>
            <SelectTrigger className="h-14 text-lg bg-slate-800/50 border-slate-600 text-white focus:border-orange-400 rounded-xl">
              <SelectValue placeholder={currentQ.placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {currentQ.options?.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="text-white hover:bg-slate-700 focus:bg-orange-500/20"
                >
                  {option.icon} {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'cards':
        const hasMany = (currentQ.options?.length || 0) > 8;
        return (
          <div className="w-full max-w-none">
            <div className={`grid grid-cols-2 gap-2 w-full ${hasMany ? 'max-h-[55vh] overflow-y-auto pr-1 scroll-smooth' : ''}`}>
              {currentQ.options?.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all duration-300 border-2 h-24 ${
                      currentAnswer === option.value 
                        ? 'border-orange-400 bg-orange-500/10 shadow-lg shadow-orange-500/25' 
                        : 'border-slate-600 bg-slate-800/50 hover:border-orange-400/50'
                    }`}
                    onClick={() => updateAnswer(currentQ.id, option.value)}
                  >
                    <CardContent className="p-3 text-center flex flex-col justify-center h-full">
                      <div className="mb-1 flex justify-center text-orange-400">
                        {option.icon ? renderIcon(option.icon) : <div className="w-4 h-4" />}
                      </div>
                      <div className="text-white font-medium text-xs leading-tight mb-1">{option.label}</div>
                      {option.desc && (
                        <div className="text-slate-400 text-xs leading-tight">{option.desc}</div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'equipment-grid':
        return (
          <div className="w-full">
            <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1 scroll-smooth">
              {currentQ.options?.map((option) => {
                const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);
                return (
                  <motion.div
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-300 border-2 h-16 ${
                        isSelected 
                          ? 'border-orange-400 bg-orange-500/10 shadow-lg shadow-orange-500/25' 
                          : 'border-slate-600 bg-slate-800/50 hover:border-orange-400/50'
                      }`}
                      onClick={() => {
                        const current = Array.isArray(currentAnswer) ? currentAnswer : [];
                        const updated = isSelected 
                          ? current.filter(v => v !== option.value)
                          : [...current, option.value];
                        updateAnswer(currentQ.id, updated);
                      }}
                    >
                      <CardContent className="p-2 text-center h-full flex flex-col justify-center">
                        <div className="mb-1 flex justify-center text-orange-400">
                          {option.icon ? renderIcon(option.icon) : <div className="w-4 h-4" />}
                        </div>
                        <div className="text-white font-medium text-xs leading-tight">{option.label}</div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );

      case 'multi-select':
        const hasScrollableOptions = (currentQ.options?.length || 0) > 6;
        return (
          <div className="w-full relative">
            {/* Scroll indicator for mobile */}
            {hasScrollableOptions && (
              <div className="text-center mb-2">
                <p className="text-xs text-orange-400 animate-pulse">Scroll to see more options ↓</p>
              </div>
            )}
            <div className={`w-full space-y-3 ${hasScrollableOptions ? 'max-h-[50vh] overflow-y-auto pr-2 scroll-smooth' : ''}`}>
              {currentQ.options?.map((option) => {
                const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);
                return (
                  <motion.div 
                    key={option.value}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-300 border-2 ${
                        isSelected 
                          ? 'border-orange-400 bg-orange-500/10 shadow-lg shadow-orange-500/25' 
                          : 'border-slate-600 bg-slate-800/50 hover:border-orange-400/50'
                      }`}
                      onClick={() => {
                        const current = Array.isArray(currentAnswer) ? currentAnswer : [];
                        const updated = isSelected 
                          ? current.filter(v => v !== option.value)
                          : [...current, option.value];
                        updateAnswer(currentQ.id, updated);
                      }}
                    >
                      <CardContent className="p-3 flex items-center space-x-3">
                        <div className="text-lg">{option.icon}</div>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{option.label}</div>
                          {option.desc && (
                            <div className="text-slate-400 text-xs mt-1">{option.desc}</div>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                          isSelected 
                            ? 'bg-orange-400 border-orange-400' 
                            : 'border-slate-400'
                        }`}>
                          {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {/* Bottom scroll indicator */}
            {hasScrollableOptions && (
              <div className="text-center mt-2">
                <div className="w-8 h-1 bg-orange-400/30 rounded-full mx-auto"></div>
              </div>
            )}
          </div>
        );

      case 'slider':
        const sliderValue = currentAnswer || currentQ.min || 1;
        const getSliderOptions = () => {
          if (currentQ.id === 'ambition') {
            return [
              { value: 1, label: 'Just Get Fed', icon: <Clock className="w-4 h-4" /> },
              { value: 2, label: 'Casual Cook', icon: <Utensils className="w-4 h-4" /> },
              { value: 3, label: 'Weekend Chef', icon: <ChefHat className="w-4 h-4" /> },
              { value: 4, label: 'Passionate Cook', icon: <Sparkles className="w-4 h-4" /> },
              { value: 5, label: 'Michelin Madness', icon: <CheckCircle className="w-4 h-4" /> }
            ];
          }
          if (currentQ.id === 'time') {
            return [
              { value: 15, label: '15 min', icon: <Clock className="w-4 h-4" /> },
              { value: 30, label: '30 min', icon: <Clock className="w-4 h-4" /> },
              { value: 60, label: '60 min', icon: <Clock className="w-4 h-4" /> },
              { value: 90, label: '90 min', icon: <Clock className="w-4 h-4" /> },
              { value: 120, label: 'No limit', icon: <Sparkles className="w-4 h-4" /> }
            ];
          }
          return [];
        };

        const sliderOptions = getSliderOptions();
        return (
          <div className="space-y-6">
            {/* Scale at the top for time slider */}
            {currentQ.id === 'time' && (
              <div className="w-full">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                  <span>10 min</span>
                  <span>30 min</span>
                  <span>60 min</span>
                  <span>90 min+</span>
                </div>
                <div className="flex justify-between text-xs text-orange-400 font-medium">
                  <span>Quick</span>
                  <span>Standard</span>
                  <span>Relaxed</span>
                  <span>No Rush</span>
                </div>
              </div>
            )}

            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {renderSliderWithLabel(sliderValue)}
              </div>
            </div>

            {/* Show options above slider for ambition only */}
            {sliderOptions.length > 0 && currentQ.id === 'ambition' && (
              <div className="w-full max-w-sm mx-auto space-y-2">
                {sliderOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 cursor-pointer ${
                      sliderValue === option.value
                        ? 'bg-orange-500/20 border-2 border-orange-400'
                        : 'bg-slate-800/30 border-2 border-slate-600 hover:border-orange-400/50'
                    }`}
                    onClick={() => updateAnswer(currentQ.id, option.value)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`${sliderValue === option.value ? 'text-orange-400' : 'text-slate-400'}`}>
                        {option.icon}
                      </div>
                      <span className={`font-medium text-sm ${sliderValue === option.value ? 'text-white' : 'text-slate-300'}`}>
                        {option.label}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                        sliderValue === option.value
                          ? 'bg-orange-400 border-orange-400'
                          : 'border-slate-400'
                      }`}
                    >
                      {sliderValue === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4">
              <Slider
                value={[sliderValue]}
                onValueChange={([value]) => updateAnswer(currentQ.id, value)}
                min={currentQ.min || 1}
                max={currentQ.max || 5}
                step={currentQ.step || 1}
                className="w-full"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isCompleting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Creating your perfect recipe...</h2>
          <p className="text-slate-400">Analyzing your preferences</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <Progress value={progress} className="h-2 bg-slate-800" />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-xs text-orange-400 font-medium">
              {Math.round(progress)}% complete
            </span>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentQuestionIndex}
              custom={direction}
              initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  {currentQ.label}
                </h2>
                {currentQ.subtitle && (
                  <p className="text-slate-400 text-sm">{currentQ.subtitle}</p>
                )}
              </div>

              {renderQuestion()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-700">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <Button
              variant="outline"
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 border-slate-600 bg-slate-800/50 text-white hover:bg-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="text-center flex-1">
              {currentQ.required && !canProceed() && (
                <p className="text-orange-400 text-xs">This question is required</p>
              )}
            </div>

            <Button
              onClick={nextQuestion}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
            >
              {currentQuestionIndex === questions.length - 1 ? 'Generate Recipe' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}