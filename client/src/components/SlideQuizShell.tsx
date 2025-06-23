import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2 } from "lucide-react";
import { iconMap } from "@/lib/iconMap";
import { useToast } from "@/hooks/use-toast";

// Utility function to get random selection from array
const getRandomSelection = (array: string[], count: number): string[] => {
  if (array.length <= count) return array;
  
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

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
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, boolean>>({});
  const [additionalIngredient, setAdditionalIngredient] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentQ = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Generate random examples for the current question (memoized to prevent re-shuffling on re-renders)
  const randomExamples = useMemo(() => {
    if (currentQ.examples && currentQ.examples.length > 6) {
      return getRandomSelection(currentQ.examples, 6);
    }
    return currentQ.examples || [];
  }, [currentQuestionIndex, currentQ.id]); // Re-shuffle when question changes

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    // Clear temp input when changing questions
    setTempInput('');
  }, [currentQuestionIndex]);

  useEffect(() => {
    // Add quiz-mode class to prevent scrolling
    document.documentElement.classList.add('quiz-mode');
    document.body.classList.add('quiz-mode');
    
    return () => {
      // Remove quiz-mode class when component unmounts
      document.documentElement.classList.remove('quiz-mode');
      document.body.classList.remove('quiz-mode');
    };
  }, []);

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
    const iconLookup: Record<string, keyof typeof iconMap> = {
      'Home': 'home',
      'Leaf': 'leaf',
      'Crown': 'crown',
      'Target': 'target',
      'Zap': 'zap',
      'Star': 'star',
      'Shuffle': 'shuffle',
      'DollarSign': 'dollarSign',
      'CreditCard': 'creditCard',
      'Flame': 'flame',
      'Building': 'building',
      'Microwave': 'microwave',
      'Wind': 'wind',
      'Timer': 'timer',
      'Clock': 'clock',
      'ChefHat': 'chefHat',
      'Utensils': 'utensils',
      'Sparkles': 'sparkles',
      'ShoppingCart': 'shoppingCart',
      'Store': 'store',
      'PoundSterling': 'poundSterling',
      'ShoppingBag': 'shoppingBag',
      'Coins': 'coins',
      'Banknote': 'banknote',
      'Users': 'users',
      'Heart': 'heart',
      'Waves': 'waves',
      'Beef': 'beef',
      'Blend': 'blend',
      'Soup': 'soup',
      'User': 'user',
      'Users2': 'users2',
      'PartyPopper': 'partyPopper',
      'Snowflake': 'snowflake',
      'Globe': 'globe',
      'Coffee': 'coffee',
      'Smartphone': 'smartphone',
      'Shield': 'shield',
      'Plus': 'plus'
    };
    
    const iconKey = iconLookup[iconName];
    const IconComponent = iconKey ? iconMap[iconKey] : null;
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

  // Simple slider value calculation without hooks to avoid conditional usage
  const getSliderValue = () => {
    if (currentAnswer !== undefined && currentAnswer !== null) {
      return Number(currentAnswer);
    }
    return currentQ.min || 1;
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
            {randomExamples && randomExamples.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {randomExamples.map((example, index) => (
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

        const handlePhotoCapture = () => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        };

        const processPhoto = async (file: File) => {
          setIsProcessingPhoto(true);
          try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/vision/fridge-scan', {
              method: 'POST',
              body: formData
            });

            if (!response.ok) {
              throw new Error('Failed to process image');
            }

            const result = await response.json();
            
            if (result.ingredients && result.ingredients.length > 0) {
              setDetectedIngredients(result.ingredients);
              // Initialize all detected ingredients as selected
              const initialSelection: Record<string, boolean> = {};
              result.ingredients.forEach((ingredient: string) => {
                initialSelection[ingredient] = true;
              });
              setSelectedIngredients(initialSelection);
              setShowPhotoModal(true);
            } else {
              toast({
                title: "No ingredients detected",
                description: "Couldn't recognise foods – please list ingredients manually.",
                variant: "default"
              });
            }
          } catch (error) {
            console.error('Error processing photo:', error);
            toast({
              title: "Photo processing failed",
              description: "Couldn't recognise foods – please list ingredients manually.",
              variant: "destructive"
            });
          } finally {
            setIsProcessingPhoto(false);
          }
        };

        const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) {
            processPhoto(file);
          }
        };

        const confirmPhotoIngredients = () => {
          const confirmedIngredients = detectedIngredients.filter(ingredient => 
            selectedIngredients[ingredient]
          );
          
          // Add additional ingredient if provided
          if (additionalIngredient.trim()) {
            const additionalIngredients = additionalIngredient
              .split(',')
              .map(ing => ing.trim())
              .filter(ing => ing.length > 0);
            confirmedIngredients.push(...additionalIngredients);
          }
          
          // Combine with existing ingredients
          const updatedIngredients = [...ingredients, ...confirmedIngredients];
          updateAnswer(currentQ.id, updatedIngredients);
          
          // Reset photo modal state
          setShowPhotoModal(false);
          setDetectedIngredients([]);
          setSelectedIngredients({});
          setAdditionalIngredient('');
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
            
            {/* Photo capture button for Fridge Mode */}
            {currentQ.id === 'ingredients' && (
              <div className="flex justify-center">
                <Button
                  onClick={handlePhotoCapture}
                  disabled={isProcessingPhoto}
                  variant="outline"
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:border-orange-400 rounded-xl"
                >
                  {isProcessingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Take a photo instead
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            
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

            {/* Photo Ingredients Confirmation Modal */}
            <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
              <DialogContent className="bg-slate-800 border-slate-600 text-white max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-orange-400">Found these ingredients – edit before continuing</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Detected ingredients with checkboxes */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detectedIngredients.map((ingredient, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ingredient-${index}`}
                          checked={selectedIngredients[ingredient] || false}
                          onCheckedChange={(checked) => {
                            setSelectedIngredients(prev => ({
                              ...prev,
                              [ingredient]: checked as boolean
                            }));
                          }}
                          className="border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                        <label 
                          htmlFor={`ingredient-${index}`}
                          className="text-sm text-slate-200 cursor-pointer flex-1"
                        >
                          {ingredient}
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Add additional ingredients */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Add another:</label>
                    <Input
                      placeholder="Type additional ingredients..."
                      value={additionalIngredient}
                      onChange={(e) => setAdditionalIngredient(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400"
                    />
                  </div>

                  {/* Confirm button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowPhotoModal(false)}
                      variant="outline"
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700/50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmPhotoIngredients}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Looks good →
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-4">
            <Textarea
              placeholder={currentQ.placeholder}
              value={currentAnswer || ''}
              onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
              className="min-h-32 text-lg bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-orange-400 rounded-xl"
            />
            {randomExamples && randomExamples.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Need inspiration? Try these:</p>
                <div className="flex flex-wrap gap-2">
                  {randomExamples.map((example, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-orange-500/20 border-slate-600 text-slate-300 text-xs"
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
                          {isSelected && <iconMap.checkCircle className="w-3 h-3 text-white" />}
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
        const getSliderOptions = () => {
          if (currentQ.id === 'ambition') {
            return [
              { value: 1, label: 'Just Get Fed', icon: <iconMap.clock className="w-4 h-4" /> },
              { value: 2, label: 'Casual Cook', icon: <iconMap.utensils className="w-4 h-4" /> },
              { value: 3, label: 'Weekend Chef', icon: <iconMap.chefHat className="w-4 h-4" /> },
              { value: 4, label: 'Passionate Cook', icon: <iconMap.sparkles className="w-4 h-4" /> },
              { value: 5, label: 'Michelin Madness', icon: <iconMap.checkCircle className="w-4 h-4" /> }
            ];
          }
          if (currentQ.id === 'time') {
            return [
              { value: 15, label: '15 min', icon: <iconMap.clock className="w-4 h-4" /> },
              { value: 30, label: '30 min', icon: <iconMap.clock className="w-4 h-4" /> },
              { value: 60, label: '60 min', icon: <iconMap.clock className="w-4 h-4" /> },
              { value: 90, label: '90 min', icon: <iconMap.clock className="w-4 h-4" /> },
              { value: 120, label: 'No limit', icon: <iconMap.sparkles className="w-4 h-4" /> }
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
                {renderSliderWithLabel(getSliderValue())}
              </div>
            </div>

            {/* Show options above slider for ambition only */}
            {sliderOptions.length > 0 && currentQ.id === 'ambition' && (
              <div className="w-full max-w-sm mx-auto space-y-2">
                {sliderOptions.map((option, index) => (
                  <div
                    key={option.value}
                    className={`flex items-center justify-between p-2 rounded-lg transition-all duration-300 cursor-pointer ${
                      getSliderValue() === option.value
                        ? 'bg-orange-500/20 border-2 border-orange-400'
                        : 'bg-slate-800/30 border-2 border-slate-600 hover:border-orange-400/50'
                    }`}
                    onClick={() => updateAnswer(currentQ.id, option.value)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`${getSliderValue() === option.value ? 'text-orange-400' : 'text-slate-400'}`}>
                        {option.icon}
                      </div>
                      <span className={`font-medium text-sm ${getSliderValue() === option.value ? 'text-white' : 'text-slate-300'}`}>
                        {option.label}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                        getSliderValue() === option.value
                          ? 'bg-orange-400 border-orange-400'
                          : 'border-slate-400'
                      }`}
                    >
                      {getSliderValue() === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4">
              <Slider
                value={[getSliderValue()]}
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
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative">
      {/* Header - Compact for mobile */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700 z-10">
        <div className="max-w-md mx-auto px-3 py-2">
          <div className="text-center mb-2">
            <h1 className="text-base md:text-lg font-bold text-white">{title}</h1>
            {subtitle && <p className="text-slate-400 mt-1 text-xs">{subtitle}</p>}
          </div>
          <Progress value={progress} className="h-1 bg-slate-800" />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-400">
              {currentQuestionIndex + 1}/{questions.length}
            </span>
            <span className="text-xs text-orange-400 font-medium">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Question Content - Mobile optimized */}
      <div ref={containerRef} className="pb-24 min-h-[60vh]">
        <div className="max-w-md mx-auto px-3 pt-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentQuestionIndex}
              custom={direction}
              initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-4 pb-8"
            >
              <div className="text-center space-y-1">
                <h2 className="text-base md:text-lg font-semibold text-white">
                  {currentQ.label}
                </h2>
                {currentQ.subtitle && (
                  <p className="text-slate-400 text-sm">{currentQ.subtitle}</p>
                )}
              </div>

              <div className="space-y-3">
                {renderQuestion()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation - Above footer */}
      <div 
        className="fixed left-0 right-0 bg-slate-900 border-t border-slate-700 shadow-2xl"
        style={{ 
          zIndex: 9999,
          position: 'fixed',
          bottom: '80px', // Position above the global footer
          left: 0,
          right: 0
        }}
      >
        <div className="w-full max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 border-slate-600 bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 min-w-[80px] flex-shrink-0"
            >
              <iconMap.arrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>

            <div className="text-center flex-1 min-w-0">
              {currentQ.required && !canProceed() && (
                <p className="text-orange-400 text-sm font-medium">Required</p>
              )}
            </div>

            <Button
              onClick={nextQuestion}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 px-6 py-2 min-w-[100px] flex-shrink-0 font-medium"
              style={{ minWidth: '100px', backgroundColor: '#f97316' }}
            >
              <span className="whitespace-nowrap">{currentQuestionIndex === questions.length - 1 ? 'Generate' : 'Next'}</span>
              <iconMap.arrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}