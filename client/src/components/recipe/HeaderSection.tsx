import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, ChefHat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { animations, spacing } from '@/styles/tokens';

interface HeaderSectionProps {
  recipe: {
    title: string;
    description?: string;
    cookTime: number;
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
  const fastFacts = useMemo(() => [
    { icon: Clock, label: `${recipe.cookTime}min`, value: 'time' },
    { icon: Users, label: `Serves ${currentServings}`, value: 'servings' },
    { icon: ChefHat, label: recipe.difficulty, value: 'difficulty' },
  ], [recipe.cookTime, currentServings, recipe.difficulty]);

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
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Minimal overlay for mobile readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:bg-black/30" />
            
            {/* Mobile: Only title overlay, Desktop: Title + description overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6 text-white">
              <h1 className="font-bold mb-1 sm:mb-2 text-shadow-lg text-lg sm:text-xl md:text-2xl lg:text-3xl leading-tight break-words hyphens-auto text-wrap-balance">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-white/90 text-shadow text-xs sm:text-sm md:text-base leading-relaxed break-words line-clamp-2 sm:line-clamp-3">
                  {recipe.description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-[16/10] sm:aspect-video bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden flex items-center justify-center">
            <div className="text-center p-6 text-white">
              <h1 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl leading-tight break-words mb-2">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-white/90 text-sm md:text-base leading-relaxed break-words">
                  {recipe.description}
                </p>
              )}
              <div className="mt-4 text-xs text-white/60">
                Image loading...
              </div>
            </div>
          </div>
        )}
        

      </div>

      {/* Mobile Description - Show full description below image on mobile */}
      {recipe.description && (
        <div className="block sm:hidden p-3 bg-slate-800/50">
          <p className="text-slate-200 text-sm leading-relaxed">
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