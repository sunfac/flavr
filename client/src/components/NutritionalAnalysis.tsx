import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Activity, Zap, Heart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { useToast } from '@/hooks/use-toast';

interface NutritionalData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface NutritionalAnalysisProps {
  recipe: {
    title: string;
    ingredients: string[];
    servings: number;
  };
}

export default function NutritionalAnalysis({ recipe }: NutritionalAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const { toast } = useToast();

  const analyzeNutrition = async () => {
    if (hasAnalyzed && nutritionData) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/nutrition/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: recipe.title,
          ingredients: recipe.ingredients,
          servings: recipe.servings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze nutrition');
      }

      const data = await response.json();
      setNutritionData(data);
      setHasAnalyzed(true);
      setIsExpanded(true);
      
      toast({
        title: "Nutrition analyzed!",
        description: "Estimated nutritional information ready"
      });
    } catch (error) {
      console.error('Nutrition analysis failed:', error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze nutrition. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const NutritionItem = ({ icon: Icon, label, value, unit, color }: {
    icon: React.ElementType;
    label: string;
    value: number;
    unit: string;
    color: string;
  }) => (
    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-slate-300 text-sm">{label}</span>
      </div>
      <span className="text-white font-medium">
        {value.toFixed(1)}{unit}
      </span>
    </div>
  );

  return (
    <div className="p-6 bg-slate-800/10 border-t border-slate-700/30">
      <Button
        onClick={analyzeNutrition}
        disabled={isLoading}
        variant="outline"
        className="w-full bg-slate-800/50 border-slate-600/50 text-slate-200 hover:bg-slate-700/50 transition-all duration-200"
      >
        <Activity className="w-4 h-4 mr-2" />
        {isLoading ? (
          "Analyzing nutrition..."
        ) : hasAnalyzed ? (
          <>
            Nutritional Information
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </>
        ) : (
          "View Nutritional Analysis"
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="mt-4 overflow-hidden"
          >
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 bg-slate-700/50 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-slate-700/50 rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-slate-700/50 rounded animate-pulse" />
                  </div>
                ) : nutritionData ? (
                  <div className="space-y-4">
                    {/* Per Serving Summary */}
                    <div className="border-b border-slate-700/50 pb-4">
                      <h4 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Per Serving ({recipe.servings} servings total)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <div className="text-2xl font-bold text-orange-400">
                            {nutritionData.calories}
                          </div>
                          <div className="text-xs text-slate-400">calories</div>
                        </div>
                        <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <div className="text-2xl font-bold text-blue-400">
                            {nutritionData.protein}g
                          </div>
                          <div className="text-xs text-slate-400">protein</div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div>
                      <h4 className="text-slate-300 font-medium mb-3 flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        Nutritional Breakdown (Per Serving)
                      </h4>
                      <div className="space-y-2">
                        <NutritionItem
                          icon={Zap}
                          label="Calories"
                          value={nutritionData.calories}
                          unit=""
                          color="text-orange-400"
                        />
                        <NutritionItem
                          icon={Activity}
                          label="Protein"
                          value={nutritionData.protein}
                          unit="g"
                          color="text-blue-400"
                        />
                        <NutritionItem
                          icon={Clock}
                          label="Carbohydrates"
                          value={nutritionData.carbs}
                          unit="g"
                          color="text-green-400"
                        />
                        <NutritionItem
                          icon={Heart}
                          label="Fat"
                          value={nutritionData.fat}
                          unit="g"
                          color="text-purple-400"
                        />
                        <NutritionItem
                          icon={Activity}
                          label="Fiber"
                          value={nutritionData.fiber}
                          unit="g"
                          color="text-emerald-400"
                        />
                        <NutritionItem
                          icon={Zap}
                          label="Sugar"
                          value={nutritionData.sugar}
                          unit="g"
                          color="text-red-400"
                        />
                        <NutritionItem
                          icon={Clock}
                          label="Sodium"
                          value={nutritionData.sodium}
                          unit="mg"
                          color="text-yellow-400"
                        />
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-700/50">
                      * Nutritional values are estimates based on ingredients
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}