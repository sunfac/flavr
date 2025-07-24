import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChefHat, Clock, RotateCcw, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { animations, spacing } from '@/styles/tokens';

interface HeaderSectionProps {
  recipe: {
    title: string;
    description?: string;
    cookTime: number | string;
    servings: number;
    difficulty: string;
    cuisine?: string;
    image?: string;
  };
  currentServings: number;
  onServingsChange?: (servings: number) => void;
}

export default function HeaderSection({ 
  recipe, 
  currentServings
}: HeaderSectionProps) {
  const [location, navigate] = useLocation();
  
  const fastFacts = useMemo(() => {
    return [
      { icon: Users, label: `Serves ${currentServings}`, value: 'servings' },
      { icon: Clock, label: `${recipe.cookTime} min`, value: 'timer' },
    ];
  }, [currentServings, recipe.cookTime]);

  const handleStartAgain = () => {
    navigate('/app');
  };

  return (
    <div className="relative">
      {/* Recipe header anchor for scroll targeting */}
      <div id="recipe-header-top"></div>
      
      {/* Hero Image - Mobile First Design */}
      <div className="relative w-full">
        {/* Main Image Display */}
        {recipe.image ? (
          <div className="relative w-full aspect-[16/10] sm:aspect-video bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden">
            <img 
              src={recipe.image} 
              alt={recipe.title}
              className="w-full h-full object-cover"
              loading="eager"
              style={{ objectPosition: 'center' }}
              onLoad={() => {
                // Scroll to absolute top after image loads
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
              }}
              onError={(e) => {
                console.log('❌ Image failed to load:', recipe.image);
                // Don't hide the image container, just show fallback
                e.currentTarget.style.display = 'none';
                // Show the fallback gradient container
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.style.background = 'linear-gradient(to bottom right, #fb923c, #ea580c)';
                }
              }}
            />
            {/* Minimal overlay for mobile readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:bg-black/30" />
            
            {/* Mobile: Only title overlay, Desktop: Title + description overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6 text-white">
              <h1 className="font-bold mb-1 sm:mb-2 text-shadow-lg text-lg sm:text-xl md:text-2xl lg:text-3xl leading-tight break-words hyphens-auto text-wrap-balance">
                {recipe.title}
              </h1>
            </div>
            
            {/* Action Buttons - Top Right */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
              <Button
                onClick={handleStartAgain}
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Again
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <Heart className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-[16/10] sm:aspect-video bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden flex items-center justify-center">
            <div className="text-center p-6 text-white">
              <h1 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl leading-tight break-words mb-2">
                {recipe.title}
              </h1>
              <div className="mt-4 text-xs text-white/60 animate-pulse">
                ✨ Generating beautiful food image...
              </div>
            </div>
            
            {/* Action Buttons - Top Right (for no image state) */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
              <Button
                onClick={handleStartAgain}
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Again
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              >
                <Heart className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        )}
        

      </div>

      {/* Description - Show full description below image on all devices */}
      {recipe.description && (
        <div className="p-3 sm:p-4 bg-slate-800/50">
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
            {recipe.description}
          </p>
        </div>
      )}

      {/* Fast Facts & Serving Controls */}
      <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-sm">
        {/* Fast Facts Chips - Mobile Responsive */}
        <div className="flex items-center gap-2 md:gap-3 mb-4 flex-wrap">
          {fastFacts.map((fact, index) => {
            const IconComponent = fact.icon;
            return (
              <Badge
                key={index}
                variant="outline"
                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 transition-colors text-xs md:text-sm whitespace-nowrap"
              >
                <IconComponent className="w-3 h-3 md:w-4 md:h-4" />
                <span className="font-medium">{fact.label}</span>
              </Badge>
            );
          })}
          {recipe.cuisine && (
            <Badge
              variant="outline"
              className="px-2 md:px-3 py-1 md:py-1.5 bg-orange-500/20 border-orange-400/30 text-orange-200 text-xs md:text-sm whitespace-nowrap"
            >
              {recipe.cuisine}
            </Badge>
          )}
        </div>

        {/* Servings Display - No Interactive Controls */}
        <div className="flex items-center justify-center">
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 px-4 py-2 text-lg border border-orange-400/30">
            Serves {currentServings}
          </Badge>
        </div>
      </div>
    </div>
  );
}