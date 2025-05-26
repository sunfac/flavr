import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Heart, X, Clock, ChefHat, Utensils, Sparkles } from "lucide-react";

interface RecipeIdea {
  title: string;
  description: string;
  mood?: string;
  time?: string;
  diet?: string;
  ambition?: string;
  equipment?: string;
}

interface TinderRecipeCardsProps {
  recipes: RecipeIdea[];
  onSelectRecipe: (recipe: RecipeIdea) => void;
  quizData?: any;
  theme?: 'shopping' | 'fridge' | 'chef';
}

export default function TinderRecipeCards({ 
  recipes, 
  onSelectRecipe, 
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

  const themeAccents = {
    shopping: 'orange-400',
    fridge: 'emerald-400',
    chef: 'amber-400'
  };

  // Update available recipes when props change
  useEffect(() => {
    setAvailableRecipes(recipes);
    setCurrentIndex(0);
  }, [recipes]);

  const currentRecipe = availableRecipes[currentIndex];

  const handleConfirmRecipe = () => {
    if (currentRecipe) {
      setDirection(1);
      onSelectRecipe(currentRecipe);
    }
  };

  const handleRejectRecipe = () => {
    setDirection(-1);
    // Remove current recipe from stack
    const newAvailableRecipes = availableRecipes.filter((_, index) => index !== currentIndex);
    setAvailableRecipes(newAvailableRecipes);
    
    // Adjust current index if needed
    if (currentIndex >= newAvailableRecipes.length && newAvailableRecipes.length > 0) {
      setCurrentIndex(newAvailableRecipes.length - 1);
    } else if (newAvailableRecipes.length === 0) {
      setCurrentIndex(0);
    }
  };

  const navigateRecipe = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < availableRecipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    
    if (info.offset.x > swipeThreshold) {
      // Swipe right = confirm recipe (triggers Prompt 2)
      handleConfirmRecipe();
    } else if (info.offset.x < -swipeThreshold) {
      // Swipe left = reject recipe (remove from stack)
      handleRejectRecipe();
    }
  };

  const getBadgeData = (recipe: RecipeIdea) => {
    const badges = [];
    
    if (quizData?.mood) {
      badges.push({ icon: <Heart className="w-3 h-3" />, label: quizData.mood });
    }
    if (quizData?.time || recipe.time) {
      badges.push({ icon: <Clock className="w-3 h-3" />, label: `${quizData?.time || recipe.time} min` });
    }
    if (quizData?.dietary?.length > 0) {
      badges.push({ icon: <Utensils className="w-3 h-3" />, label: quizData.dietary[0] });
    }
    if (quizData?.ambition) {
      const ambitionLabels = ['Easy', 'Simple', 'Moderate', 'Advanced', 'Expert'];
      badges.push({ 
        icon: <ChefHat className="w-3 h-3" />, 
        label: `Level ${quizData.ambition}` 
      });
    }
    if (quizData?.equipment?.length > 0) {
      badges.push({ icon: <Sparkles className="w-3 h-3" />, label: quizData.equipment[0] });
    }

    return badges.slice(0, 4); // Limit to 4 badges for clean layout
  };

  // Show fallback UI when no recipes remain
  if (!currentRecipe || availableRecipes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
              <Heart className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              No more matches!
            </h2>
            <p className="text-slate-300 text-lg mb-6">
              You've seen all the recipe suggestions. Want to try different preferences?
            </p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-3 rounded-xl font-semibold"
          >
            Try New Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent mb-4">
            Perfect matches for you
          </h2>
          <p className="text-slate-300 text-lg mb-2">
            Swipe to explore • Tap to select
          </p>
          <div className="flex justify-center items-center space-x-2 text-sm text-slate-400">
            <span>{currentIndex + 1}</span>
            <div className="flex space-x-1">
              {availableRecipes.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex ? `bg-${themeAccents[theme]}` : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <span>{availableRecipes.length}</span>
          </div>
        </div>

        {/* Card Stack - Made taller to fit titles better */}
        <div className="relative h-[28rem] mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={handleDragEnd}
              initial={{ 
                opacity: 0, 
                scale: 0.8,
                x: direction > 0 ? 300 : -300 
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: 0 
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8,
                x: direction > 0 ? -300 : 300 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
              className="absolute inset-0"
            >
              <Card className="h-full bg-slate-800/80 backdrop-blur-xl border border-slate-600 hover:border-orange-400/50 transition-all duration-300 shadow-2xl hover:shadow-orange-500/25">
                <CardContent className="p-8 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-4 leading-tight">
                      {currentRecipe.title}
                    </h3>
                    <p className="text-slate-300 text-lg mb-6 leading-relaxed">
                      {currentRecipe.description}
                    </p>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {getBadgeData(currentRecipe).map((badge, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="flex items-center space-x-1 px-3 py-1 border-orange-400/30 text-slate-300 bg-orange-500/10"
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => onSelectRecipe(currentRecipe)}
                    className={`w-full h-14 font-semibold rounded-xl transition-all duration-300 bg-gradient-to-r ${themeColors[theme]} hover:scale-105 shadow-lg hover:shadow-orange-500/25 text-white`}
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Use This Recipe
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Tinder-Style Controls */}
        <div className="flex justify-center items-center space-x-6">
          {/* Navigate Previous */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigateRecipe('prev')}
            disabled={currentIndex === 0}
            className="w-14 h-14 rounded-full border-slate-600 text-slate-300 hover:text-white hover:border-orange-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Reject Recipe (Swipe Left Action) */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleRejectRecipe}
            className="w-16 h-16 rounded-full border-red-500/50 text-red-400 hover:text-red-300 hover:border-red-400 hover:bg-red-500/10 transition-all duration-300"
          >
            <X className="w-6 h-6" />
          </Button>
          
          {/* Confirm Recipe (Swipe Right Action) */}
          <Button
            size="lg"
            onClick={handleConfirmRecipe}
            className={`w-20 h-20 rounded-full bg-gradient-to-r ${themeColors[theme]} hover:scale-110 shadow-lg hover:shadow-orange-500/25 text-white transition-all duration-300`}
          >
            <Heart className="w-8 h-8" />
          </Button>

          {/* Navigate Next */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigateRecipe('next')}
            disabled={currentIndex === availableRecipes.length - 1}
            className="w-14 h-14 rounded-full border-slate-600 text-slate-300 hover:text-white hover:border-orange-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Improved Swipe Hint */}
        <div className="text-center mt-6">
          <p className="text-slate-400 text-sm mb-2">
            👈 Swipe left to reject • Swipe right to cook 👉
          </p>
          <div className="flex justify-center items-center space-x-4 text-xs text-slate-500">
            <span className="flex items-center space-x-1">
              <X className="w-3 h-3 text-red-400" />
              <span>Pass</span>
            </span>
            <span className="flex items-center space-x-1">
              <Heart className="w-3 h-3 text-orange-400" />
              <span>Cook This!</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}