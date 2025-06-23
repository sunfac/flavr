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
      {/* Hero Image */}
      <div 
        className="relative w-full aspect-video bg-gradient-to-br from-orange-400 to-orange-600 rounded-t-xl overflow-hidden"
        style={{
          backgroundImage: recipe.image ? `url(${recipe.image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Recipe Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="font-bold mb-2 text-shadow-lg" style={{ fontSize: 'var(--step-3)' }}>
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-white/90 text-shadow" style={{ fontSize: 'var(--step-0)' }}>
              {recipe.description}
            </p>
          )}
        </div>
      </div>

      {/* Fast Facts & Serving Controls */}
      <div className="p-4 md:p-6 bg-slate-800/50 backdrop-blur-sm">
        {/* Fast Facts Chips */}
        <div className="flex items-center gap-3 mb-4">
          {fastFacts.map((fact, index) => {
            const IconComponent = fact.icon;
            return (
              <Badge
                key={index}
                variant="outline"
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 transition-colors"
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{fact.label}</span>
              </Badge>
            );
          })}
          {recipe.cuisine && (
            <Badge
              variant="outline"
              className="px-3 py-1.5 bg-orange-500/20 border-orange-400/30 text-orange-200"
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