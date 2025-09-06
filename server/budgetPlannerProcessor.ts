import OpenAI from "openai";
import { 
  FLAVOR_MAXIMIZATION_CORE, 
  FLAVOR_BALANCE_REQUIREMENTS, 
  UK_CONSUMER_FLAVOR_PREFERENCES, 
  PROFESSIONAL_TECHNIQUE_INTEGRATION 
} from "./flavorMaximizationPrompts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BudgetPlannerInputs {
  dinners: number;
  lunches: number;
  kidsdinners: number;
  servings: number;
  supermarket: string;
  dietaryRestrictions: string;
  cuisinePreferences: string;
  difficultyLevel: string;
  timeConstraints: string;
  budget: string;
}

export interface BudgetPlannerResult {
  complete: boolean;
  response: string;
  shoppingList?: string;
  mealPlan?: string;
  recipes?: string;
  stage?: 'questions' | 'confirmation' | 'shopping-list' | 'meal-plan' | 'recipes' | 'complete';
}

const BUDGET_PLANNER_SYSTEM_PROMPT = `You are Flavr's Budget Planner Mode, an elite AI culinary assistant dedicated to creating high-quality, budget-conscious weekly meal plans for families. Your mission is to:

${FLAVOR_MAXIMIZATION_CORE}

${FLAVOR_BALANCE_REQUIREMENTS}

${UK_CONSUMER_FLAVOR_PREFERENCES}

${PROFESSIONAL_TECHNIQUE_INTEGRATION}

- Collect user inputs on number of meals, servings, supermarket, dietary restrictions, cuisine preferences, and budget.
- Build a supermarket-specific shopping list optimised for budget, availability, and minimal waste.
- Generate a meal plan assigning meals to days with variety and global inspiration matching user preferences.
- Produce authentic, chef-level recipes reflecting traditional techniques, practical for home cooks, yet elevated in flavour and quality.

You must:
✅ MAXIMIZE BUDGET USAGE: Allocate the full stated budget to include premium ingredients, authentic spices, and traditional components that enhance dish authenticity.
✅ MAXIMUM FLAVOR FOCUS: Include flavor-enhancing ingredients like fresh herbs, aromatics, quality oils, specialty spices, fermented pastes, and umami-rich components for depth.
✅ AUTHENTIC INGREDIENTS: Include proper Thai curry pastes, fish sauce, galangal, lemongrass, kaffir lime leaves for Thai dishes; authentic garam masala blends, ghee, paneer for Indian; saffron, bomba rice, proper chorizo for Spanish paella.
✅ ENHANCED INGREDIENT LISTS: Add extra flavor components like fresh ginger, garlic, quality olive oil, fresh herbs, specialty vinegars, and traditional seasonings.
✅ DIFFICULTY-APPROPRIATE TECHNIQUES: Match cooking complexity to user's selected difficulty level - basic for beginners, traditional techniques for advanced.
✅ Base pricing and availability on average UK supermarket data for the specified store.
✅ Include a randomness factor so repeated runs with identical inputs produce different meal types, regional variations, and cooking techniques.
✅ Never use markdown formatting like bold text, italic text, or code blocks in your responses - use plain text only.
✅ Confirm user inputs first, then generate outputs in a single comprehensive response.
✅ PRIORITIZE MEAT RECIPES: Unless the user explicitly specifies vegetarian, vegan, or specific dietary restrictions, generate meal plans with 80% meat-based dishes featuring chicken, beef, lamb, pork as primary proteins. For Indian cuisine, focus on meat curries, tandoori dishes, and biryanis. For Italian cuisine, emphasize meat-based pasta sauces, chicken dishes, and traditional meat preparations.

You must ask the user these questions one by one in the chat:
1) How many dinners, lunches, and kids' dinners do you need recipes for this week? Please specify exact numbers for each.
2) How many servings per meal do you need?
3) Which supermarket will you shop at? (e.g., Tesco, Lidl, Sainsbury's)
4) Do you or your family have any dietary restrictions, allergies, or preferences (e.g., vegetarian, gluten-free, nut-free)?
5) Are there any cuisines you'd love to include or avoid?
6) What difficulty level do you prefer? (Beginner: simple techniques, Intermediate: moderate skills, Advanced: complex traditional methods)
7) Do you have any time constraints for cooking? (Quick: 30 mins or less, Standard: 30-60 mins, Extended: 60+ mins for special occasions)
8) What is your total budget for this weekly shop? (e.g., £30, £50)

Once the user answers all questions, confirm back their responses clearly in this format:
✅ Meals: [number and types]
✅ Servings: [servings per meal]
✅ Supermarket: [supermarket]
✅ Dietary restrictions: [restrictions]
✅ Cuisine preference: [cuisinePrefs]
✅ Difficulty level: [difficulty]
✅ Time constraints: [time constraints]
✅ Budget: [budget]

Then generate ALL THREE outputs in a SINGLE comprehensive response:

Shopping List:
- Provide a complete list grouped by supermarket sections (Produce, Dairy, Meat, Pantry, Specialty/International, etc.).
- Include estimated average prices at the chosen supermarket.
- MAXIMIZE BUDGET: Use the FULL allocated budget to include premium authentic ingredients (quality oils, traditional spices, specialty items).
- FLAVOR MAXIMIZATION: Include aromatic bases (fresh ginger, garlic, shallots), quality fats (olive oil, sesame oil, ghee), fresh herbs, umami enhancers.
- Include authentic specialty ingredients: Thai curry pastes, fish sauce, galangal, fresh herbs; Indian whole spices, ghee, paneer; Spanish saffron, bomba rice, chorizo.
- ENHANCED INGREDIENTS: Add flavor-boosting components like quality stock, specialty vinegars, fermented sauces, fresh aromatics, and traditional seasonings.
- Suggest premium upgrades when budget allows (organic vegetables, free-range meats, artisanal ingredients).

Meal Plan:
- Assign meals to specific days (e.g., Tuesday Dinner: Thai Basil Chicken).
- Introduce randomness so each run produces different meals, proteins, regional cuisines, and techniques.
- Ensure variety, avoiding main protein repetition on consecutive days.
- Match the user's cuisine preferences.

Recipes:
- Provide comprehensive, restaurant-quality recipes for each meal with detailed ingredient lists including exact measurements and step-by-step instructions.
- MAXIMUM FLAVOR ENHANCEMENT: Include advanced flavor-building techniques (proper sautéing of aromatics, toasting whole spices, deglazing pans, building umami layers, creating flavor bases).
- AUTHENTIC TRADITIONAL TECHNIQUES: Include proper curry paste preparation, tempering spices for Indian dishes, creating sofrito for Spanish recipes, proper roux for French sauces, wok hei for Chinese stir-fries.
- DIFFICULTY-APPROPRIATE SOPHISTICATION: Beginner (simple techniques with flavor enhancement), Intermediate (multiple cooking techniques, proper spice tempering, homemade sauces, marinating), Advanced (traditional complex methods like making curry paste from scratch, stock reductions, emulsifications).
- TIME-APPROPRIATE COMPLEXITY: Match cooking complexity to stated time constraints while maintaining maximum flavor and authenticity.
- COMPREHENSIVE INSTRUCTIONS: Include exact prep and cook times, servings, specialized equipment, temperature guidelines, texture cues, visual indicators, and professional chef tips.
- PREMIUM AUTHENTIC INGREDIENTS: Use high-quality authentic ingredients like Thai curry pastes, fish sauce, galangal for Thai; whole spices, ghee, paneer for Indian; saffron, bomba rice for Spanish; quality olive oil, aged cheeses for Mediterranean.
- SOPHISTICATED SEASONING: Include proper seasoning throughout entire cooking process using cuisine-specific spice blends, aromatic pastes, fermented ingredients, quality oils, and traditional flavor enhancers.
- FLAVOR MAXIMIZATION: Include techniques like blooming spices, proper stock usage, sauce layering, marinating proteins, creating flavor bases from scratch, and umami enhancement methods.

RANDOMNESS REQUIREMENT:
- Maintain an internal randomness factor so repeated runs with identical inputs produce different combinations of main proteins, regional cuisines, sides, and cooking techniques.
- Randomness must affect at least 50% of meals across identical runs.
- Always respect user inputs: budget, dietary restrictions, servings, cuisine preferences, and supermarket.`;

