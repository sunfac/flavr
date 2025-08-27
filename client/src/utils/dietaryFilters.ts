// Dietary ingredient conflict detection and filtering

export interface DietaryConflicts {
  [dietary: string]: string[];
}

// Define ingredients that conflict with each dietary requirement
export const DIETARY_CONFLICTS: DietaryConflicts = {
  'vegan': [
    // Meat and poultry
    'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'bacon', 'ham', 'sausage', 'mince', 'steak',
    'chicken breast', 'chicken thigh', 'ground beef', 'pork chops', 'lamb chops', 'prosciutto',
    
    // Dairy
    'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'cheddar', 'mozzarella', 'parmesan',
    'cottage cheese', 'sour cream', 'heavy cream', 'double cream', 'single cream', 'crème fraîche',
    'ice cream', 'mascarpone', 'ricotta', 'feta', 'goat cheese', 'blue cheese',
    
    // Eggs
    'eggs', 'egg', 'egg whites', 'egg yolks',
    
    // Fish and seafood
    'fish', 'salmon', 'tuna', 'cod', 'prawns', 'shrimp', 'lobster', 'crab', 'mussels', 'oysters',
    'scallops', 'anchovies', 'sardines', 'mackerel', 'sea bass', 'haddock', 'trout',
    
    // Animal-derived products
    'honey', 'gelatin', 'gelatine', 'lard', 'suet'
  ],
  
  'vegetarian': [
    // Meat and poultry
    'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'bacon', 'ham', 'sausage', 'mince', 'steak',
    'chicken breast', 'chicken thigh', 'ground beef', 'pork chops', 'lamb chops', 'prosciutto',
    
    // Fish and seafood
    'fish', 'salmon', 'tuna', 'cod', 'prawns', 'shrimp', 'lobster', 'crab', 'mussels', 'oysters',
    'scallops', 'anchovies', 'sardines', 'mackerel', 'sea bass', 'haddock', 'trout',
    
    // Animal-derived products that aren't vegetarian
    'gelatin', 'gelatine', 'lard', 'suet'
  ],
  
  'gluten-free': [
    'wheat', 'flour', 'bread', 'pasta', 'noodles', 'spaghetti', 'linguine', 'penne', 'fusilli',
    'bread crumbs', 'breadcrumbs', 'pizza base', 'wraps', 'tortillas', 'bagels', 'croissants',
    'barley', 'rye', 'oats', 'bulgur', 'couscous', 'semolina', 'spelt', 'farro',
    'soy sauce', 'teriyaki sauce', 'malt vinegar', 'beer', 'ale', 'wheat flour', 'plain flour',
    'self-raising flour', 'wholemeal flour', 'strong bread flour'
  ],
  
  'dairy-free': [
    'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'cheddar', 'mozzarella', 'parmesan',
    'cottage cheese', 'sour cream', 'heavy cream', 'double cream', 'single cream', 'crème fraîche',
    'ice cream', 'mascarpone', 'ricotta', 'feta', 'goat cheese', 'blue cheese', 'brie', 'camembert'
  ],
  
  'nut-free': [
    'almonds', 'walnuts', 'pecans', 'cashews', 'pistachios', 'hazelnuts', 'brazil nuts',
    'pine nuts', 'macadamia nuts', 'peanuts', 'peanut butter', 'almond butter', 'cashew butter',
    'nutella', 'marzipan', 'almond milk', 'coconut milk', 'coconut', 'coconut oil'
  ],
  
  'low-carb': [
    'rice', 'pasta', 'bread', 'potatoes', 'sweet potatoes', 'noodles', 'quinoa', 'couscous',
    'bulgur', 'barley', 'oats', 'porridge', 'cereal', 'flour', 'sugar', 'honey', 'maple syrup',
    'bananas', 'grapes', 'mangoes', 'pineapple', 'dates', 'figs', 'raisins'
  ],
  
  'keto': [
    'rice', 'pasta', 'bread', 'potatoes', 'sweet potatoes', 'noodles', 'quinoa', 'couscous',
    'bulgur', 'barley', 'oats', 'porridge', 'cereal', 'flour', 'sugar', 'honey', 'maple syrup',
    'bananas', 'grapes', 'mangoes', 'pineapple', 'dates', 'figs', 'raisins', 'beans', 'lentils',
    'chickpeas', 'black beans', 'kidney beans', 'corn', 'carrots', 'beets', 'parsnips'
  ]
};

/**
 * Filter out ingredients that conflict with selected dietary requirements
 */
export function filterConflictingIngredients(
  ingredients: string[], 
  selectedDietary: string[]
): { 
  filteredIngredients: string[], 
  removedIngredients: string[] 
} {
  if (!selectedDietary.length) {
    return { filteredIngredients: ingredients, removedIngredients: [] };
  }

  const conflictingIngredients = new Set<string>();
  
  // Collect all conflicting ingredients for selected dietary requirements
  selectedDietary.forEach(dietary => {
    const conflicts = DIETARY_CONFLICTS[dietary] || [];
    conflicts.forEach(ingredient => conflictingIngredients.add(ingredient.toLowerCase()));
  });

  const filteredIngredients: string[] = [];
  const removedIngredients: string[] = [];

  ingredients.forEach(ingredient => {
    const normalizedIngredient = ingredient.toLowerCase().trim();
    
    // Check if this ingredient conflicts with any dietary requirement
    const hasConflict = Array.from(conflictingIngredients).some(conflictingItem => 
      normalizedIngredient.includes(conflictingItem) || conflictingItem.includes(normalizedIngredient)
    );

    if (hasConflict) {
      removedIngredients.push(ingredient);
    } else {
      filteredIngredients.push(ingredient);
    }
  });

  return { filteredIngredients, removedIngredients };
}

/**
 * Get a user-friendly message about removed ingredients
 */
export function getRemovedIngredientsMessage(
  removedIngredients: string[], 
  selectedDietary: string[]
): string {
  if (!removedIngredients.length) return '';
  
  const dietaryText = selectedDietary.join(', ');
  const ingredientText = removedIngredients.length === 1 
    ? `${removedIngredients[0]} was` 
    : `${removedIngredients.slice(0, -1).join(', ')} and ${removedIngredients.slice(-1)} were`;
    
  return `${ingredientText} removed as they conflict with your ${dietaryText} requirements.`;
}