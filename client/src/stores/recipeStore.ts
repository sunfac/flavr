import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Ingredient {
  id: string;
  text: string;
  amount?: string;
  unit?: string;
  checked?: boolean;
}

export interface Step {
  id: string;
  title: string;
  description: string;
  duration?: number; // in minutes
  completed?: boolean;
  image?: string;
}

export interface RecipeMeta {
  title: string;
  description?: string;
  cookTime: number;
  difficulty: string;
  cuisine?: string;
  image?: string;
  imageLoading?: boolean;
  originalServings?: number;
}

export interface RecipeState {
  id: string;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  meta: RecipeMeta;
  subRecipes?: Record<string, {
    title?: string;
    ingredients: string[];
    instructions: string[];
  }>;
  // UI state
  currentStep: number;
  completedSteps: number[];
  lastUpdated: number;
  // Generation parameters for rerolling
  generationParams?: {
    mode: 'chef' | 'fridge' | 'shopping';
    originalInputs: any;
  };
}

interface RecipeStore extends RecipeState {
  // Actions
  replaceRecipe: (payload: RecipeState) => void;
  patchRecipe: (payload: DeepPartial<RecipeState>) => void;
  updateActiveRecipe: (recipe: any, generationParams?: any) => void;
  updateServings: (servings: number) => void;
  toggleIngredient: (ingredientId: string) => void;
  setCurrentStep: (stepIndex: number) => void;
  markStepComplete: (stepIndex: number) => void;
  resetRecipe: () => void;
  getGenerationParams: () => any;
  setImageLoading: (loading: boolean) => void;
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const initialState: RecipeState = {
  id: '',
  servings: 2,
  ingredients: [],
  steps: [],
  meta: {
    title: '',
    cookTime: 0,
    difficulty: 'Medium',
  },
  currentStep: 0,
  completedSteps: [],
  lastUpdated: Date.now(),
};

// Deep merge utility function
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = target[key];
    
    if (sourceValue !== undefined) {
      if (Array.isArray(sourceValue)) {
        // Replace arrays completely for recipes
        (result as any)[key] = sourceValue;
      } else if (typeof sourceValue === 'object' && sourceValue !== null) {
        if (typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
          (result as any)[key] = deepMerge(targetValue, sourceValue);
        } else {
          (result as any)[key] = sourceValue;
        }
      } else {
        (result as any)[key] = sourceValue;
      }
    }
  }
  
  return result;
}