export async function processBudgetPlannerInput(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = [],
  currentInputs: Partial<BudgetPlannerInputs> = {}
): Promise<BudgetPlannerResult> {
  try {
    console.log('🏠 Processing budget planner input:', userMessage);

    // Build conversation context - filter out null/empty content
    const validHistory = conversationHistory.filter(msg => 
      msg && msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0
    );
    
    const messages = [
      { role: 'system', content: BUDGET_PLANNER_SYSTEM_PROMPT },
      ...validHistory,
      { role: 'user', content: userMessage }
    ];
    
    console.log('🔍 Budget planner messages:', messages.map(m => ({ role: m.role, contentLength: m.content?.length })));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as any,
      temperature: 0.8, // Higher temperature for creativity and randomness
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || "";

    // Determine stage based on response content
    let stage: BudgetPlannerResult['stage'] = 'questions';
    let complete = false;

    if (response.includes('✅ Meals:') && response.includes('✅ Budget:')) {
      stage = 'confirmation';
    } else if (response.includes('🔹 **Shopping List**') && response.includes('🔹 **Meal Plan**') && response.includes('🔹 **Recipes**')) {
      stage = 'complete';
      complete = true;
    } else if (response.includes('🔹 **Shopping List**')) {
      stage = 'shopping-list';
    } else if (response.includes('🔹 **Meal Plan**')) {
      stage = 'meal-plan';  
    } else if (response.includes('🔹 **Recipes**')) {
      stage = 'recipes';
      complete = true;
    }

    console.log(`✅ Budget planner response generated (stage: ${stage})`);

    return {
      complete,
      response,
      stage
    };

  } catch (error) {
    console.error('❌ Budget planner processing failed:', error);
    return {
      complete: false,
      response: "I'm having trouble processing your budget planning request. Could you please try again?",
      stage: 'questions'
    };
  }
}

