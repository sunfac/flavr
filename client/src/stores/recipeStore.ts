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
  image?: string;
}

export interface RecipeMeta {
  title: string;
  description?: string;
  cookTime: number;
  difficulty: string;
  cuisine?: string;
  image?: string;
}

export interface RecipeState {
  id: string;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  meta: RecipeMeta;
  // UI state
  currentStep: number;
  completedSteps: number[];
  lastUpdated: number;
}

interface RecipeStore extends RecipeState {
  // Actions
  replaceRecipe: (payload: RecipeState) => void;
  patchRecipe: (payload: DeepPartial<RecipeState>) => void;
  updateActiveRecipe: (recipe: any) => void;
  updateServings: (servings: number) => void;
  toggleIngredient: (ingredientId: string) => void;
  setCurrentStep: (stepIndex: number) => void;
  markStepComplete: (stepIndex: number) => void;
  resetRecipe: () => void;
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

      updateActiveRecipe: (recipe: any) => {
        console.log('🔄 Recipe Store: Updating active recipe from chat', recipe);
        
        // Handle both API response format and internal format
        const ingredients = recipe.ingredients?.map((ing: any, index: number) => ({
          id: `ingredient-${index}`,
          text: typeof ing === 'string' ? ing : ing.name || ing,
          amount: typeof ing === 'object' ? ing.amount : undefined,
          checked: false
        })) || [];

        const instructions = recipe.instructions?.map((instruction: any, index: number) => ({
          id: `step-${index}`,
          title: `Step ${index + 1}`,
          description: typeof instruction === 'string' ? instruction : instruction.instruction,
          duration: 0
        })) || [];

        const updatedState: RecipeState = {
          id: recipe.id || Date.now().toString(),
          servings: recipe.servings || 4,
          ingredients: ingredients,
          steps: instructions,
          meta: {
            title: recipe.title || 'Updated Recipe',
            description: recipe.description,
            cookTime: recipe.cookTime || recipe.prepTime + recipe.cookTime || 30,
            difficulty: recipe.difficulty || 'Medium',
            cuisine: recipe.cuisine,
            image: recipe.image || recipe.imageUrl || recipe.imageSrc // Handle multiple image field names
          },
          currentStep: 0,
          completedSteps: [],
          lastUpdated: Date.now(),
        };
        set(updatedState);
      },

      resetRecipe: () => {
        set({
          ...initialState,
          lastUpdated: Date.now(),
        });
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
  updateActiveRecipe: (recipe: any) => useRecipeStore.getState().updateActiveRecipe(recipe),
  updateServings: (servings: number) => useRecipeStore.getState().updateServings(servings),
  toggleIngredient: (ingredientId: string) => useRecipeStore.getState().toggleIngredient(ingredientId),
  setCurrentStep: (stepIndex: number) => useRecipeStore.getState().setCurrentStep(stepIndex),
  markStepComplete: (stepIndex: number) => useRecipeStore.getState().markStepComplete(stepIndex),
  resetRecipe: () => useRecipeStore.getState().resetRecipe(),
};