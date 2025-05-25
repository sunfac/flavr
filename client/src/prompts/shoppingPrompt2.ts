export function generateShoppingPrompt2(selectedRecipe: any, quizData: any): string {
  return `You are a professional chef creating a complete, detailed recipe. The user has selected "${selectedRecipe.title}" from your suggestions.

Original Recipe Concept: ${selectedRecipe.title}
Description: ${selectedRecipe.description}
User's Original Preferences:
- Mood: ${quizData.mood}
- Cuisine: ${quizData.cuisine}
- Cooking Time: ${quizData.cookingTime} minutes
- Budget: ${quizData.budget}
- Diet: ${quizData.diet || "No restrictions"}

Create a complete, detailed recipe that:
1. Matches the selected recipe concept exactly
2. Stays within the time and budget constraints
3. Includes precise measurements and clear instructions
4. Provides helpful cooking tips
5. Generates a practical shopping list

Respond with a JSON object in this format:
{
  "title": "Complete Recipe Title",
  "description": "Detailed appetizing description",
  "cookTime": number (in minutes),
  "servings": number,
  "difficulty": "easy|medium|hard",
  "cuisine": "cuisine type",
  "ingredients": [
    "1 lb chicken breast, boneless and skinless",
    "2 cups jasmine rice",
    "1 large yellow onion, diced"
  ],
  "instructions": [
    "Detailed step 1 with specific techniques and timing",
    "Detailed step 2 with temperature and visual cues",
    "Detailed step 3 with finishing touches"
  ],
  "tips": "Professional chef tip for best results",
  "shoppingList": [
    "1 lb chicken breast",
    "2 cups jasmine rice",
    "1 yellow onion",
    "Olive oil",
    "Salt and pepper"
  ]
}

Make the recipe clear, detailed, and foolproof. Include specific cooking techniques, temperatures, and timing. The shopping list should be organized and practical for grocery shopping.`;
}