export const useRecipeStore = create<RecipeStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      replaceRecipe: (payload: RecipeState) => {
        console.log('🔄 Recipe Store: Replacing recipe', payload);
        set({
          ...payload,
          lastUpdated: Date.now(),
        });
      },

      patchRecipe: (payload: DeepPartial<RecipeState>) => {
        console.log('🔧 Recipe Store: Patching recipe', payload);
        set((state) => {
          const newState = deepMerge(state, payload);
          return {
            ...newState,
            lastUpdated: Date.now(),
          };
        });
      },

      updateServings: (servings: number) => {
        set((state) => ({
          ...state,
          servings,
          lastUpdated: Date.now(),
        }));
      },

      toggleIngredient: (ingredientId: string) => {
        set((state) => ({
          ...state,
          ingredients: state.ingredients.map(ingredient =>
            ingredient.id === ingredientId
              ? { ...ingredient, checked: !ingredient.checked }
              : ingredient
          ),
          lastUpdated: Date.now(),
        }));
      },

      setCurrentStep: (stepIndex: number) => {
        set((state) => ({
          ...state,
          currentStep: stepIndex,
          lastUpdated: Date.now(),
        }));
      },

      markStepComplete: (stepIndex: number) => {
        set((state) => ({
          ...state,
          completedSteps: state.completedSteps.includes(stepIndex)
            ? state.completedSteps
            : [...state.completedSteps, stepIndex],
          lastUpdated: Date.now(),
        }));
      },

      updateActiveRecipe: (recipe: any, generationParams?: any) => {
        console.log('🔄 Recipe Store: Updating active recipe from chat', recipe);
        
        // Get current state to preserve existing data
        const currentState = get();
        
        // Transform complex API response structure to simple format
        let ingredients: Ingredient[] = [];
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          // Check if first element has sections structure (complex API format)
          if (recipe.ingredients.length > 0 && recipe.ingredients[0] && typeof recipe.ingredients[0] === 'object' && recipe.ingredients[0].section) {
            // Handle complex API structure with sections
            recipe.ingredients.forEach((section: any) => {
              if (section.items && Array.isArray(section.items)) {
                section.items.forEach((item: any) => {
                  const qty = item.qty > 0 ? `${item.qty}${item.unit ? ' ' + item.unit : ''}` : '';
                  const notes = item.notes ? ` (${item.notes})` : '';
                  const text = `${qty} ${item.item}${notes}`.trim();
                  
                  ingredients.push({
                    id: `ingredient-${ingredients.length}`,
                    text: text,
                    checked: false
                  });
                });
              }
            });
          } else {
            // Handle simple string array format from chat updates
            ingredients = recipe.ingredients.map((ing: any, index: number) => ({
              id: `ingredient-${index}`,
              text: typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.name || ing}`.trim(),
              checked: false
            }));
          }
        }
        
        // Transform instructions from method array  
        let instructions: Step[] = [];
        if (recipe.method && Array.isArray(recipe.method)) {
          instructions = recipe.method.map((step: any, index: number) => ({
            id: `step-${index}`,
            title: `Step ${index + 1}`,
            description: typeof step === 'string' ? step : step.instruction || step.description || '',
            duration: 0
          }));
        } else if (recipe.instructions && Array.isArray(recipe.instructions)) {
          // Handle alternative instructions format
          instructions = recipe.instructions.map((step: any, index: number) => ({
            id: `step-${index}`,
            title: `Step ${index + 1}`,
            description: typeof step === 'string' ? step : step.instruction || step.description || '',
            duration: 0
          }));
        } else {
          // Fallback to existing steps
          instructions = currentState.steps;
        }

        const updatedState: RecipeState = {
          id: recipe.id || currentState.id || Date.now().toString(),
          servings: recipe.servings || currentState.servings || 4,
          ingredients: ingredients.length > 0 ? ingredients : currentState.ingredients,
          steps: instructions.length > 0 ? instructions : currentState.steps,
          meta: {
            title: recipe.title || currentState.meta.title || 'Updated Recipe',
            description: recipe.description !== undefined ? recipe.description : currentState.meta.description,
            cookTime: recipe.time?.total_min || recipe.cookTime || currentState.meta.cookTime || 30,
            difficulty: recipe.difficulty || currentState.meta.difficulty || 'Medium',
            cuisine: recipe.cuisine || currentState.meta.cuisine,
            image: recipe.image || recipe.imageUrl || recipe.imageSrc || currentState.meta.image,
            imageLoading: recipe.imageLoading !== undefined ? recipe.imageLoading : !!(recipe.image || recipe.imageUrl || recipe.imageSrc)
          },
          currentStep: currentState.currentStep,
          completedSteps: currentState.completedSteps,
          lastUpdated: Date.now(),
          generationParams: generationParams || currentState.generationParams
        };
        
        console.log('🔍 Transformed ingredients:', ingredients.slice(0, 3));
        console.log('🔍 Transformed steps:', instructions.slice(0, 2));
        console.log('🔍 INGREDIENT DETECTION:', {
          hasIngredients: !!recipe.ingredients,
          isArray: Array.isArray(recipe.ingredients),
          firstElementType: recipe.ingredients?.[0] ? typeof recipe.ingredients[0] : 'none',
          hasSection: recipe.ingredients?.[0]?.section ? 'yes' : 'no',
          sampleData: recipe.ingredients?.slice(0, 2)
        });
        
        set(updatedState);
      },

      getGenerationParams: () => {
        return get().generationParams;
      },

      resetRecipe: () => {
        set({
          ...initialState,
          lastUpdated: Date.now(),
        });
      },

      setImageLoading: (loading: boolean) => {
        set((state) => ({
          ...state,
          meta: {
            ...state.meta,
            imageLoading: loading
          },
          lastUpdated: Date.now(),
        }));
      },
    }),
    {
      name: 'recipe-store',
    }
  )
);

// Utility functions for external use
export const recipeActions = {
  replaceRecipe: (payload: RecipeState) => useRecipeStore.getState().replaceRecipe(payload),
  patchRecipe: (payload: DeepPartial<RecipeState>) => useRecipeStore.getState().patchRecipe(payload),
  updateActiveRecipe: (recipe: any, generationParams?: any) => useRecipeStore.getState().updateActiveRecipe(recipe, generationParams),
  updateServings: (servings: number) => useRecipeStore.getState().updateServings(servings),
  toggleIngredient: (ingredientId: string) => useRecipeStore.getState().toggleIngredient(ingredientId),
  setCurrentStep: (stepIndex: number) => useRecipeStore.getState().setCurrentStep(stepIndex),
  markStepComplete: (stepIndex: number) => useRecipeStore.getState().markStepComplete(stepIndex),
  resetRecipe: () => useRecipeStore.getState().resetRecipe(),
};