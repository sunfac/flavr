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
  XCircle
} from "lucide-react";

export interface QuestionConfig {
  id: string;
  label: string;
  subtitle?: string;
  type: 'text' | 'textarea' | 'dropdown' | 'multi-select' | 'slider' | 'tags' | 'checkbox' | 'cards' | 'equipment-grid';
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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQ = questions[currentQuestion];

  // Lock body scroll during quiz for mobile optimization
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => { 
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
    };
  }, []);

  // Scroll to input on focus for mobile
  const scrollToInput = (ref: React.RefObject<HTMLElement>) => {
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setIsCompleting(true);
      if (onLoading) onLoading(true);
      
      setTimeout(() => {
        onSubmit(answers);
      }, 500);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // Swipe gesture handler for mobile optimization
  const handleSwipeEnd = (event: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handlePrevious();
    } else if (info.offset.x < -threshold) {
      const currentAnswer = answers[currentQ?.id];
      if (currentAnswer !== undefined && currentAnswer !== '') {
        handleNext();
      }
    }
  };

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const isCurrentAnswered = () => {
    const answer = answers[currentQ.id];
    if (currentQ.required === false) return true;
    if (currentQ.type === 'multi-select' || currentQ.type === 'tags') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return answer !== undefined && answer !== '' && answer !== null;
  };

  const themeColors = {
    shopping: 'from-orange-500 to-amber-500',
    fridge: 'from-emerald-500 to-teal-500', 
    chef: 'from-amber-500 to-yellow-500'
  };

  const currentAnswer = answers[currentQ.id];

  const renderIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Home, Leaf, Crown, Target, Zap, Star, Shuffle, DollarSign, CreditCard, 
      Flame, Building, Microwave, Wind, Timer, Cooker,
      Clock, ChefHat, Utensils, Sparkles
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
              <div className="flex flex-wrap gap-2">
                {currentQ.examples.map((example, idx) => (
                  <Badge 
                    key={idx}
                    variant="outline" 
                    className="cursor-pointer hover:bg-orange-500/20 border-orange-400/30 text-slate-300"
                    onClick={() => updateAnswer(currentQ.id, example)}
                  >
                    {example}
                  </Badge>
                ))}
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
            className="min-h-24 text-lg bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400 rounded-xl"
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
        return (
          <div className="w-full max-w-sm mx-auto">
            <div className="grid grid-cols-2 gap-2.5">
              {currentQ.options?.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all duration-300 border-2 h-auto ${
                      currentAnswer === option.value 
                        ? 'border-orange-400 bg-orange-500/10 shadow-lg shadow-orange-500/25' 
                        : 'border-slate-600 bg-slate-800/50 hover:border-orange-400/50'
                    }`}
                    onClick={() => updateAnswer(currentQ.id, option.value)}
                  >
                    <CardContent className="p-2.5 text-center flex flex-col justify-center">
                      <div className="mb-1.5 flex justify-center text-orange-400">
                        {option.icon ? renderIcon(option.icon) : <div className="w-4 h-4" />}
                      </div>
                      <div className="text-white font-medium text-sm leading-tight">{option.label}</div>
                      {option.desc && (
                        <div className="text-slate-400 text-xs mt-0.5 leading-tight">{option.desc}</div>
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
          <div className="w-full max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4">
              {currentQ.options?.map((option) => {
                const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);
                return (
                  <motion.div
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-300 border-2 h-20 ${
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
                        <div className="text-lg mb-1">{option.icon}</div>
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
        return (
          <div className="w-full max-w-md mx-auto space-y-3 max-h-80 overflow-y-auto">
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
                      {isSelected && <CheckCircle className="w-4 h-4 text-orange-400" />}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
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
          <div className="space-y-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {renderSliderWithLabel(sliderValue)}
              </div>
            </div>

            {/* Show options above slider */}
            {sliderOptions.length > 0 && (
              <div className="w-full max-w-sm mx-auto space-y-2">
                {sliderOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${
                      sliderValue === option.value
                        ? 'bg-orange-500/20 border-2 border-orange-400'
                        : 'bg-slate-800/30 border-2 border-slate-600 hover:border-orange-400/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`${sliderValue === option.value ? 'text-orange-400' : 'text-slate-400'}`}>
                        {option.icon}
                      </div>
                      <span className={`font-medium text-sm ${sliderValue === option.value ? 'text-white' : 'text-slate-300'}`}>
                        {option.label}
                      </span>
                    </div>
                    <button
                      onClick={() => updateAnswer(currentQ.id, option.value)}
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                        sliderValue === option.value
                          ? 'bg-orange-400 border-orange-400'
                          : 'border-slate-400 hover:border-orange-400'
                      }`}
                    >
                      {sliderValue === option.value && (
                        <CheckCircle className="w-3 h-3 text-white mx-auto" />
                      )}
                    </button>
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
          <h2 className="text-2xl font-bold text-white mb-2">
            Whisking up something delicious...
          </h2>
          <p className="text-slate-400">
            Creating your perfect recipe match
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white flex flex-col overflow-hidden">
      {/* Progress Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            {title}
          </h1>
          <div className="text-sm text-slate-400">
            {currentQuestion + 1} of {questions.length}
          </div>
        </div>
        <Progress 
          value={progress} 
          className="h-2 bg-slate-700"
        />
      </div>

      {/* Question Content - With scrolling */}
      <div className="flex-1 p-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-lg mx-auto w-full min-h-full py-4"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
                {currentQ.label}
              </h2>
              {currentQ.subtitle && (
                <p className="text-slate-300 text-lg leading-relaxed">
                  {currentQ.subtitle}
                </p>
              )}
            </div>

            <div className="mb-8">
              {renderQuestion()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Navigation */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-700 p-4 pb-8 md:pb-4 flex-shrink-0">
        <div className="max-w-md mx-auto flex gap-3">
          {currentQuestion > 0 && (
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="h-12 px-6 border-slate-600 text-slate-300 hover:text-white hover:border-orange-400 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={!isCurrentAnswered()}
            className={`flex-1 h-12 font-semibold rounded-xl transition-all duration-300 ${
              isCurrentAnswered() 
                ? `bg-gradient-to-r ${themeColors[theme]} hover:scale-105 shadow-lg hover:shadow-orange-500/25 text-white`
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {currentQuestion === questions.length - 1 ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Recipe
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}