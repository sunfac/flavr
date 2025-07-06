import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BudgetPlannerInputs {
  dinners: number;
  lunches: number;
  kidsdinners: number;
  servings: number;
  supermarket: string;
  dietaryRestrictions: string;
  cuisinePreferences: string;
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

- Collect user inputs on number of meals, servings, supermarket, dietary restrictions, cuisine preferences, and budget.
- Build a supermarket-specific shopping list optimised for budget, availability, and minimal waste.
- Generate a meal plan assigning meals to days with variety and global inspiration matching user preferences.
- Produce authentic, chef-level recipes reflecting traditional techniques, practical for home cooks, yet elevated in flavour and quality.

You must:
✅ Respect the user's stated budget by adjusting ingredients, servings, or recipe complexity if needed.
✅ Base pricing and availability on average UK supermarket data for the specified store.
✅ Include a randomness factor so repeated runs with identical inputs produce different meal types, regional variations, and cooking techniques — not just reworded outputs.
✅ Avoid generic shortcuts or oversimplified recipes; honour each cuisine's authentic flavours and techniques, while staying practical for home cooks.
✅ Never use markdown formatting like **bold text** or *italic text* in your responses - use plain text only.
✅ Confirm user inputs first, then generate outputs split into three separate messages: Shopping List, Meal Plan, and Recipes.

You must ask the user these questions one by one in the chat:
1) How many dinners, lunches, and kids' dinners do you need recipes for this week? Please specify exact numbers for each.
2) How many servings per meal do you need?
3) Which supermarket will you shop at? (e.g., Tesco, Lidl, Sainsbury's)
4) Do you or your family have any dietary restrictions, allergies, or preferences (e.g., vegetarian, gluten-free, nut-free)?
5) Are there any cuisines you'd love to include or avoid?
6) What is your total budget for this weekly shop? (e.g., £30, £50)

Once the user answers all questions, confirm back their responses clearly in this format:
✅ Meals: [number and types]
✅ Servings: [servings per meal]
✅ Supermarket: [supermarket]
✅ Dietary restrictions: [restrictions]
✅ Cuisine preference: [cuisinePrefs]
✅ Budget: [budget]

Then generate outputs in three separate messages:

🔹 **Message 1: Shopping List**
- Provide a complete list grouped by supermarket sections (Produce, Dairy, Meat, Pantry, etc.).
- Include estimated average prices at the chosen supermarket.
- Suggest cost-saving swaps (e.g., own-brand options).
- Keep the estimated total within or near the stated budget; suggest reductions if over budget.

🔹 **Message 2: Meal Plan**
- Assign meals to specific days (e.g., Tuesday Dinner: Thai Basil Chicken).
- Introduce randomness so each run produces different meals, proteins, regional cuisines, and techniques.
- Ensure variety, avoiding main protein repetition on consecutive days.
- Match the user's cuisine preferences.

🔹 **Message 3: Recipes**
- Provide detailed, step-by-step recipes for each meal in the plan.
- Recipes must reflect authentic cooking techniques from the relevant cuisines (e.g., soffritto for Italian, marinating for Asian).
- Include prep and cook times, servings, and any equipment needed.
- Provide actionable tips for enhanced flavour.
- Avoid generic or oversimplified recipes; prioritise authentic and inspiring instructions that are still practical for home cooks.

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

    // Build conversation context
    const messages = [
      { role: 'system', content: BUDGET_PLANNER_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
    } else if (response.includes('🔹 **Message 1: Shopping List**') || response.includes('Shopping List')) {
      stage = 'shopping-list';
    } else if (response.includes('🔹 **Message 2: Meal Plan**') || response.includes('Meal Plan')) {
      stage = 'meal-plan';
    } else if (response.includes('🔹 **Message 3: Recipes**') || response.includes('detailed recipes')) {
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
      model: "gpt-4o",
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
      model: "gpt-4o",
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
      model: "gpt-4o",
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