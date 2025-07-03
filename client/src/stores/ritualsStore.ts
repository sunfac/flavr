import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface DayPreferences {
  skip: boolean;
  cuisine: string[];
  mood: string;
  ambition: string;
  budget: string;
  dietary: string[];
}

export interface WeeklyPreferences {
  monday: DayPreferences;
  tuesday: DayPreferences;
  wednesday: DayPreferences;
  thursday: DayPreferences;
  friday: DayPreferences;
  saturday: DayPreferences;
  sunday: DayPreferences;
}

export interface GeneratedRecipe {
  id: string;
  title: string;
  description: string;
  servings: number;
  cookTime: string;
  difficulty: string;
  cuisine: string;
  ingredients: string[];
  instructions: string[];
  image?: string;
  day: string;
}

interface RitualsState {
  // Phase 1: Planning
  weeklyPreferences: WeeklyPreferences | null;
  currentPhase: 'planning' | 'generation' | 'review';
  
  // Phase 2: Generation
  generatedRecipes: GeneratedRecipe[];
  isGenerating: boolean;
  generationProgress: number;
  
  // Actions
  setWeeklyPreferences: (preferences: WeeklyPreferences) => void;
  setCurrentPhase: (phase: 'planning' | 'generation' | 'review') => void;
  setGeneratedRecipes: (recipes: GeneratedRecipe[]) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  resetStore: () => void;
}

const defaultDayPreferences: DayPreferences = {
  skip: false,
  cuisine: [],
  mood: "",
  ambition: "",
  budget: "",
  dietary: [],
};

const defaultWeeklyPreferences: WeeklyPreferences = {
  monday: { ...defaultDayPreferences, mood: "focused" },
  tuesday: { ...defaultDayPreferences, mood: "lightClean" },
  wednesday: { ...defaultDayPreferences, mood: "tired" },
  thursday: { ...defaultDayPreferences, mood: "effortlessJoy" },
  friday: { ...defaultDayPreferences, mood: "celebratory" },
  saturday: { ...defaultDayPreferences, mood: "creative" },
  sunday: { ...defaultDayPreferences, mood: "laidBack" },
};

export const useRitualsStore = create<RitualsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      weeklyPreferences: null,
      currentPhase: 'planning',
      generatedRecipes: [],
      isGenerating: false,
      generationProgress: 0,

      // Actions
      setWeeklyPreferences: (preferences) => 
        set({ weeklyPreferences: preferences }, false, 'setWeeklyPreferences'),

      setCurrentPhase: (phase) => 
        set({ currentPhase: phase }, false, 'setCurrentPhase'),

      setGeneratedRecipes: (recipes) => 
        set({ generatedRecipes: recipes }, false, 'setGeneratedRecipes'),

      setIsGenerating: (generating) => 
        set({ isGenerating: generating }, false, 'setIsGenerating'),

      setGenerationProgress: (progress) => 
        set({ generationProgress: progress }, false, 'setGenerationProgress'),

      resetStore: () => 
        set({
          weeklyPreferences: null,
          currentPhase: 'planning',
          generatedRecipes: [],
          isGenerating: false,
          generationProgress: 0,
        }, false, 'resetStore'),
    }),
    {
      name: 'rituals-store',
    }
  )
);