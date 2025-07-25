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
        
        // Handle both API response format and internal format
        const ingredients = recipe.ingredients?.map((ing: any, index: number) => ({
          id: `ingredient-${index}`,
          text: typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.name || ing}`.trim(),
          amount: typeof ing === 'object' ? ing.amount : undefined,
          checked: false
        })) || currentState.ingredients; // Fallback to existing ingredients

        const instructions = recipe.instructions?.map((instruction: any, index: number) => ({
          id: `step-${index}`,
          title: `Step ${index + 1}`,
          description: typeof instruction === 'string' ? instruction : instruction.instruction,
          duration: 0
        })) || currentState.steps; // Fallback to existing steps

        const updatedState: RecipeState = {
          id: recipe.id || currentState.id || Date.now().toString(),
          servings: recipe.servings || currentState.servings || 4,
          ingredients: ingredients,
          steps: instructions,
          meta: {
            title: recipe.title || currentState.meta.title || 'Updated Recipe',
            description: recipe.description !== undefined ? recipe.description : currentState.meta.description,
            cookTime: recipe.cookTime || currentState.meta.cookTime || 30,
            difficulty: recipe.difficulty || currentState.meta.difficulty || 'Medium',
            cuisine: recipe.cuisine || currentState.meta.cuisine,
            image: recipe.image || recipe.imageUrl || recipe.imageSrc || currentState.meta.image, // Preserve existing image
            imageLoading: false // Since we're updating an existing recipe, not loading
          },
          currentStep: currentState.currentStep,
          completedSteps: currentState.completedSteps,
          lastUpdated: Date.now(),
          generationParams: generationParams || currentState.generationParams
        };
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