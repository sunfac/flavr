// === UNIT TESTS FOR PROMPT TEMPLATES ===
import { describe, it, expect } from '@jest/globals';
import {
  compileChatPrompt,
  compileRecipePrompt,
  compileWeeklyPlannerPrompt,
  compileImageToRecipePrompt
} from '../promptTemplates';

describe('Prompt Templates', () => {
  
  describe('Chat Prompt Compilation', () => {
    it('should compile basic chat prompt correctly', () => {
      const result = compileChatPrompt('Hello, can you help me?');
      
      expect(result.systemPrompt).toContain('culinary AI assistant');
      expect(result.userPrompt).toBe('Hello, can you help me?');
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.variant).toBe('technical_advisor');
    });
    
    it('should include conversation history', () => {
      const history = [
        { role: 'user' as const, content: 'Hi there' },
        { role: 'assistant' as const, content: 'Hello! How can I help?' }
      ];
      
      const result = compileChatPrompt('What can you do?', {
        conversationHistory: history
      });
      
      expect(result.systemPrompt).toContain('Previous conversation');
      expect(result.systemPrompt).toContain('Hi there');
      expect(result.systemPrompt).toContain('Hello! How can I help?');
    });
    
    it('should apply token optimization for gpt-4o-mini', () => {
      const result = compileChatPrompt('Tell me about cooking', {
        model: 'gpt-4o-mini',
        maxTokens: 500
      });
      
      expect(result.optimizations).toContain('token_reduction');
      expect(result.estimatedTokens).toBeLessThan(1000); // Should be optimized
    });
    
    it('should handle different variants', () => {
      const casualResult = compileChatPrompt('Hi!', { variant: 'casual_friend' });
      const technicalResult = compileChatPrompt('Hi!', { variant: 'technical_advisor' });
      
      expect(casualResult.systemPrompt).not.toBe(technicalResult.systemPrompt);
      expect(casualResult.variant).toBe('casual_friend');
      expect(technicalResult.variant).toBe('technical_advisor');
    });
  });
  
  describe('Recipe Prompt Compilation', () => {
    it('should compile basic recipe prompt', () => {
      const result = compileRecipePrompt('Chicken stir fry');
      
      expect(result.systemPrompt).toContain('recipe creation');
      expect(result.userPrompt).toContain('Chicken stir fry');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
    
    it('should include dietary restrictions', () => {
      const result = compileRecipePrompt('Pasta dish', {
        dietaryRestrictions: ['vegetarian', 'gluten-free']
      });
      
      expect(result.userPrompt).toContain('vegetarian');
      expect(result.userPrompt).toContain('gluten-free');
    });
    
    it('should handle time constraints', () => {
      const result = compileRecipePrompt('Quick dinner', {
        timeConstraint: 30
      });
      
      expect(result.userPrompt).toContain('30 minutes');
    });
    
    it('should apply Michelin quality variant', () => {
      const basicResult = compileRecipePrompt('Soup');
      const michelinResult = compileRecipePrompt('Soup', { variant: 'michelin_quality' });
      
      expect(michelinResult.systemPrompt).toContain('Michelin');
      expect(michelinResult.systemPrompt).not.toBe(basicResult.systemPrompt);
    });
    
    it('should optimize for token reduction', () => {
      const optimizedResult = compileRecipePrompt('Simple salad', {
        model: 'gpt-4o-mini',
        maxTokens: 1000
      });
      
      expect(optimizedResult.optimizations).toContain('token_reduction');
      expect(optimizedResult.optimizations).toContain('concise_instructions');
    });
  });
  
  describe('Weekly Planner Prompt Compilation', () => {
    it('should compile weekly planner prompt', () => {
      const preferences = {
        householdSize: { adults: 2, kids: 1 },
        cookingFrequency: 'most_days' as const,
        timeComfort: { weeknight: 45, weekend: 90 },
        ambitionLevel: 'balanced' as const,
        dietaryNeeds: [],
        cuisineWeighting: {},
        cuisinePreferences: ['Italian', 'Asian'],
        budgetPerServing: 'standard' as const,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      };
      
      const result = compileWeeklyPlannerPrompt(preferences, {
        totalMeals: 7
      });
      
      expect(result.systemPrompt).toContain('meal planning');
      expect(result.userPrompt).toContain('7 meals');
      expect(result.userPrompt).toContain('Italian');
      expect(result.userPrompt).toContain('Asian');
    });
    
    it('should handle household size correctly', () => {
      const preferences = {
        householdSize: { adults: 4, kids: 2 },
        cookingFrequency: 'most_days' as const,
        timeComfort: { weeknight: 45, weekend: 90 },
        ambitionLevel: 'balanced' as const,
        dietaryNeeds: [],
        cuisineWeighting: {},
        cuisinePreferences: [],
        budgetPerServing: 'standard' as const,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      };
      
      const result = compileWeeklyPlannerPrompt(preferences);
      
      expect(result.userPrompt).toContain('6 people');
    });
    
    it('should apply balanced planning variant', () => {
      const preferences = {
        householdSize: { adults: 2, kids: 0 },
        cookingFrequency: 'most_days' as const,
        timeComfort: { weeknight: 30, weekend: 60 },
        ambitionLevel: 'balanced' as const,
        dietaryNeeds: [],
        cuisineWeighting: {},
        cuisinePreferences: [],
        budgetPerServing: 'standard' as const,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      };
      
      const result = compileWeeklyPlannerPrompt(preferences, {
        variant: 'balanced_planning'
      });
      
      expect(result.variant).toBe('balanced_planning');
      expect(result.systemPrompt).toContain('balanced');
    });
  });
  
  describe('Image-to-Recipe Prompt Compilation', () => {
    it('should compile image analysis prompt', () => {
      const result = compileImageToRecipePrompt({});
      
      expect(result.systemPrompt).toContain('image analysis');
      expect(result.userPrompt).toContain('ingredients');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
    
    it('should include user preferences', () => {
      const result = compileImageToRecipePrompt({
        userPreferences: {
          dietaryRestrictions: ['vegan'],
          timePreference: 'quick'
        }
      });
      
      expect(result.userPrompt).toContain('vegan');
      expect(result.userPrompt).toContain('quick');
    });
    
    it('should apply ingredient detection variant', () => {
      const detectionResult = compileImageToRecipePrompt({
        variant: 'ingredient_detection'
      });
      
      const analysisResult = compileImageToRecipePrompt({
        variant: 'full_analysis'
      });
      
      expect(detectionResult.variant).toBe('ingredient_detection');
      expect(analysisResult.variant).toBe('full_analysis');
      expect(detectionResult.systemPrompt).not.toBe(analysisResult.systemPrompt);
    });
  });
  
  describe('Token Estimation', () => {
    it('should estimate tokens accurately', () => {
      const shortPrompt = compileChatPrompt('Hi');
      const longPrompt = compileChatPrompt('Tell me everything about cooking techniques, ingredients, equipment, and the history of culinary arts in great detail');
      
      expect(longPrompt.estimatedTokens).toBeGreaterThan(shortPrompt.estimatedTokens);
    });
    
    it('should include optimization effects in token count', () => {
      const unoptimized = compileRecipePrompt('Pasta', {});
      const optimized = compileRecipePrompt('Pasta', {
        model: 'gpt-4o-mini',
        maxTokens: 500
      });
      
      expect(optimized.estimatedTokens).toBeLessThanOrEqual(unoptimized.estimatedTokens);
    });
  });
  
  describe('Prompt Variants', () => {
    it('should provide different system prompts for variants', () => {
      const variants = ['technical_advisor', 'casual_friend', 'expert_chef'];
      const prompts = variants.map(variant => 
        compileChatPrompt('Test message', { variant })
      );
      
      // All prompts should be different
      const uniquePrompts = new Set(prompts.map(p => p.systemPrompt));
      expect(uniquePrompts.size).toBe(variants.length);
    });
    
    it('should maintain consistency for same variant', () => {
      const prompt1 = compileChatPrompt('Message 1', { variant: 'technical_advisor' });
      const prompt2 = compileChatPrompt('Message 2', { variant: 'technical_advisor' });
      
      expect(prompt1.systemPrompt).toBe(prompt2.systemPrompt);
      expect(prompt1.variant).toBe(prompt2.variant);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty messages gracefully', () => {
      const result = compileChatPrompt('');
      
      expect(result.systemPrompt).toBeDefined();
      expect(result.userPrompt).toBe('');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
    
    it('should handle missing optional parameters', () => {
      const result = compileRecipePrompt('Test recipe', {});
      
      expect(result.systemPrompt).toBeDefined();
      expect(result.userPrompt).toContain('Test recipe');
    });
    
    it('should handle large token limits gracefully', () => {
      const result = compileChatPrompt('Test', { maxTokens: 100000 });
      
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.optimizations).toBeDefined();
    });
  });
});