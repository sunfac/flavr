export function generateFridgePrompt1(quizData: any): string {
  const getFlexibilityText = (flexibility: string) => {
    if (flexibility === 'flexible') {
      return `Ingredient Flexibility: You may add 2-4 additional complementary ingredients to enhance the dish. Choose ingredients that pair naturally with what's available and improve the overall flavor or texture. Be thoughtful about your additions - they should feel natural and accessible.`;
    } else {
      return `Ingredient Flexibility: Use ONLY the ingredients listed by the user plus standard pantry staples (salt, pepper, oil, vinegar, basic herbs/spices). Do not add any other ingredients beyond these basics.`;
    }
  };
  
  const flexibilityText = getFlexibilityText(quizData.ingredientFlexibility || 'strict');
  
  return `You are a creative chef specializing in "fridge to fork" cooking. Generate 3-6 diverse recipe ideas using the ingredients the user has available.

Available Ingredients: ${Array.isArray(quizData.ingredients) ? quizData.ingredients.join(', ') : quizData.ingredients}

${flexibilityText}

User Preferences:
- Style: ${quizData.vibe || quizData.mood}
- Cuisine: ${Array.isArray(quizData.cuisines) ? quizData.cuisines.join(', ') : quizData.cuisines || 'Any'}
- Equipment: ${Array.isArray(quizData.equipment) ? quizData.equipment.join(', ') : quizData.equipment}
- Cooking Time: ${quizData.time || quizData.cookingTime} minutes
- Servings: ${quizData.servings} people
- Dietary Requirements: ${Array.isArray(quizData.dietary) ? quizData.dietary.join(', ') : quizData.dietary || 'None'}
- Ambition Level: ${quizData.ambition || "Moderate"}

Generate recipe ideas that:
1. Follow the ingredient flexibility guidelines above
2. Match the user's preferred cooking style
3. Can be completed with their available equipment
4. Fit within the time constraints
5. Offer creative ways to combine the available ingredients

Respond with a JSON object in this format:
{
  "recipes": [
    {
      "title": "Creative Recipe Name",
      "description": "Brief description highlighting the main ingredients",
      "cookTime": number (in minutes),
      "difficulty": "easy|medium|hard",
      "mainIngredients": ["ingredient1", "ingredient2", "ingredient3"],
      "cookingMethod": "primary cooking technique",
      "mood": "style tag"
    }
  ]
}

Be creative with combinations and cooking techniques. Focus on maximizing flavor from the available ingredients. Each recipe should be distinctly different in preparation method or flavor profile.`;
}
