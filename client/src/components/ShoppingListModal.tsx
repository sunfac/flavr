import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, ShoppingCart, Apple, Beef, Milk, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface IngredientItem {
  name: string;
  quantity?: string;
  unit?: string;
  originalText: string;
}

interface CategorizedIngredients {
  produce: IngredientItem[];
  meat: IngredientItem[];
  dairy: IngredientItem[];
  pantry: IngredientItem[];
  spices: IngredientItem[];
  other: IngredientItem[];
}

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingList: string[];
  weekStartDate?: string;
}

// Ingredient categorization mapping
const INGREDIENT_CATEGORIES = {
  produce: [
    'onion', 'onions', 'garlic', 'tomato', 'tomatoes', 'potato', 'potatoes', 'carrot', 'carrots',
    'celery', 'bell pepper', 'peppers', 'mushroom', 'mushrooms', 'lettuce', 'spinach', 'herbs',
    'parsley', 'cilantro', 'basil', 'thyme', 'rosemary', 'lemon', 'lemons', 'lime', 'limes',
    'apple', 'apples', 'banana', 'bananas', 'avocado', 'avocados', 'ginger', 'cucumber',
    'zucchini', 'broccoli', 'cauliflower', 'cabbage', 'corn', 'peas', 'beans', 'sprouts',
    'scallion', 'scallions', 'green onion', 'green onions', 'chili', 'chilies', 'jalapeno',
    'kale', 'arugula', 'chard', 'beets', 'radish', 'turnip', 'squash', 'pumpkin', 'eggplant'
  ],
  meat: [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'bacon', 'sausage', 'ham', 'ground beef',
    'ground chicken', 'ground turkey', 'pork chops', 'chicken thighs', 'chicken breast',
    'beef steak', 'ribeye', 'sirloin', 'tenderloin', 'brisket', 'ribs', 'fish', 'salmon',
    'tuna', 'cod', 'shrimp', 'prawns', 'crab', 'lobster', 'mussels', 'clams', 'scallops',
    'tilapia', 'halibut', 'trout', 'sea bass', 'anchovy', 'sardines', 'mackerel'
  ],
  dairy: [
    'milk', 'butter', 'cheese', 'cream', 'yogurt', 'sour cream', 'cottage cheese', 'ricotta',
    'mozzarella', 'cheddar', 'parmesan', 'feta', 'goat cheese', 'cream cheese', 'heavy cream',
    'half and half', 'buttermilk', 'eggs', 'egg', 'egg whites', 'egg yolks'
  ],
  pantry: [
    'flour', 'sugar', 'brown sugar', 'salt', 'rice', 'pasta', 'bread', 'oil', 'olive oil',
    'vegetable oil', 'coconut oil', 'vinegar', 'balsamic vinegar', 'soy sauce', 'honey',
    'maple syrup', 'vanilla', 'baking powder', 'baking soda', 'cornstarch', 'breadcrumbs',
    'oats', 'quinoa', 'barley', 'lentils', 'chickpeas', 'black beans', 'kidney beans',
    'canned tomatoes', 'tomato paste', 'tomato sauce', 'coconut milk', 'broth', 'stock',
    'chicken stock', 'vegetable stock', 'beef stock', 'wine', 'beer', 'nuts', 'almonds',
    'walnuts', 'pecans', 'pine nuts', 'sesame seeds', 'sunflower seeds', 'raisins'
  ],
  spices: [
    'pepper', 'black pepper', 'white pepper', 'paprika', 'cumin', 'coriander', 'turmeric',
    'cinnamon', 'nutmeg', 'cloves', 'cardamom', 'bay leaves', 'oregano', 'sage', 'dill',
    'chili powder', 'cayenne', 'red pepper flakes', 'garlic powder', 'onion powder',
    'italian seasoning', 'herbs de provence', 'curry powder', 'garam masala', 'smoked paprika',
    'vanilla extract', 'almond extract', 'lemon extract', 'mustard', 'dijon mustard',
    'worcestershire', 'hot sauce', 'sriracha', 'sesame oil', 'fish sauce', 'miso paste'
  ]
};

const CATEGORY_ICONS = {
  produce: Apple,
  meat: Beef,
  dairy: Milk,
  pantry: Package,
  spices: Package,
  other: Package
} as const;

