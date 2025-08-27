// Utility for detecting conflicts between user input text and dietary preferences

interface ConflictResult {
  hasConflict: boolean;
  conflictingDietary: string[];
  conflictingIngredients: string[];
  message?: string;
}

// Define ingredients that conflict with each dietary preference
const dietaryConflicts = {
  vegan: [
    // Meat and poultry
    'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'goose', 'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'prosciutto', 'chorizo',
    // Seafood
    'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawns', 'lobster', 'crab', 'mussels', 'clams', 'oysters', 'scallops', 'squid', 'octopus', 'anchovy', 'sardines', 'mackerel', 'halibut', 'sole', 'trout', 'sea bass', 'monkfish', 'haddock', 'plaice', 'seafood', 'paella',
    // Dairy
    'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'mozzarella', 'parmesan', 'cheddar', 'brie', 'feta', 'goats cheese', 'ricotta', 'mascarpone', 'crème fraîche', 'sour cream', 'whipped cream', 'ice cream', 'dairy',
    // Eggs and egg products
    'egg', 'eggs', 'mayonnaise', 'mayo', 'meringue', 'custard', 'quiche',
    // Animal-derived ingredients
    'honey', 'gelatin', 'gelatine', 'lard', 'suet', 'bone marrow'
  ],
  vegetarian: [
    // Meat and poultry
    'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'goose', 'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'prosciutto', 'chorizo',
    // Seafood and fish
    'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawns', 'lobster', 'crab', 'mussels', 'clams', 'oysters', 'scallops', 'squid', 'octopus', 'anchovy', 'sardines', 'mackerel', 'halibut', 'sole', 'trout', 'sea bass', 'monkfish', 'haddock', 'plaice', 'seafood', 'paella',
    // Animal-derived ingredients that vegetarians typically avoid
    'gelatin', 'gelatine', 'lard', 'suet', 'bone marrow'
  ],
  pescatarian: [
    // Meat and poultry (but fish is OK)
    'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'goose', 'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'prosciutto', 'chorizo',
    // Animal-derived ingredients from land animals
    'lard', 'suet', 'bone marrow'
  ],
  'gluten-free': [
    'wheat', 'flour', 'bread', 'pasta', 'noodles', 'barley', 'rye', 'oats', 'bulgur', 'couscous', 'semolina', 'spelt', 'farro', 'kamut', 'triticale', 'seitan', 'soy sauce', 'beer', 'ale', 'lager', 'malt', 'biscuit', 'biscuits', 'cake', 'cookies', 'crackers', 'croissant', 'bagel', 'muffin', 'pancake', 'waffle', 'pizza', 'breadcrumb', 'breadcrumbs'
  ],
  'dairy-free': [
    'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'mozzarella', 'parmesan', 'cheddar', 'brie', 'feta', 'goats cheese', 'ricotta', 'mascarpone', 'crème fraîche', 'sour cream', 'whipped cream', 'ice cream', 'dairy', 'lactose'
  ],
  'nut-free': [
    'almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans', 'cashew', 'cashews', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts', 'brazil nut', 'brazil nuts', 'macadamia', 'pine nut', 'pine nuts', 'peanut', 'peanuts', 'peanut butter', 'nutella', 'marzipan', 'nougat', 'praline'
  ]
};

export function detectDietaryConflicts(
  userInput: string, 
  selectedDietary: string[]
): ConflictResult {
  const inputLower = userInput.toLowerCase();
  const conflicts: string[] = [];
  const conflictingIngredients: string[] = [];

  // Check each selected dietary preference for conflicts
  for (const dietary of selectedDietary) {
    const conflictingItems = dietaryConflicts[dietary as keyof typeof dietaryConflicts];
    if (conflictingItems) {
      const foundConflicts = conflictingItems.filter(item => {
        // Use word boundaries to avoid false positives
        const regex = new RegExp(`\\b${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(inputLower);
      });
      
      if (foundConflicts.length > 0) {
        conflicts.push(dietary);
        conflictingIngredients.push(...foundConflicts);
      }
    }
  }

  const hasConflict = conflicts.length > 0;
  let message = '';

  if (hasConflict) {
    const uniqueIngredients = Array.from(new Set(conflictingIngredients));
    const ingredientsList = uniqueIngredients.slice(0, 3).join(', '); // Show first 3 ingredients
    const moreSuffix = uniqueIngredients.length > 3 ? ` and ${uniqueIngredients.length - 3} more` : '';
    
    message = `Your recipe contains ${ingredientsList}${moreSuffix}, which conflicts with ${conflicts.join(' and ')} dietary preferences. We've turned off the conflicting toggles.`;
  }

  return {
    hasConflict,
    conflictingDietary: conflicts,
    conflictingIngredients: Array.from(new Set(conflictingIngredients)),
    message
  };
}

export function getConflictWarningMessage(conflictingDietary: string[], conflictingIngredients: string[]): string {
  const uniqueIngredients = Array.from(new Set(conflictingIngredients));
  const ingredientsList = uniqueIngredients.slice(0, 3).join(', ');
  const moreSuffix = uniqueIngredients.length > 3 ? ` and ${uniqueIngredients.length - 3} more` : '';
  
  return `Your recipe contains ${ingredientsList}${moreSuffix}, which conflicts with ${conflictingDietary.join(' and ')} dietary preferences. We've automatically turned off the conflicting toggles so you can proceed with your recipe.`;
}