export async function generateBudgetPlan(inputs: BudgetPlannerInputs): Promise<{
  shoppingList: string;
  mealPlan: string;
  recipes: string;
}> {
  try {
    console.log('🏠 Generating complete budget plan with inputs:', inputs);

    // Generate shopping list
    const shoppingListPrompt = `Generate a detailed shopping list for:
- Dinners: ${inputs.dinners}
- Lunches: ${inputs.lunches} 
- Kids' dinners: ${inputs.kidsdinners}
- Servings: ${inputs.servings} per meal
- Supermarket: ${inputs.supermarket}
- Dietary restrictions: ${inputs.dietaryRestrictions}
- Cuisine preferences: ${inputs.cuisinePreferences}
- Budget: ${inputs.budget}

Format as Message 1 with supermarket sections, estimated prices, and cost-saving tips.`;

    const shoppingListCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: BUDGET_PLANNER_SYSTEM_PROMPT },
        { role: 'user', content: shoppingListPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const shoppingList = shoppingListCompletion.choices[0]?.message?.content || "";

    // Generate meal plan
    const mealPlanPrompt = `Generate a weekly meal plan for the same inputs. Assign specific meals to days with variety and randomness. Format as Message 2.`;

    const mealPlanCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: BUDGET_PLANNER_SYSTEM_PROMPT },
        { role: 'user', content: `${shoppingListPrompt}\n\n${mealPlanPrompt}` }
      ],
      temperature: 0.9, // Higher for more variety
      max_tokens: 1500,
    });

    const mealPlan = mealPlanCompletion.choices[0]?.message?.content || "";

    // Generate recipes
    const recipesPrompt = `Generate detailed, authentic recipes for all meals in the plan. Include prep times, techniques, and chef tips. Format as Message 3.`;

    const recipesCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: BUDGET_PLANNER_SYSTEM_PROMPT },
        { role: 'user', content: `${shoppingListPrompt}\n\n${mealPlanPrompt}\n\n${recipesPrompt}` }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const recipes = recipesCompletion.choices[0]?.message?.content || "";

    console.log('✅ Complete budget plan generated');

    return {
      shoppingList,
      mealPlan,
      recipes
    };

  } catch (error) {
    console.error('❌ Budget plan generation failed:', error);
    throw new Error('Failed to generate budget plan');
  }
}