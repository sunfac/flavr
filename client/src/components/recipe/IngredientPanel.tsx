import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { animations } from '@/styles/tokens';

interface ScaledIngredient {
  id: string;
  text: string;
  checked: boolean;
}

interface IngredientPanelProps {
  ingredients: ScaledIngredient[];
  onToggle: (id: string) => void;
  className?: string;
}

export default function IngredientPanel({ 
  ingredients, 
  onToggle, 
  className = '' 
}: IngredientPanelProps) {
  return (
    <>
      {/* Desktop: Fixed Sidebar */}
      <div className={`hidden md:block ${className}`}>
        <div className="h-full overflow-y-auto bg-slate-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Ingredients ({ingredients.filter(i => !i.checked).length}/{ingredients.length})
          </h3>
          
          <div className="space-y-3">
            {ingredients.map((ingredient) => (
              <IngredientCheckboxItem
                key={ingredient.id}
                ingredient={ingredient}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Horizontal Scroll Chips */}
      <div className={`md:hidden ${className}`}>
        <div className="pb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 px-4">
            Ingredients ({ingredients.filter(i => !i.checked).length}/{ingredients.length})
          </h3>
          
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {ingredients.map((ingredient) => (
              <IngredientChip
                key={ingredient.id}
                ingredient={ingredient}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function IngredientCheckboxItem({ 
  ingredient, 
  onToggle 
}: { 
  ingredient: ScaledIngredient; 
  onToggle: (id: string) => void; 
}) {
  return (
    <motion.div
      className="flex items-start gap-3 group cursor-pointer"
      onClick={() => onToggle(ingredient.id)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      <Checkbox
        id={ingredient.id}
        checked={ingredient.checked}
        onCheckedChange={() => onToggle(ingredient.id)}
        className="mt-0.5 border-slate-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
      />
      
      <label
        htmlFor={ingredient.id}
        className={`text-sm cursor-pointer flex-1 transition-all duration-300 ${
          ingredient.checked 
            ? 'line-through opacity-40 text-slate-400' 
            : 'text-slate-200 group-hover:text-white'
        }`}
      >
        {ingredient.text}
      </label>
    </motion.div>
  );
}

function IngredientChip({ 
  ingredient, 
  onToggle 
}: { 
  ingredient: ScaledIngredient; 
  onToggle: (id: string) => void; 
}) {
  return (
    <motion.div
      className="flex-shrink-0"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <Badge
        variant={ingredient.checked ? "secondary" : "outline"}
        className={`
          relative px-3 py-2 cursor-pointer transition-all duration-300 whitespace-nowrap
          ${ingredient.checked 
            ? 'bg-orange-500/20 border-orange-400/30 text-orange-200 line-through opacity-60' 
            : 'bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50 hover:border-orange-400/50'
          }
        `}
        onClick={() => onToggle(ingredient.id)}
      >
        {ingredient.checked && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Check className="w-4 h-4 text-orange-400" />
          </motion.div>
        )}
        
        <span className={ingredient.checked ? 'invisible' : ''}>
          {ingredient.text}
        </span>
      </Badge>
    </motion.div>
  );
}