import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wine, X, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface WineRecommendation {
  name: string;
  type: string;
  description: string;
  priceRange: string;
  pairing_reason: string;
}

interface WineRecommendationsProps {
  recipe: {
    title: string;
    cuisine?: string;
    ingredients: string[];
    instructions?: string[];
    difficulty?: string;
    description?: string;
  };
  className?: string;
}

function WineRecommendations({ recipe, className = '' }: WineRecommendationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<WineRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { toast } = useToast();

  // Extract main ingredients (first 3-5 ingredients for analysis)
  const getMainIngredients = () => {
    return recipe.ingredients
      .slice(0, 5)
      .map(ingredient => {
        // Clean ingredient text to extract just the ingredient name
        return ingredient
          .replace(/^\d+\s*(?:cups?|tbsp|tsp|oz|lbs?|kg|g|ml|l|cloves?|pieces?|large|medium|small)?\s*/i, '')
          .replace(/,.*/, '') // Remove everything after comma
          .split(' ')[0] // Take first word as primary ingredient
          .trim();
      })
      .filter(ingredient => ingredient.length > 2); // Filter out very short words
  };

  const detectCookingMethod = () => {
    const instructions = recipe.instructions?.join(' ').toLowerCase() || '';
    
    if (instructions.includes('grill') || instructions.includes('barbecue')) return 'grilled';
    if (instructions.includes('roast') || instructions.includes('bake')) return 'roasted';
    if (instructions.includes('fry') || instructions.includes('sauté')) return 'fried';
    if (instructions.includes('steam')) return 'steamed';
    if (instructions.includes('braise') || instructions.includes('slow cook')) return 'braised';
    if (instructions.includes('poach') || instructions.includes('simmer')) return 'poached';
    
    return 'mixed';
  };

  const detectSpiceLevel = () => {
    const allText = `${recipe.title} ${recipe.ingredients.join(' ')} ${recipe.instructions?.join(' ') || ''}`.toLowerCase();
    
    if (allText.match(/hot|spicy|chili|cayenne|jalapeño|sriracha|curry|paprika|pepper/)) {
      return 'spicy';
    }
    if (allText.match(/mild|gentle|subtle/)) {
      return 'mild';
    }
    
    return 'medium';
  };

  const fetchWineRecommendations = async () => {
    if (hasLoaded && recommendations.length > 0) {
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    
    try {
      const requestData = {
        recipeTitle: recipe.title,
        cuisine: recipe.cuisine,
        mainIngredients: getMainIngredients(),
        cookingMethod: detectCookingMethod(),
        spiceLevel: detectSpiceLevel(),
        difficulty: recipe.difficulty,
        description: recipe.description
      };

      console.log('🍷 Requesting wine recommendations for:', requestData);

      const response = await apiRequest('POST', '/api/wine/pairing', requestData);
      const data = await response.json();

      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
        setHasLoaded(true);
        setIsOpen(true);
        
        toast({
          title: "Wine recommendations ready! 🍷",
          description: `Found ${data.recommendations.length} perfect wine pairings for ${recipe.title}`,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch wine recommendations:', error);
      
      toast({
        title: "Unable to get wine recommendations",
        description: "Try again in a moment, or consult your local wine shop for personalized advice.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWineTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('red')) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    if (lowerType.includes('white')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    if (lowerType.includes('rosé') || lowerType.includes('rose')) return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300';
    if (lowerType.includes('sparkling')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    if (lowerType.includes('dessert')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  };

  const getPriceRangeColor = (priceRange: string) => {
    const lower = priceRange.toLowerCase();
    if (lower.includes('budget')) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    if (lower.includes('mid-range')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
    if (lower.includes('premium')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  };

  return (
    <div className={className}>
      {/* Wine Recommendations Trigger Button - Enhanced Prominence */}
      <div className="w-full">
        <Button
          data-testid="button-wine-recommendations"
          onClick={fetchWineRecommendations}
          disabled={isLoading}
          variant="default"
          size="lg"
          className="w-full flex flex-col items-center gap-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-500 dark:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700 text-white border-0 rounded-xl py-6 px-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <LoaderCircle className="h-8 w-8 animate-spin" />
              <div className="text-center">
                <div className="font-semibold text-lg">Finding Perfect Wines...</div>
                <div className="text-base opacity-90">Analyzing flavor profiles</div>
              </div>
            </>
          ) : (
            <>
              <Wine className="h-8 w-8 mb-1" />
              <div className="text-center">
                <div className="font-semibold text-lg">Wine Pairings</div>
                <div className="text-base opacity-90">Get expert wine recommendations</div>
              </div>
            </>
          )}
        </Button>
      </div>

      {/* Wine Recommendations Modal/Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full my-8 mx-auto"
              style={{ 
                maxHeight: 'calc(100vh - 4rem)',
                minHeight: 'auto',
                transform: 'translateZ(0)'
              }}
            >
              <div className="max-h-full overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Wine className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Wine Pairing Recommendations
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        For {recipe.title}
                      </p>
                    </div>
                  </div>
                  <Button
                    data-testid="button-close-wine-recommendations"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Wine Recommendations Content */}
              <div className="p-6 space-y-4">
                {recommendations.map((wine, index) => (
                  <Card
                    key={index}
                    data-testid={`wine-recommendation-${index}`}
                    className="p-5 border-2 border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 transition-colors duration-200"
                  >
                    <div className="space-y-3">
                      {/* Wine Name and Type */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white leading-tight">
                          {wine.name}
                        </h3>
                        <div className="flex gap-2 flex-shrink-0">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getWineTypeColor(wine.type)}`}>
                            {wine.type}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriceRangeColor(wine.priceRange)}`}>
                            {wine.priceRange}
                          </span>
                        </div>
                      </div>

                      {/* Wine Description */}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {wine.description}
                      </p>

                      {/* Pairing Reason */}
                      <div className="bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-100 dark:border-purple-900/20">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          <span className="font-medium">Perfect pairing: </span>
                          {wine.pairing_reason}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Footer Note */}
                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Wine recommendations are AI-generated suggestions. Personal taste may vary.
                    <br />
                    Consult your local wine shop for personalized recommendations.
                  </p>
                </div>
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WineRecommendations;