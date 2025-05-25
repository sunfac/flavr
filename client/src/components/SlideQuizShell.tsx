import { useState } from "react";
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
import { ArrowLeft, ArrowRight, CheckCircle, Clock, ChefHat, Utensils, Sparkles } from "lucide-react";

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

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQ = questions[currentQuestion];

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
          <div className="grid grid-cols-2 gap-4">
            {currentQ.options?.map((option) => (
              <motion.div
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`cursor-pointer transition-all duration-300 border-2 ${
                    currentAnswer === option.value 
                      ? 'border-orange-400 bg-orange-500/10 shadow-lg shadow-orange-500/25' 
                      : 'border-slate-600 bg-slate-800/50 hover:border-orange-400/50'
                  }`}
                  onClick={() => updateAnswer(currentQ.id, option.value)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl mb-3">{option.icon}</div>
                    <div className="text-white font-semibold text-lg">{option.label}</div>
                    {option.desc && (
                      <div className="text-slate-400 text-sm mt-2">{option.desc}</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        );

      case 'equipment-grid':
        return (
          <div className="grid grid-cols-2 gap-3">
            {currentQ.options?.map((option) => {
              const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);
              return (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <div className="text-white font-medium text-sm">{option.label}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        );

      case 'multi-select':
        return (
          <div className="space-y-3">
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
                    <CardContent className="p-4 flex items-center space-x-3">
                      <div className="text-xl">{option.icon}</div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{option.label}</div>
                        {option.desc && (
                          <div className="text-slate-400 text-sm mt-1">{option.desc}</div>
                        )}
                      </div>
                      {isSelected && <CheckCircle className="w-5 h-5 text-orange-400" />}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        );

      case 'slider':
        const sliderValue = currentAnswer || currentQ.min || 1;
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {renderSliderWithLabel(sliderValue)}
              </div>
            </div>
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
            <div className="flex justify-between text-sm text-slate-400 px-4">
              <span>{currentQ.min || 1}</span>
              <span>{currentQ.max || 5}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
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
      </div>

      {/* Question Content */}
      <div className="flex-1 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                {currentQ.label}
              </h2>
              {currentQ.subtitle && (
                <p className="text-slate-300 text-lg">
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

      {/* Navigation */}
      <div className="sticky bottom-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-700 p-6">
        <div className="max-w-md mx-auto flex gap-4">
          {currentQuestion > 0 && (
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="flex-1 h-14 border-slate-600 text-slate-300 hover:text-white hover:border-orange-400 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={!isCurrentAnswered()}
            className={`flex-1 h-14 font-semibold rounded-xl transition-all duration-300 ${
              isCurrentAnswered() 
                ? `bg-gradient-to-r ${themeColors[theme]} hover:scale-105 shadow-lg hover:shadow-orange-500/25 text-white`
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {currentQuestion === questions.length - 1 ? (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Create Recipe
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}