const CATEGORY_COLORS = {
  produce: "bg-green-500/20 text-green-400 border-green-500/30",
  meat: "bg-red-500/20 text-red-400 border-red-500/30",
  dairy: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pantry: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  spices: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30"
} as const;

export default function ShoppingListModal({ isOpen, onClose, shoppingList, weekStartDate }: ShoppingListModalProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const { toast } = useToast();

  // Categorize ingredients
  const categorizeIngredients = (ingredients: string[]): CategorizedIngredients => {
    const categorized: CategorizedIngredients = {
      produce: [],
      meat: [],
      dairy: [],
      pantry: [],
      spices: [],
      other: []
    };

    ingredients.forEach(ingredient => {
      const lowerIngredient = ingredient.toLowerCase();
      let categorized_flag = false;

      // Check each category
      Object.entries(INGREDIENT_CATEGORIES).forEach(([category, keywords]) => {
        if (!categorized_flag) {
          const matches = keywords.some((keyword: string) => 
            lowerIngredient.includes(keyword.toLowerCase())
          );
          
          if (matches) {
            categorized[category as keyof CategorizedIngredients].push({
              name: ingredient,
              originalText: ingredient
            });
            categorized_flag = true;
          }
        }
      });

      // If no category found, add to 'other'
      if (!categorized_flag) {
        categorized.other.push({
          name: ingredient,
          originalText: ingredient
        });
      }
    });

    return categorized;
  };

  const categorizedIngredients = categorizeIngredients(shoppingList);

  // Generate formatted text for clipboard
  const generateClipboardText = (): string => {
    const dateString = weekStartDate 
      ? new Date(weekStartDate).toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        })
      : new Date().toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        });

    let text = `FLAVR SHOPPING LIST\nWeek of ${dateString}\n\n`;

    Object.entries(categorizedIngredients).forEach(([category, ingredients]) => {
      if (ingredients.length > 0) {
        text += `${category.toUpperCase()}\n`;
        ingredients.forEach((ingredient: IngredientItem) => {
          text += `• ${ingredient.name}\n`;
        });
        text += '\n';
      }
    });

    text += '✨ Generated by Flavr - Your AI Cooking Assistant';
    return text;
  };

  const handleCopyToClipboard = async () => {
    try {
      const clipboardText = generateClipboardText();
      await navigator.clipboard.writeText(clipboardText);
      
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
      
      toast({
        title: "Shopping List Copied!",
        description: `${shoppingList.length} ingredients organized and copied to clipboard.`,
      });
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getTotalIngredients = () => {
    return Object.values(categorizedIngredients).reduce((total, items) => total + items.length, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-orange-400" />
            Weekly Shopping List
            <Badge variant="outline" className="ml-auto border-orange-500 text-orange-400">
              {getTotalIngredients()} items
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleCopyToClipboard}
              className={`px-6 py-2 text-white transition-all duration-200 ${
                copiedToClipboard 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
              data-testid="button-copy-shopping-list"
            >
              {copiedToClipboard ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>

          {/* Categorized Lists */}
          <ScrollArea className="h-96">
            <div className="space-y-4 pr-4">
              {Object.entries(categorizedIngredients).map(([category, ingredients]) => {
                if (ingredients.length === 0) return null;
                
                const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
                const colorClasses = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];

                return (
                  <Card key={category} className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-lg capitalize flex items-center gap-2">
                        <Icon className="w-5 h-5 text-orange-400" />
                        {category}
                        <Badge 
                          variant="outline" 
                          className={`ml-auto ${colorClasses}`}
                          data-testid={`badge-${category}-count`}
                        >
                          {ingredients.length} items
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ingredients.map((ingredient: IngredientItem, index: number) => (
                          <div 
                            key={`${category}-${index}`}
                            className="flex items-center space-x-2 py-1"
                            data-testid={`ingredient-${category}-${index}`}
                          >
                            <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                            <span className="text-slate-300 text-sm">
                              {ingredient.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer Info */}
          <div className="text-center text-slate-400 text-xs border-t border-slate-700 pt-4">
            <p>Organized by grocery store sections for easier shopping</p>
            <p className="text-slate-500">
              Week of {weekStartDate 
                ? new Date(weekStartDate).toLocaleDateString('en-GB', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })
                : new Date().toLocaleDateString('en-GB', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}