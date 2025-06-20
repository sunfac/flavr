import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, ChefHat, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  onServingsChange: (servings: number) => void;
}

export default function HeaderSection({ 
  recipe, 
  currentServings, 
  onServingsChange 
}: HeaderSectionProps) {
  const [isServingSheetOpen, setIsServingSheetOpen] = useState(false);

  const fastFacts = [
    { icon: Clock, label: `${recipe.cookTime}min`, value: 'time' },
    { icon: Users, label: `Serves ${currentServings}`, value: 'servings' },
    { icon: ChefHat, label: recipe.difficulty, value: 'difficulty' },
  ];

  const handleServingsChange = (values: number[]) => {
    onServingsChange(values[0]);
  };

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
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-shadow-lg">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="text-sm md:text-base text-white/90 text-shadow">
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

        {/* Serving Controls */}
        <div className="flex items-center justify-between">
          {/* Desktop: Inline Slider */}
          <div className="hidden md:flex items-center gap-4 flex-1">
            <label className="text-sm font-medium text-slate-300 whitespace-nowrap">
              Adjust servings:
            </label>
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <span className="text-sm text-slate-400 w-8 text-center">1</span>
              <Slider
                value={[currentServings]}
                onValueChange={handleServingsChange}
                min={1}
                max={12}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-slate-400 w-8 text-center">12</span>
            </div>
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 px-3 py-1">
              {currentServings} servings
            </Badge>
          </div>

          {/* Mobile: Collapsible Sheet */}
          <div className="md:hidden w-full">
            <Sheet open={isServingSheetOpen} onOpenChange={setIsServingSheetOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Adjust servings ({currentServings})
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-slate-800 border-slate-600">
                <SheetHeader>
                  <SheetTitle className="text-white">Adjust Servings</SheetTitle>
                </SheetHeader>
                <div className="py-6">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-sm text-slate-400 w-8 text-center">1</span>
                    <Slider
                      value={[currentServings]}
                      onValueChange={handleServingsChange}
                      min={1}
                      max={12}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-slate-400 w-8 text-center">12</span>
                  </div>
                  <div className="text-center">
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 px-4 py-2 text-lg">
                      {currentServings} servings
                    </Badge>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}