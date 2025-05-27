export function generateFridgePrompt2(selectedRecipe: any, quizData: any): string {
  const getFlexibilityText = (flexibility: string) => {
    if (flexibility === 'flexible') {
      return `Ingredient Flexibility: You may add 2-4 additional complementary ingredients to enhance the dish. Choose ingredients that pair naturally with what's available and improve the overall flavor or texture. Be thoughtful about your additions - they should feel natural and accessible.`;
    } else {
      return `Ingredient Flexibility: Use ONLY the ingredients listed by the user plus standard pantry staples (salt, pepper, oil, vinegar, basic herbs/spices). Do not add any other ingredients beyond these basics.`;
    }
  };
  
  const flexibilityText = getFlexibilityText(quizData.ingredientFlexibility || 'strict');
  
  return `You are a professional chef creating a complete recipe using the user's available ingredients. The user has selected "${selectedRecipe.title}" from your suggestions.

Selected Recipe: ${selectedRecipe.title}
Description: ${selectedRecipe.description}
Available Ingredients: ${Array.isArray(quizData.ingredients) ? quizData.ingredients.join(', ') : quizData.ingredients}

${flexibilityText}

User's Preferences:
- Style: ${quizData.vibe || quizData.mood}
- Cuisine: ${Array.isArray(quizData.cuisines) ? quizData.cuisines.join(', ') : quizData.cuisines || 'Any'}
- Equipment: ${Array.isArray(quizData.equipment) ? quizData.equipment.join(', ') : quizData.equipment}
- Cooking Time: ${quizData.time || quizData.cookingTime} minutes
- Servings: ${quizData.servings} people
- Dietary Requirements: ${Array.isArray(quizData.dietary) ? quizData.dietary.join(', ') : quizData.dietary || 'None'}
- Ambition Level: ${quizData.ambition || "Moderate"}

Create a complete recipe that:
1. Follows the ingredient flexibility guidelines above
2. Matches the selected recipe concept exactly
3. Provides detailed, clear instructions with specific timings
4. Maximizes flavor from available ingredients

Respond with a JSON object in this format:
{
  "title": "Complete Recipe Title",
  "description": "Detailed description of the finished dish",
  "cookTime": number (in minutes),
  "servings": number,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    "Specific amount + ingredient from user's list",
    "Another specific measurement",
    "Basic pantry items if needed (salt, pepper, oil)"
  ],
  "instructions": [
    "Detailed step 1 with specific techniques",
    "Detailed step 2 with timing and visual cues",
    "Step 3 with finishing techniques"
  ],
  "tips": "Chef's tip for maximizing flavor with these specific ingredients"
}

Focus on proper technique and timing to create the most delicious result possible with the available ingredients. Be specific about measurements and cooking methods.`;
}
