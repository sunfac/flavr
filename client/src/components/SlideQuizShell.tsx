import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const totalSteps = questions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentQuestion = questions[currentStep];

  // Theme configurations
  const themeConfig = {
    shopping: {
      gradient: 'from-slate-50 via-rose-50 to-pink-50',
      textGradient: 'var(--gradient-primary)',
      buttonGradient: 'var(--gradient-primary)',
      accentColor: 'primary'
    },
    fridge: {
      gradient: 'from-slate-50 via-emerald-50 to-teal-50',
      textGradient: 'var(--gradient-secondary)',
      buttonGradient: 'var(--gradient-secondary)',
      accentColor: 'secondary'
    },
    chef: {
      gradient: 'from-slate-50 via-amber-50 to-orange-50',
      textGradient: 'var(--gradient-accent)',
      buttonGradient: 'var(--gradient-accent)',
      accentColor: 'accent'
    }
  };

  const config = themeConfig[theme];

  const validateQuestionSet = (questions: QuestionConfig[]) => {
    return questions.every(q => q.id && q.label && q.type);
  };

  if (!validateQuestionSet(questions)) {
    console.error('Invalid question configuration detected');
    return <div>Quiz configuration error</div>;
  }

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleArrayItem = (questionId: string, value: string) => {
    const currentArray = answers[questionId] || [];
    const updatedArray = currentArray.includes(value)
      ? currentArray.filter((item: string) => item !== value)
      : [...currentArray, value];
    updateAnswer(questionId, updatedArray);
  };

  const isStepValid = () => {
    const question = currentQuestion;
    const answer = answers[question.id];

    if (!question.required) return true;

    if (question.validation) {
      const result = question.validation(answer);
      return result === true;
    }

    switch (question.type) {
      case 'text':
      case 'textarea':
        return answer && answer.toString().trim().length >= (question.min || 1);
      case 'multi-select':
      case 'tags':
        return answer && Array.isArray(answer) && answer.length >= (question.min || 1);
      case 'dropdown':
        return !!answer;
      default:
        return true;
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
    onSubmit(answers);
  };

  const renderInput = () => {
    const question = currentQuestion;
    const answer = answers[question.id];

    switch (question.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <Input
              value={answer || ''}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              placeholder={question.placeholder}
              className="h-14 text-lg input-modern"
            />
            {question.examples && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">Examples:</p>
                {question.examples.map((example, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md"
                    onClick={() => updateAnswer(question.id, example)}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm text-slate-700">"{example}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-4">
            <Textarea
              value={answer || ''}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              placeholder={question.placeholder}
              className="min-h-32 text-lg input-modern resize-none"
              rows={4}
            />
            {question.examples && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">Need inspiration? Try these:</p>
                {question.examples.map((example, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md"
                    onClick={() => updateAnswer(question.id, example)}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm text-slate-700 italic">"{example}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <Select value={answer} onValueChange={(value) => updateAnswer(question.id, value)}>
            <SelectTrigger className="h-14 text-lg">
              <SelectValue placeholder={question.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'cards':
        return (
          <div className="space-y-4">
            {question.options?.map((option) => (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                  answer === option.value
                    ? `ring-2 ring-${config.accentColor} shadow-lg scale-105`
                    : 'hover:shadow-md'
                }`}
                onClick={() => updateAnswer(question.id, option.value)}
              >
                <CardContent className="p-4 flex items-center space-x-4">
                  {option.icon && <div className="text-3xl">{option.icon}</div>}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{option.label}</h3>
                    {option.desc && <p className="text-sm text-slate-600">{option.desc}</p>}
                  </div>
                  {answer === option.value && (
                    <div className={`w-6 h-6 gradient-${theme} rounded-full flex items-center justify-center`}>
                      <i className="fas fa-check text-white text-sm"></i>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'multi-select':
      case 'tags':
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {question.options?.map((option) => (
                <Badge
                  key={option.value}
                  variant={answer?.includes(option.value) ? "default" : "secondary"}
                  className={`cursor-pointer transition-all duration-300 px-4 py-2 text-sm hover:scale-105 ${
                    answer?.includes(option.value)
                      ? `gradient-${theme} text-white shadow-lg`
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem(question.id, option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
            {question.subtitle && (
              <p className="text-sm text-slate-600 text-center">{question.subtitle}</p>
            )}
          </div>
        );

      case 'equipment-grid':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {question.options?.map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                    answer?.includes(option.value)
                      ? `ring-2 ring-${config.accentColor} shadow-lg scale-105`
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleArrayItem(question.id, option.value)}
                >
                  <CardContent className="p-4 text-center">
                    {option.icon && <div className="text-2xl mb-2">{option.icon}</div>}
                    <div className="font-medium text-sm">{option.label}</div>
                    {answer?.includes(option.value) && (
                      <div className={`w-4 h-4 gradient-${theme} rounded-full flex items-center justify-center mx-auto mt-2`}>
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'slider':
        const sliderValue = answer || question.min || 0;
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`text-4xl font-bold text-${config.accentColor} mb-2`}>
                {question.dynamicLabel ? question.dynamicLabel(sliderValue) : `${sliderValue}${question.step === 1 ? '' : ' min'}`}
              </div>
              {question.subtitle && (
                <div className="text-lg text-slate-600">{question.subtitle}</div>
              )}
            </div>
            <div className="px-4">
              <Slider
                value={[sliderValue]}
                onValueChange={(value) => updateAnswer(question.id, value[0])}
                max={question.max || 100}
                min={question.min || 0}
                step={question.step || 1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-slate-500 mt-2">
                <span>{question.min || 0}</span>
                <span>{question.max || 100}</span>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Unsupported question type: {question.type}</div>;
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} relative`}>
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
              background: config.textGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {currentQuestion.label}
            </h1>
            {currentQuestion.subtitle && (
              <p className="text-lg text-slate-600">
                {currentQuestion.subtitle}
              </p>
            )}
          </div>

          {/* Question Input */}
          <div className="mb-8 animate-scale-in">
            {renderInput()}
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
              style={{ background: config.buttonGradient }}
            >
              {currentStep === totalSteps - 1 ? (
                <>
                  <i className={`fas fa-${theme === 'chef' ? 'chef-hat' : 'magic'} mr-2`}></i>
                  {theme === 'chef' ? 'Create Recipe' : 'Generate Ideas'}
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