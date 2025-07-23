import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, ChefHat, Clock, ChevronLeft, ChevronRight, Heart, X, Sparkles, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRitualsStore } from "@/stores/ritualsStore";

interface RecipeCard {
  title: string;
  description: string;
}

interface DayInputs {
  mood: string;
  ambition: string;
  dietary: string[];
  time: string;
  budget: string;
  equipment: string[];
  cuisine: string[];
  creativeGuidance?: string;
  variationSeed?: string;
}

interface WeeklyInputs {
  monday: DayInputs;
  tuesday: DayInputs;
  wednesday: DayInputs;
  thursday: DayInputs;
  friday: DayInputs;
  saturday: DayInputs;
  sunday: DayInputs;
}

interface RitualsRecipeSelections {
  monday?: RecipeCard;
  tuesday?: RecipeCard;
  wednesday?: RecipeCard;
  thursday?: RecipeCard;
  friday?: RecipeCard;
  saturday?: RecipeCard;
  sunday?: RecipeCard;
}

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function FlavrRitualsPhase2() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Rituals store integration
  const { weeklyPreferences, currentPhase, setCurrentPhase } = useRitualsStore();
  
  const [selectedDay, setSelectedDay] = useState<typeof dayNames[number]>('monday');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [ritualsRecipeSelections, setRitualsRecipeSelections] = useState<RitualsRecipeSelections>({});
  const [generatedCards, setGeneratedCards] = useState<Record<string, RecipeCard[]>>({});
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});

  // Check for weekly preferences from Phase 1
  useEffect(() => {
    if (!weeklyPreferences) {
      toast({
        title: "No Weekly Plan Found",
        description: "Please complete Phase 1 first.",
        variant: "destructive",
      });
      setLocation('/flavr-rituals');
    } else if (currentPhase !== 'generation') {
      setCurrentPhase('generation');
    }
  }, [weeklyPreferences, currentPhase, setCurrentPhase, setLocation, toast]);

  // Generate recipe cards for a specific day
  const generateRecipeCards = useMutation({
    mutationFn: async (day: string) => {
      if (!weeklyPreferences || !weeklyPreferences[day as keyof typeof weeklyPreferences]) {
        throw new Error(`No preferences found for ${day}`);
      }

      const dayPrefs = weeklyPreferences[day as keyof typeof weeklyPreferences];
      
      const response = await apiRequest('POST', '/api/generate-ritual-cards', {
        mode: 'rituals',
        inputs: dayPrefs,
        day: day
      });

      if (!response.ok) {
        throw new Error('Failed to generate recipe cards');
      }

      return response.json();
    },
    onMutate: (day) => {
      setIsGenerating(prev => ({ ...prev, [day]: true }));
    },
    onSuccess: (data, day) => {
      setGeneratedCards(prev => ({
        ...prev,
        [day]: data.recipes || []
      }));
      setCurrentCardIndex(0);
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate recipe cards. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: (data, error, day) => {
      setIsGenerating(prev => ({ ...prev, [day]: false }));
    }
  });

  // Get current day's recipe cards
  const currentDayCards = generatedCards[selectedDay] || [];
  const currentCard = currentDayCards[currentCardIndex];
  const hasSelectedForDay = ritualsRecipeSelections[selectedDay];
  const isCurrentDayGenerating = isGenerating[selectedDay];

  // Handle card selection
  const selectCard = (card: RecipeCard) => {
    setRitualsRecipeSelections(prev => ({
      ...prev,
      [selectedDay]: card
    }));
    
    toast({
      title: "Recipe Selected!",
      description: `${card.title} selected for ${selectedDay}`,
    });
  };

  // Handle card rejection (next card)
  const rejectCard = () => {
    if (currentCardIndex < currentDayCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      // All cards viewed, regenerate if needed
      toast({
        title: "All Cards Viewed",
        description: "Generate new cards or select from previous ones",
      });
    }
  };

  // Check if all non-skipped days have selections
  const canProceed = dayNames.every(day => {
    const dayPrefs = weeklyPreferences?.[day];
    return !dayPrefs || dayPrefs.skip || ritualsRecipeSelections[day];
  });

  // Generate cards for current day if not already generated
  useEffect(() => {
    if (weeklyPreferences && selectedDay && !generatedCards[selectedDay] && !isGenerating[selectedDay]) {
      const dayPrefs = weeklyPreferences[selectedDay];
      if (dayPrefs && !dayPrefs.skip) {
        generateRecipeCards.mutate(selectedDay);
      }
    }
  }, [selectedDay, weeklyPreferences, generatedCards, isGenerating]);

  if (!weeklyPreferences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      <GlobalHeader 
        onMenuClick={() => {}}
        onSettingsClick={() => {}}
      />
      
      <div className="pt-20 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/flavr-rituals')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Crown className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Flavr Rituals</h1>
              <p className="text-gray-400">Phase 2: Recipe Selection</p>
            </div>
          </div>
        </div>

        {/* Weekly Calendar Navigation */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Weekly Recipe Selection</h2>
            <div className="text-sm text-gray-400">
              {Object.keys(ritualsRecipeSelections).length} / {dayNames.filter(day => !weeklyPreferences[day]?.skip).length} selected
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day, index) => {
              const isSkipped = weeklyPreferences[day]?.skip;
              const hasSelection = ritualsRecipeSelections[day];
              const isSelected = selectedDay === day;
              
              return (
                <Button
                  key={day}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!isSkipped) {
                      setSelectedDay(day);
                      setCurrentCardIndex(0);
                    }
                  }}
                  disabled={isSkipped}
                  className={`
                    relative h-16 flex flex-col items-center justify-center
                    ${isSelected ? 'bg-orange-500 hover:bg-orange-600' : 'border-gray-600 hover:border-gray-500'}
                    ${isSkipped ? 'opacity-50 cursor-not-allowed' : ''}
                    ${hasSelection ? 'border-green-500' : ''}
                  `}
                >
                  <div className="text-xs font-medium">{dayLabels[index]}</div>
                  {hasSelection && (
                    <Heart className="w-3 h-3 text-green-400 fill-current" />
                  )}
                  {isSkipped && (
                    <div className="text-xs text-gray-500">Skip</div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Recipe Card Display */}
        <div className="max-w-md mx-auto">
          {weeklyPreferences[selectedDay]?.skip ? (
            <Card className="bg-gray-800 border-gray-700 text-center p-8">
              <CardContent>
                <div className="text-gray-400 mb-4">
                  <Calendar className="w-12 h-12 mx-auto mb-2" />
                  <p>This day is skipped</p>
                </div>
              </CardContent>
            </Card>
          ) : isCurrentDayGenerating ? (
            <Card className="bg-gray-800 border-gray-700 text-center p-8">
              <CardContent>
                <div className="text-orange-400 mb-4">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 animate-pulse" />
                  <p>Generating recipe ideas...</p>
                </div>
              </CardContent>
            </Card>
          ) : hasSelectedForDay ? (
            <Card className="bg-gray-800 border-gray-700 border-green-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <Heart className="w-5 h-5 fill-current" />
                    Selected Recipe
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRitualsRecipeSelections(prev => {
                        const updated = { ...prev };
                        delete updated[selectedDay];
                        return updated;
                      });
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Change
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-bold mb-2">{hasSelectedForDay.title}</h3>
                <p className="text-gray-300">{hasSelectedForDay.description}</p>
              </CardContent>
            </Card>
          ) : currentCard ? (
            <div className="relative">
              {/* Card Stack Effect */}
              <div className="relative">
                {currentDayCards.slice(currentCardIndex, currentCardIndex + 2).map((card, index) => (
                  <motion.div
                    key={`${selectedDay}-${currentCardIndex + index}`}
                    className={`absolute inset-0 ${index === 0 ? 'z-10' : 'z-0'}`}
                    style={{
                      transform: `scale(${1 - index * 0.05}) translateY(${index * 8}px)`,
                      opacity: 1 - index * 0.3
                    }}
                    animate={{
                      scale: 1 - index * 0.05,
                      y: index * 8,
                      opacity: 1 - index * 0.3
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold">{card.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-300 leading-relaxed">{card.description}</p>
                        
                        {index === 0 && (
                          <div className="flex gap-4 mt-6">
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={rejectCard}
                              className="flex-1 border-gray-600 hover:border-red-500 hover:text-red-400"
                            >
                              <X className="w-5 h-5 mr-2" />
                              Pass
                            </Button>
                            <Button
                              size="lg"
                              onClick={() => selectCard(card)}
                              className="flex-1 bg-orange-500 hover:bg-orange-600"
                            >
                              <Heart className="w-5 h-5 mr-2" />
                              Select
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              
              {/* Card Counter */}
              <div className="flex justify-center mt-4 gap-2">
                {currentDayCards.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentCardIndex ? 'bg-orange-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card className="bg-gray-800 border-gray-700 text-center p-8">
              <CardContent>
                <div className="text-gray-400 mb-4">
                  <ChefHat className="w-12 h-12 mx-auto mb-2" />
                  <p>No recipe cards available</p>
                  <Button
                    variant="outline"
                    onClick={() => generateRecipeCards.mutate(selectedDay)}
                    className="mt-4"
                  >
                    Generate Cards
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Proceed Button */}
        <div className="max-w-md mx-auto mt-8">
          <Button
            size="lg"
            disabled={!canProceed}
            onClick={() => {
              localStorage.setItem('flavr-rituals-recipe-selections', JSON.stringify(ritualsRecipeSelections));
              setLocation('/flavr-rituals/phase3');
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
          >
            Continue to Shopping List
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
          
          {!canProceed && (
            <p className="text-sm text-gray-400 text-center mt-2">
              Select a recipe for each active day to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}