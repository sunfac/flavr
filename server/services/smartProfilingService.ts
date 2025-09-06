import { userAnalyticsService, type UserProfile } from "./userAnalyticsService";

interface RecipeGenerationContext {
  userProfile?: UserProfile;
  mode: string; // 'chef', 'weekly-planner', 'inspire-me', etc.
  originalPrompt: string;
  userPreferences?: any;
}

interface SmartPromptEnhancement {
  enhancedPrompt: string;
  confidenceLevel: 'low' | 'medium' | 'high';
  diversityBoost: number;
  reasoning: string[];
  fallbackStrategy: 'general' | 'balanced' | 'personalized';
}

class SmartProfilingService {
  
  // Main method to enhance recipe generation with user profiling
  async enhanceRecipeGeneration(
    userId: number,
    context: RecipeGenerationContext
  ): Promise<SmartPromptEnhancement> {
    
    try {
      // Get comprehensive user profile
      const userProfile = await userAnalyticsService.generateUserProfile(userId);
      
      // Determine if we should use profiling based on confidence
      const shouldUseProfile = this.shouldUseUserProfile(userProfile, context);
      
      if (!shouldUseProfile) {
        return this.createGeneralPromptEnhancement(context);
      }
      
      // Create personalized prompt enhancement
      return this.createPersonalizedPromptEnhancement(userProfile, context);
      
    } catch (error) {
      console.error("Error in smart profiling service:", error);
      return this.createGeneralPromptEnhancement(context);
    }
  }
  
  // Determine if we should use user profiling
  private shouldUseUserProfile(userProfile: UserProfile, context: RecipeGenerationContext): boolean {
    // Never use profiling for new users (confidence < 30%)
    if (userProfile.profileConfidence < 30) {
      return false;
    }
    
    // Always use profiling for high-confidence users (confidence >= 70%)
    if (userProfile.profileConfidence >= 70) {
      return true;
    }
    
    // For medium confidence (30-70%), use contextual rules
    if (context.mode === 'weekly-planner') {
      // Weekly planner benefits from personalization even at medium confidence
      return userProfile.profileConfidence >= 40;
    }
    
    if (context.mode === 'inspire-me') {
      // Inspire me should be diverse, so only use profiling at higher confidence
      return userProfile.profileConfidence >= 60;
    }
    
    // Default: use profiling for medium+ confidence
    return userProfile.profileConfidence >= 50;
  }
  
  // Create general prompt enhancement (no personalization)
  private createGeneralPromptEnhancement(context: RecipeGenerationContext): SmartPromptEnhancement {
    return {
      enhancedPrompt: context.originalPrompt,
      confidenceLevel: 'low',
      diversityBoost: 80, // High diversity for new users
      reasoning: [
        "User profile has insufficient data for personalization",
        "Using general recipe generation to maintain diversity",
        "Will improve recommendations as user generates more recipes"
      ],
      fallbackStrategy: 'general'
    };
  }
  
  // Create personalized prompt enhancement
  private createPersonalizedPromptEnhancement(
    userProfile: UserProfile, 
    context: RecipeGenerationContext
  ): SmartPromptEnhancement {
    
    const reasoning: string[] = [];
    let enhancedPrompt = context.originalPrompt;
    
    // Add cuisine preferences if confident enough
    if (userProfile.tasteProfile.confidenceScore >= 50 && 
        userProfile.tasteProfile.cuisinePreferences.length > 0) {
      
      const topCuisines = userProfile.tasteProfile.cuisinePreferences
        .slice(0, 2)
        .map(c => c.cuisine);
      
      // Don't make it too restrictive - suggest rather than mandate
      if (context.mode === 'weekly-planner') {
        enhancedPrompt += ` The user has shown a preference for ${topCuisines.join(' and ')} cuisine, but ensure variety across the week.`;
        reasoning.push(`Incorporating preference for ${topCuisines.join(' and ')} cuisine`);
      } else if (context.mode === 'chef') {
        enhancedPrompt += ` The user enjoys ${topCuisines.join(' and ')} cuisine, consider this style if appropriate for the request.`;
        reasoning.push(`Considering ${topCuisines.join(' and ')} cuisine preference`);
      }
    }
    
    // Add cooking time preferences
    if (userProfile.tasteProfile.cookingPatterns.averageCookTime > 0) {
      const avgTime = userProfile.tasteProfile.cookingPatterns.averageCookTime;
      
      if (avgTime <= 25) {
        enhancedPrompt += ` The user typically prefers quick recipes (under 30 minutes).`;
        reasoning.push("User prefers quick cooking times");
      } else if (avgTime >= 45) {
        enhancedPrompt += ` The user enjoys longer cooking sessions and complex recipes.`;
        reasoning.push("User comfortable with longer cooking times");
      }
    }
    
    // Add difficulty preferences
    if (userProfile.tasteProfile.cookingPatterns.preferredDifficulty) {
      const difficulty = userProfile.tasteProfile.cookingPatterns.preferredDifficulty;
      if (difficulty !== 'medium') { // Only mention if not standard
        enhancedPrompt += ` The user generally prefers ${difficulty} difficulty recipes.`;
        reasoning.push(`User tends toward ${difficulty} difficulty recipes`);
      }
    }
    
    // Add dietary trend insights
    const { dietaryTrends } = userProfile.tasteProfile;
    const totalRecipes = userProfile.recipesGenerated;
    
    if (totalRecipes > 5) {
      if (dietaryTrends.vegetarianRecipes / totalRecipes > 0.4) {
        enhancedPrompt += ` The user shows interest in vegetarian options.`;
        reasoning.push("User shows vegetarian cooking interest");
      }
      
      if (dietaryTrends.healthyRecipes / totalRecipes > 0.3) {
        enhancedPrompt += ` The user values healthy, nutritious meals.`;
        reasoning.push("User prioritizes healthy recipes");
      }
    }
    
    // Calculate confidence and diversity based on profiling strength
    let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
    let diversityBoost = 30; // Default medium diversity
    let fallbackStrategy: 'general' | 'balanced' | 'personalized' = 'balanced';
    
    if (userProfile.profileConfidence >= 70) {
      confidenceLevel = 'high';
      diversityBoost = 20; // Lower diversity, trust the profile
      fallbackStrategy = 'personalized';
      reasoning.push("High confidence profile - strong personalization");
    } else if (userProfile.profileConfidence >= 50) {
      confidenceLevel = 'medium';
      diversityBoost = 35; // Balanced approach
      fallbackStrategy = 'balanced';
      reasoning.push("Medium confidence profile - balanced personalization");
    } else {
      confidenceLevel = 'low';
      diversityBoost = 50; // Higher diversity for uncertain profiles
      fallbackStrategy = 'general';
      reasoning.push("Lower confidence profile - light personalization with diversity");
    }
    
    // Special handling for Inspire Me mode (always maintain high diversity)
    if (context.mode === 'inspire-me') {
      diversityBoost = Math.max(diversityBoost, 60);
      enhancedPrompt += ` Prioritize introducing the user to new cuisines and techniques while respecting their general preferences.`;
      reasoning.push("Inspire Me mode - boosting diversity to introduce new experiences");
    }
    
    // Add final instruction to prevent pigeonholing
    enhancedPrompt += ` Important: While considering these preferences, maintain creativity and suggest varied options to help the user discover new favorites.`;
    reasoning.push("Added creativity instruction to prevent limitation");
    
    return {
      enhancedPrompt,
      confidenceLevel,
      diversityBoost,
      reasoning,
      fallbackStrategy
    };
  }
  
