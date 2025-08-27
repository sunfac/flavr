import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Clock, ChefHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SubRecipe {
  ingredients: string[];
  instructions: string[];
}

interface SubRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeName: string;
  subRecipe: SubRecipe;
  onBack: () => void;
}

export default function SubRecipeModal({
  isOpen,
  onClose,
  recipeName,
  subRecipe,
  onBack
}: SubRecipeModalProps) {
  const [servings, setServings] = useState(2);

  const scaleIngredient = (ingredient: string, scaleFactor: number): string => {
    // Simple scaling logic - extract numbers and scale them
    return ingredient.replace(/(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/g, (match, amount, unit) => {
      const scaledAmount = (parseFloat(amount) * scaleFactor).toFixed(amount.includes('.') ? 1 : 0);
      return `${scaledAmount}${unit ? ` ${unit}` : ''}`;
    });
  };

  const scaleFactor = servings / 2; // Assuming base servings of 2

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-slate-900 border-slate-700">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-1 h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <DialogTitle className="text-xl text-white font-semibold">
                {recipeName}
              </DialogTitle>
              <Badge variant="secondary" className="mt-1 bg-orange-500/20 text-orange-200 border-orange-500/40">
                <ChefHat className="w-3 h-3 mr-1" />
                Sub-Recipe
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto space-y-6">
          {/* Servings Control */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Servings:</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="h-8 w-8 p-0 border-slate-600 hover:border-orange-400/50 hover:bg-orange-500/10"
              >
                -
              </Button>
              <span className="min-w-[2ch] text-center text-white font-medium">
                {servings}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setServings(servings + 1)}
                className="h-8 w-8 p-0 border-slate-600 hover:border-orange-400/50 hover:bg-orange-500/10"
              >
                +
              </Button>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Ingredients */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>Ingredients</span>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {subRecipe.ingredients.length}
              </Badge>
            </h3>
            <div className="space-y-2">
              {subRecipe.ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-xs text-orange-300 font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-slate-200 flex-1">
                    {scaleIngredient(ingredient, scaleFactor)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>Instructions</span>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {subRecipe.instructions.length} steps
              </Badge>
            </h3>
            <div className="space-y-4">
              {subRecipe.instructions.map((instruction, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm text-white font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed flex-1">
                    {instruction}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
          <Button variant="outline" onClick={onBack} className="border-slate-600 hover:border-orange-400/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main Recipe
          </Button>
          <Button onClick={onClose} className="bg-orange-500 hover:bg-orange-600">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}