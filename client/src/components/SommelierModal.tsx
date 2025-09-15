import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wine, X, DollarSign, Star, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface WineRecommendation {
  name: string;
  type: string; // 'red', 'white', 'rosé', 'sparkling'
  variety: string; // 'Pinot Noir', 'Chardonnay', etc.
  region: string;
  priceRange: 'budget' | 'mid-range' | 'premium';
  pairingReason: string;
  tastingNotes: string[];
  servingTemp: string;
  alternatives?: string[];
}

interface SommelierRecommendations {
  primaryRecommendation: WineRecommendation;
  alternatives: WineRecommendation[];
  generalPairingPrinciples: string;
  dinnerPartyTips?: string;
}

interface SommelierModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: {
    title: string;
    cuisine?: string;
    ingredients: string[];
    instructions: string[];
    difficulty?: string;
    cookTime?: number;
  };
}

export default function SommelierModal({ isOpen, onClose, recipe }: SommelierModalProps) {
  const [recommendations, setRecommendations] = useState<SommelierRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const { toast } = useToast();

  const analyzeWinePairings = async () => {
    if (hasAnalyzed && recommendations) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/sommelier/analyze', {
        recipe: {
          title: recipe.title,
          cuisine: recipe.cuisine,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          difficulty: recipe.difficulty,
          cookTime: recipe.cookTime
        }
      });

      const data = await response.json();
      setRecommendations(data.recommendations);
      setHasAnalyzed(true);
      
      toast({
        title: "Wine pairings ready!",
        description: "Professional sommelier recommendations prepared"
      });
    } catch (error) {
      console.error('Sommelier analysis failed:', error);
      toast({
        title: "Analysis failed",
        description: "Could not get wine recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-analyze when modal opens
  React.useEffect(() => {
    if (isOpen && !hasAnalyzed && !isLoading) {
      analyzeWinePairings();
    }
  }, [isOpen, hasAnalyzed, isLoading]);

  const getPriceRangeIcon = (priceRange: string) => {
    switch (priceRange) {
      case 'budget': return '💰';
      case 'mid-range': return '💰💰';
      case 'premium': return '💰💰💰';
      default: return '💰';
    }
  };

  const getWineTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'red': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'white': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'rosé': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'sparkling': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  const WineCard = ({ wine, isPrimary = false }: { wine: WineRecommendation; isPrimary?: boolean }) => (
    <Card className={`bg-slate-800/40 border-slate-700/50 ${isPrimary ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Wine className="w-5 h-5 text-orange-400" />
              {wine.name}
              {isPrimary && <Star className="w-4 h-4 text-orange-400" />}
            </CardTitle>
            <p className="text-slate-300 text-sm">{wine.variety}</p>
          </div>
          <Badge className={getWineTypeColor(wine.type)}>
            {wine.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Region and Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <MapPin className="w-4 h-4" />
            {wine.region}
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-sm">
            <DollarSign className="w-4 h-4" />
            <span>{getPriceRangeIcon(wine.priceRange)} {wine.priceRange}</span>
          </div>
        </div>

        {/* Pairing Reason */}
        <div className="bg-slate-800/60 rounded-lg p-3">
          <h4 className="text-orange-400 font-medium text-sm mb-2">Why This Pairing Works</h4>
          <p className="text-slate-300 text-sm leading-relaxed">{wine.pairingReason}</p>
        </div>

        {/* Tasting Notes */}
        <div>
          <h4 className="text-slate-300 font-medium text-sm mb-2">Tasting Notes</h4>
          <div className="flex flex-wrap gap-1">
            {wine.tastingNotes.map((note, index) => (
              <Badge key={index} variant="outline" className="text-xs border-slate-600 text-slate-400">
                {note}
              </Badge>
            ))}
          </div>
        </div>

        {/* Serving Temperature */}
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Clock className="w-4 h-4" />
          <span>Serve at {wine.servingTemp}</span>
        </div>

        {/* Alternatives */}
        {wine.alternatives && wine.alternatives.length > 0 && (
          <div>
            <h4 className="text-slate-400 font-medium text-sm mb-2">Similar Options</h4>
            <p className="text-slate-400 text-xs">{wine.alternatives.join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <Wine className="w-6 h-6 text-orange-400" />
            Wine Pairing for "{recipe.title}"
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Wine className="w-8 h-8 text-orange-400" />
              </motion.div>
              <p className="text-slate-300 mt-4">Our sommelier is analyzing your dish...</p>
              <p className="text-slate-500 text-sm">Considering cuisine, ingredients, and flavor profile</p>
            </div>

            {/* Loading skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-slate-800/30 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : recommendations ? (
          <div className="space-y-6">
            {/* General Pairing Principles */}
            <Card className="bg-orange-500/10 border-orange-500/30">
              <CardContent className="p-4">
                <h3 className="text-orange-400 font-medium mb-2 flex items-center gap-2">
                  <Wine className="w-4 h-4" />
                  Sommelier's Analysis
                </h3>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {recommendations.generalPairingPrinciples}
                </p>
              </CardContent>
            </Card>

            {/* Primary Recommendation */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-400" />
                Top Recommendation
              </h3>
              <WineCard wine={recommendations.primaryRecommendation} isPrimary={true} />
            </div>

            {/* Alternative Recommendations */}
            {recommendations.alternatives && recommendations.alternatives.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-3">Alternative Pairings</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recommendations.alternatives.map((wine, index) => (
                    <WineCard key={index} wine={wine} />
                  ))}
                </div>
              </div>
            )}

            {/* Dinner Party Tips */}
            {recommendations.dinnerPartyTips && (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-4">
                  <h3 className="text-slate-300 font-medium mb-2">Hosting Tips</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {recommendations.dinnerPartyTips}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Footer disclaimer */}
            <div className="text-center pt-4 border-t border-slate-700/50">
              <p className="text-slate-500 text-xs">
                Wine recommendations are suggestions based on classic pairing principles. 
                Personal taste preferences may vary.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Wine className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No recommendations available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}