  // Get user's cooking confidence for recipe complexity recommendations
  async getCookingConfidence(userId: number): Promise<{
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    recommendedComplexity: 'simple' | 'moderate' | 'complex';
    reasoning: string;
  }> {
    
    const userProfile = await userAnalyticsService.generateUserProfile(userId);
    
    // Analyze skill indicators
    const totalRecipes = userProfile.recipesGenerated;
    const completionRate = userProfile.recipesCompleted / Math.max(totalRecipes, 1);
    const avgCookTime = userProfile.tasteProfile.cookingPatterns.averageCookTime;
    const preferredDifficulty = userProfile.tasteProfile.cookingPatterns.preferredDifficulty;
    
    let skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    let recommendedComplexity: 'simple' | 'moderate' | 'complex' = 'simple';
    let reasoning = '';
    
    // Determine skill level based on multiple factors
    if (totalRecipes >= 20 && completionRate >= 0.7 && avgCookTime >= 40) {
      skillLevel = 'advanced';
      recommendedComplexity = 'complex';
      reasoning = `User has generated ${totalRecipes} recipes with ${Math.round(completionRate * 100)}% completion rate and comfortable with longer cooking times.`;
    } else if (totalRecipes >= 8 && completionRate >= 0.6 && preferredDifficulty !== 'easy') {
      skillLevel = 'intermediate';
      recommendedComplexity = 'moderate';
      reasoning = `User shows growing confidence with ${totalRecipes} recipes and ${Math.round(completionRate * 100)}% completion rate.`;
    } else {
      skillLevel = 'beginner';
      recommendedComplexity = 'simple';
      reasoning = totalRecipes < 5 
        ? "New user - recommending simple recipes to build confidence."
        : "User profile suggests preference for straightforward cooking approaches.";
    }
    
    return {
      skillLevel,
      recommendedComplexity,
      reasoning
    };
  }
  
  // Calculate user's adventure score for new cuisine suggestions
  async getAdventureScore(userId: number): Promise<{
    score: number; // 0-100
    willingness: 'conservative' | 'moderate' | 'adventurous';
    nextCuisineRecommendations: string[];
  }> {
    
    const userProfile = await userAnalyticsService.generateUserProfile(userId);
    
    const totalRecipes = userProfile.recipesGenerated;
    const uniqueCuisines = userProfile.tasteProfile.cuisinePreferences.length;
    
    // Calculate adventure score
    let score = 0;
    
    // Base score from cuisine diversity
    if (totalRecipes > 0) {
      score += Math.min((uniqueCuisines / totalRecipes) * 100, 50);
    }
    
    // Bonus for having multiple cuisines
    score += Math.min(uniqueCuisines * 10, 30);
    
    // Bonus for trying complex recipes
    if (userProfile.tasteProfile.cookingPatterns.preferredDifficulty === 'hard') {
      score += 20;
    }
    
    score = Math.min(score, 100);
    
    // Determine willingness category
    let willingness: 'conservative' | 'moderate' | 'adventurous' = 'conservative';
    if (score >= 70) willingness = 'adventurous';
    else if (score >= 40) willingness = 'moderate';
    
    // Suggest next cuisines based on current preferences
    const triedCuisines = userProfile.tasteProfile.cuisinePreferences.map(c => c.cuisine.toLowerCase());
    const allCuisines = ['Italian', 'French', 'Japanese', 'Thai', 'Indian', 'Mexican', 'Chinese', 'Korean', 'Mediterranean', 'Moroccan', 'Vietnamese', 'Lebanese'];
    
    const nextCuisineRecommendations = allCuisines
      .filter(cuisine => !triedCuisines.includes(cuisine.toLowerCase()))
      .slice(0, 3);
    
    return {
      score: Math.round(score),
      willingness,
      nextCuisineRecommendations
    };
  }
}

export const smartProfilingService = new SmartProfilingService();
export type { RecipeGenerationContext, SmartPromptEnhancement };