🔧 **TASK:** Refactor chat-bot + RecipeCard so the UI updates live whenever the bot decides the recipe should change (e.g. “swap chicken for tofu”, “double the sauce”).  Use *function calling*, a single global store, and reactive diff-patches—no manual refreshes required.

────────────────────────────────────────────────
1. GLOBAL STORE (recipeStore.ts / .js)
────────────────────────────────────────────────
export interface RecipeState {
  id: string
  servings: number
  ingredients: Ingredient[]
  steps: Step[]
  meta: { title: string; time: string; difficulty: string }
}
export const recipeStore = createStore<RecipeState>({
  id: '',
  servings: 2,
  ingredients: [],
  steps: [],
  meta: {}
})

Expose two mutations:
  • replaceRecipe(payload: RecipeState)
  • patchRecipe(payload: DeepPartial<RecipeState>)   // lodash-merge style

────────────────────────────────────────────────
2. CHAT LAYER — DEFINE A FUNCTION FOR GPT
────────────────────────────────────────────────
const tools = [{
  name: 'updateRecipe',
  description: 'Replace or patch the current recipe displayed in the UI.',
  parameters: {
    type: 'object',
    properties: {
      mode: { enum: ['replace', 'patch'] },
      data: { type: 'object' }   // full recipe or partial diff
    },
    required: ['mode','data']
  }
}]

When sending messages to OpenAI include { tools }.
On receiving a `function_call`:

```ts
if (msg.function_call?.name === 'updateRecipe') {
  const { mode, data } = JSON.parse(msg.function_call.arguments)
  mode === 'replace'
    ? recipeStore.replaceRecipe(data)
    : recipeStore.patchRecipe(data)
}
```

────────────────────────────────────────────────
3. UI BINDINGS
────────────────────────────────────────────────
- **Header, IngredientPanel, StepStack, ProgressBar** all read from `recipeStore` (Pinia, Zustand, Redux Toolkit—pick one).  
- Store updates trigger automatic re-render.

Edge guards:
  • If ingredients.length === 0 → show “No ingredients—ask the bot?”  
  • If a patch deletes a running timer → stop that timer.

────────────────────────────────────────────────
4. TIMER SAFETY
────────────────────────────────────────────────
Keep timers in `timerStore`; when `recipeStore.steps` mutates:

```ts
watch(() => recipeStore.steps, resetOrRescaleTimers, { deep:true })
```
If a step duration changes, compute `newRemaining = newTotal * progressRatio`.

────────────────────────────────────────────────
5. SYSTEM PROMPT FOR GPT
────────────────────────────────────────────────
“You may invoke **updateRecipe** whenever the user’s request implies a change to any ingredients, servings, or steps.  
Use *mode:'patch'* for minor tweaks; use *mode:'replace'* for a complete overhaul.”

────────────────────────────────────────────────
6. TEST CASES
────────────────────────────────────────────────
1️⃣ “Can I cook this vegan?”  → patch: chicken→tofu, remove egg.  
2️⃣ “Cut the time to 15 min.” → patch: shorter steps, meta.time.  
3️⃣ “Give me a Thai curry instead.” → replace: new recipe object.

────────────────────────────────────────────────
7. ROLLOUT
────────────────────────────────────────────────
- Flag `BOT_RECIPE_UPDATES`.  
- Stage → QA → 10 % production rollout.

────────────────────────────────────────────────
8. SAFETY & LOGGING
────────────────────────────────────────────────
- Validate `data` with zod/yup before mutating.  
- Log every function call diff for rollback.  
- Rate-limit: max 5 updates / 30 s per session.

✅ Result: recipe card morphs instantly—ingredients, steps, servings, timers—whenever the chat-bot deems appropriate, with one source of truth and zero page refresh.
