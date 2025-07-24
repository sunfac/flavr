// UK English ingredient terminology mappings for recipe generation
// This ensures all generated recipes use proper British ingredient names

export const ukIngredientMappings = {
  // Vegetables
  'bell pepper': 'pepper',
  'bell peppers': 'peppers',
  'red bell pepper': 'red pepper',
  'green bell pepper': 'green pepper',
  'eggplant': 'aubergine',
  'eggplants': 'aubergines',
  'zucchini': 'courgette',
  'zucchinis': 'courgettes',
  'arugula': 'rocket',
  'cilantro': 'coriander',
  'scallions': 'spring onions',
  'green onions': 'spring onions',
  
  // Herbs & Spices
  'chili': 'chilli',
  'chili pepper': 'chilli pepper',
  'chili peppers': 'chilli peppers',
  'chili flakes': 'chilli flakes',
  'chili powder': 'chilli powder',
  'hot pepper': 'hot chilli',
  'hot peppers': 'hot chillies',
  
  // Grains & Starches
  'all-purpose flour': 'plain flour',
  'whole wheat flour': 'wholemeal flour',
  'graham crackers': 'digestive biscuits',
  'cookies': 'biscuits',
  'cookie': 'biscuit',
  
  // Dairy & Proteins
  'heavy cream': 'double cream',
  'heavy whipping cream': 'double cream',
  'half and half': 'single cream',
  'half-and-half': 'single cream',
  'ground beef': 'beef mince',
  'ground lamb': 'lamb mince',
  'ground pork': 'pork mince',
  'ground turkey': 'turkey mince',
  'ground chicken': 'chicken mince',
  
  // Condiments & Pantry
  'ketchup': 'tomato ketchup',
  'molasses': 'black treacle',
  'confectioners sugar': 'icing sugar',
  'confectioner\'s sugar': 'icing sugar',
  'powdered sugar': 'icing sugar',
  'corn syrup': 'golden syrup',
  'superfine sugar': 'caster sugar',
  'granulated sugar': 'caster sugar',
  
  // Measurements - common US to UK conversions
  'cup': '240ml',
  '1 cup': '240ml',
  'cups': 'ml',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'ounce': 'oz',
  'ounces': 'oz',
  'pound': 'lb',
  'pounds': 'lbs'
};

export const ukMeasurementMappings = {
  // Volume conversions (US to UK)
  '1 cup': '240ml',
  '3/4 cup': '180ml',
  '2/3 cup': '160ml',
  '1/2 cup': '120ml',
  '1/3 cup': '80ml',
  '1/4 cup': '60ml',
  '1 tablespoon': '1 tbsp',
  '1 teaspoon': '1 tsp',
  
  // Weight stays the same but use metric preference
  '1 pound': '450g',
  '1/2 pound': '225g',
  '1 ounce': '30g',
  
  // Temperature
  'fahrenheit': 'celsius',
  '°F': '°C',
  'degrees F': '°C'
};

// Function to convert ingredient text to UK English
export function convertToUKIngredients(text: string): string {
  let converted = text;
  
  // Apply ingredient mappings
  Object.entries(ukIngredientMappings).forEach(([us, uk]) => {
    // Case-insensitive replacement with word boundaries
    const regex = new RegExp(`\\b${us.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    converted = converted.replace(regex, uk);
  });
  
  return converted;
}

// Function to convert measurements to UK format
export function convertToUKMeasurements(text: string): string {
  let converted = text;
  
  // Apply measurement mappings
  Object.entries(ukMeasurementMappings).forEach(([us, uk]) => {
    const regex = new RegExp(`\\b${us.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    converted = converted.replace(regex, uk);
  });
  
  return converted;
}

// UK-specific recipe prompt additions
export const ukRecipePromptAdditions = {
  ingredientGuidance: `
Use British ingredient terminology and measurements:
- Use "aubergine" not "eggplant"
- Use "courgette" not "zucchini" 
- Use "pepper" not "bell pepper"
- Use "rocket" not "arugula"
- Use "coriander" not "cilantro"
- Use "spring onions" not "scallions"
- Use "chilli" not "chili"
- Use "plain flour" not "all-purpose flour"
- Use "double cream" not "heavy cream"
- Use "beef mince" not "ground beef"
- Use "tomato ketchup" not "ketchup"
- Use "icing sugar" not "powdered sugar"
- Use "caster sugar" not "superfine sugar"
- Use "biscuits" not "cookies"
`,
  
  measurementGuidance: `
Use metric measurements and UK portions:
- Use grams (g) and kilograms (kg) for weight
- Use millilitres (ml) and litres (l) for volume  
- Use tbsp and tsp for small amounts
- Use Celsius (°C) for temperatures
- Standard UK portion sizes
`,
  
  spellingsGuidance: `
Use British English spellings:
- "flavour" not "flavor"
- "colour" not "color"  
- "favourite" not "favorite"
- "realise" not "realize"
- "centre" not "center"
- "metre" not "meter"
- "litre" not "liter"
- "savoury" not "savory"
- "caramelise" not "caramelize"
- "tenderise" not "tenderize"
`
};