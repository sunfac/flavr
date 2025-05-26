export function generateFridgePrompt2(selectedRecipe: any, quizData: any): string {
  return `You are a professional chef creating a complete recipe using only available ingredients. The user has selected "${selectedRecipe.title}" from your suggestions.

Selected Recipe: ${selectedRecipe.title}
Description: ${selectedRecipe.description}
Available Ingredients: ${Array.isArray(quizData.ingredients) ? quizData.ingredients.join(', ') : quizData.ingredients}

User's Preferences:
- Style: ${quizData.vibe || quizData.mood}
- Cuisine: ${Array.isArray(quizData.cuisines) ? quizData.cuisines.join(', ') : quizData.cuisines || 'Any'}
- Equipment: ${Array.isArray(quizData.equipment) ? quizData.equipment.join(', ') : quizData.equipment}
- Cooking Time: ${quizData.time || quizData.cookingTime} minutes
- Servings: ${quizData.servings} people
- Dietary Requirements: ${Array.isArray(quizData.dietary) ? quizData.dietary.join(', ') : quizData.dietary || 'None'}
- Ambition Level: ${quizData.ambition || "Moderate"}

Create a complete recipe that:
1. Uses ONLY the available ingredients (plus basic pantry staples)
2. Matches the selected recipe concept
3. Provides detailed, clear instructions
4. Maximizes flavor from available ingredients
5. Requires NO additional shopping

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
