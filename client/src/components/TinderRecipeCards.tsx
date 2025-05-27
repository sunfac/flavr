import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RecipeIdea {
  title: string;
  description: string;
}

interface TinderRecipeCardsProps {
  recipes: RecipeIdea[];
  onSelectRecipe: (recipe: RecipeIdea) => void;
  onAllRecipesExhausted?: () => void;
  quizData?: any;
  theme?: 'shopping' | 'fridge' | 'chef';
}

export default function TinderRecipeCards({ 
  recipes, 
  onSelectRecipe, 
  onAllRecipesExhausted,
  quizData,
  theme = 'shopping' 
}: TinderRecipeCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [availableRecipes, setAvailableRecipes] = useState(recipes);

  const themeColors = {
    shopping: 'from-orange-500 to-amber-500',
    fridge: 'from-emerald-500 to-teal-500', 
    chef: 'from-amber-500 to-yellow-500'
  };

  // Update available recipes when props change
  useEffect(() => {
    setAvailableRecipes(recipes);
    setCurrentIndex(0);
  }, [recipes]);

  const currentRecipe = availableRecipes[currentIndex];

  const navigateRecipe = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentIndex < availableRecipes.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'prev' && currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleConfirmRecipe = () => {
    if (currentRecipe) {
      onSelectRecipe(currentRecipe);
    }
  };

  const handleRejectRecipe = () => {
    // Remove current recipe from available options
    const updatedRecipes = availableRecipes.filter((_, index) => index !== currentIndex);
    setAvailableRecipes(updatedRecipes);
    
    if (updatedRecipes.length === 0) {
      onAllRecipesExhausted?.();
      return;
    }
    
    // Adjust current index if we're at the end
    if (currentIndex >= updatedRecipes.length) {
      setCurrentIndex(updatedRecipes.length - 1);
    }
  };

  if (!currentRecipe) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No more recipes!</h2>
          <p className="text-slate-400">All recipes have been reviewed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white overflow-hidden flex flex-col">
      {/* Header - Compact */}
      <div className="flex-shrink-0 px-4 pt-2 pb-2">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-1">
            Perfect matches for you
          </h2>
          <p className="text-slate-300 text-xs mb-2">
            Swipe to explore • Tap to select
          </p>
          <div className="flex justify-center items-center space-x-2 text-xs text-slate-400">
            <span>{currentIndex + 1}</span>
            <div className="flex space-x-1">
              {availableRecipes.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    index === currentIndex ? `bg-orange-400` : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <span>{availableRecipes.length}</span>
          </div>
        </div>
      </div>

      {/* Card Container - Flexible height */}
      <div className="flex-1 px-4 min-h-0">
        <div className="max-w-md mx-auto h-full flex flex-col">
          {/* Recipe Card Area */}
          <div className="flex-1 relative" style={{ minHeight: '400px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 w-full h-full"
              >
                <Card className="w-full h-full bg-slate-800/90 backdrop-blur-lg border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                  <CardContent className="p-6 h-full flex flex-col">
                    {/* Recipe Title & Description */}
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                        {currentRecipe.title}
                      </h3>
                      <div className="text-slate-300 text-base leading-relaxed px-2">
                        {currentRecipe.description || "Delicious recipe waiting for you to discover!"}
                      </div>
                    </div>

                    {/* Recipe Visual */}
                    <div className="flex-1 bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center mb-4 min-h-0">
                      <motion.div
                        animate={{ 
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="text-6xl"
                      >
                        🍽️
                      </motion.div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => onSelectRecipe(currentRecipe)}
                      className={`w-full h-12 font-semibold rounded-xl transition-all duration-300 bg-gradient-to-r ${themeColors[theme]} hover:scale-105 shadow-lg hover:shadow-orange-500/25 text-white`}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Use This Recipe
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls - Always visible at bottom */}
          <div className="flex-shrink-0 mt-4 mb-4">
            <div className="flex justify-center items-center space-x-4">
              {/* Navigate Previous */}
              <Button
                variant="outline"
                onClick={() => navigateRecipe('prev')}
                disabled={currentIndex === 0}
                className="w-12 h-12 rounded-full border-slate-600 text-slate-300 hover:text-white hover:border-orange-400 disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800/80 backdrop-blur-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Reject Recipe (Swipe Left Action) */}
              <Button
                variant="outline"
                onClick={handleRejectRecipe}
                className="w-12 h-12 rounded-full border-red-500/50 text-red-400 hover:text-red-300 hover:border-red-400 hover:bg-red-500/10 transition-all duration-300 bg-slate-800/80 backdrop-blur-sm"
              >
                <X className="w-4 h-4" />
              </Button>
              
              {/* Confirm Recipe (Swipe Right Action) */}
              <Button
                onClick={handleConfirmRecipe}
                className={`w-12 h-12 rounded-full bg-gradient-to-r ${themeColors[theme]} hover:scale-110 shadow-lg hover:shadow-orange-500/25 text-white transition-all duration-300`}
              >
                <Heart className="w-4 h-4" />
              </Button>

              {/* Navigate Next */}
              <Button
                variant="outline"
                onClick={() => navigateRecipe('next')}
                disabled={currentIndex === availableRecipes.length - 1}
                className="w-12 h-12 rounded-full border-slate-600 text-slate-300 hover:text-white hover:border-orange-400 disabled:opacity-30 disabled:cursor-not-allowed bg-slate-800/80 backdrop-blur-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}