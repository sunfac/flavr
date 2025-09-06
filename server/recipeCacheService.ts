import { storage } from "./storage";
import type { Recipe } from "@shared/schema";

export interface RecipeCacheQuery {
  cuisine?: string[];
  difficulty?: string;
  cookTime?: number; // max time in minutes
  dietary?: string[];
  servings?: number;
  excludeIds?: number[]; // recipes to exclude (already shown)
}

export class RecipeCacheService {
  
  /**
   * Get quality cached recipes for free users based on preferences
   * Returns recipes that match user preferences, prioritizing variety
   */
  static async getCachedRecipesForFreeUser(
    userId: number,
    query: RecipeCacheQuery,
    limit: number = 5
  ): Promise<Recipe[]> {
    try {
      // Build dynamic SQL query based on preferences
      let sqlQuery = `
        SELECT * FROM recipes 
        WHERE title IS NOT NULL 
          AND title != ''
          AND ingredients IS NOT NULL 
          AND instructions IS NOT NULL
          AND cook_time > 0
          AND servings > 0
          AND user_id != $1
      `;
      
      const params: any[] = [userId]; // Exclude user's own recipes
      let paramIndex = 2;
      
      // Filter by cuisine if specified
      if (query.cuisine && query.cuisine.length > 0) {
        const cuisinePlaceholders = query.cuisine.map(() => `$${paramIndex++}`).join(', ');
        sqlQuery += ` AND LOWER(cuisine) = ANY(ARRAY[${cuisinePlaceholders}])`;
        params.push(...query.cuisine.map(c => c.toLowerCase()));
      }
      
      // Filter by difficulty if specified
      if (query.difficulty) {
        sqlQuery += ` AND LOWER(difficulty) = $${paramIndex++}`;
        params.push(query.difficulty.toLowerCase());
      }
      
      // Filter by max cook time if specified
      if (query.cookTime) {
        sqlQuery += ` AND cook_time <= $${paramIndex++}`;
        params.push(query.cookTime);
      }
      
      // Exclude already shown recipes
      if (query.excludeIds && query.excludeIds.length > 0) {
        const excludePlaceholders = query.excludeIds.map(() => `$${paramIndex++}`).join(', ');
        sqlQuery += ` AND id NOT IN (${excludePlaceholders})`;
        params.push(...query.excludeIds);
      }
      
      // Order by random for variety, limit results
      sqlQuery += ` ORDER BY RANDOM() LIMIT $${paramIndex}`;
      params.push(limit);
      
      console.log('🎯 Cache query for free user:', { 
        query, 
        limit, 
        paramCount: params.length 
      });
      
      const result = await storage.executeRawQuery(sqlQuery, params);
      
      if (result.rows && result.rows.length > 0) {
        console.log(`✅ Found ${result.rows.length} cached recipes for free user`);
        
        // Scale servings to match user preferences if needed
        const recipes = result.rows.map((row: any) => {
          if (query.servings && row.servings !== query.servings) {
            return this.scaleRecipeServings(row, query.servings);
          }
          return row;
        });
        
        return recipes;
      }
      
      console.log('⚠️ No cached recipes found with exact criteria - trying fallback strategies...');
      return await this.performFallbackSearch(userId, query, limit);
      
    } catch (error) {
      console.error('❌ Error fetching cached recipes:', error);
      return [];
    }
  }
  
  /**
   * Progressive fallback search when exact criteria don't match
   * Gradually broaden criteria to ensure users always get helpful results
   */
  private static async performFallbackSearch(
    userId: number,
    originalQuery: RecipeCacheQuery,
    limit: number
  ): Promise<Recipe[]> {
    console.log('🔄 Starting progressive fallback search...');
    
    // Strategy 1: Keep cuisine, relax dietary restrictions
    if (originalQuery.cuisine && originalQuery.dietary) {
      console.log('📍 Fallback 1: Same cuisine, ignore dietary restrictions');
      const relaxedQuery = { 
        ...originalQuery, 
        dietary: undefined 
      };
      const results = await this.executeCacheQuery(userId, relaxedQuery, limit);
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} recipes with relaxed dietary restrictions`);
        return results;
      }
    }
    
    // Strategy 2: Similar cuisines (expand cuisine categories)
    if (originalQuery.cuisine) {
      console.log('📍 Fallback 2: Similar cuisines');
      const expandedCuisines = this.expandCuisineCategories(originalQuery.cuisine);
      const similarQuery = { 
        ...originalQuery, 
        cuisine: expandedCuisines,
        dietary: undefined 
      };
      const results = await this.executeCacheQuery(userId, similarQuery, Math.min(limit, 3));
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} recipes with similar cuisines`);
        return results;
      }
    }
    
    // Strategy 3: Honor dietary restrictions, ignore cuisine
    if (originalQuery.dietary) {
      console.log('📍 Fallback 3: Any cuisine with dietary restrictions');
      const dietaryOnlyQuery = { 
        ...originalQuery, 
        cuisine: undefined 
      };
      const results = await this.executeCacheQuery(userId, dietaryOnlyQuery, Math.min(limit, 3));
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} recipes honoring dietary restrictions`);
        return results;
      }
    }
    
    // Strategy 4: Popular recipes regardless of specific criteria
    console.log('📍 Fallback 4: Most popular recipes');
    const popularQuery = {
      cookTime: originalQuery.cookTime, // Keep time constraints if any
      servings: originalQuery.servings,
      excludeIds: originalQuery.excludeIds
    };
    const results = await this.executeCacheQuery(userId, popularQuery, Math.min(limit, 2));
    if (results.length > 0) {
      console.log(`✅ Found ${results.length} popular recipes as final fallback`);
      return results;
    }
    
    // Strategy 5: Absolute fallback - any quality recipe
    console.log('📍 Fallback 5: Any quality recipe available');
    const anyQuery = { excludeIds: originalQuery.excludeIds };
    const finalResults = await this.executeCacheQuery(userId, anyQuery, 1);
    
    if (finalResults.length > 0) {
      console.log(`✅ Found ${finalResults.length} recipes as absolute fallback`);
      return finalResults;
    }
    
    console.log('❌ No cached recipes available at all - attempting simplified AI fallback...');
    return await this.generateSimplifiedAIFallback(originalQuery);
  }
  
  /**
   * Execute cache query with given criteria
   */
  private static async executeCacheQuery(
    userId: number, 
    query: RecipeCacheQuery, 
    limit: number
  ): Promise<Recipe[]> {
    try {
      let sqlQuery = `
        SELECT * FROM recipes 
        WHERE title IS NOT NULL 
          AND title != ''
          AND ingredients IS NOT NULL 
          AND instructions IS NOT NULL
          AND cook_time > 0
          AND servings > 0
          AND user_id != $1
      `;
      
      const params: any[] = [userId];
      let paramIndex = 2;
      
      // Apply filters same as main query
      if (query.cuisine && query.cuisine.length > 0) {
        const cuisinePlaceholders = query.cuisine.map(() => `$${paramIndex++}`).join(', ');
        sqlQuery += ` AND LOWER(cuisine) = ANY(ARRAY[${cuisinePlaceholders}])`;
        params.push(...query.cuisine.map(c => c.toLowerCase()));
      }
      
      if (query.difficulty) {
        sqlQuery += ` AND LOWER(difficulty) = $${paramIndex++}`;
        params.push(query.difficulty.toLowerCase());
      }
      
      if (query.cookTime) {
        sqlQuery += ` AND cook_time <= $${paramIndex++}`;
        params.push(query.cookTime);
      }
      
      if (query.excludeIds && query.excludeIds.length > 0) {
        const excludePlaceholders = query.excludeIds.map(() => `$${paramIndex++}`).join(', ');
        sqlQuery += ` AND id NOT IN (${excludePlaceholders})`;
        params.push(...query.excludeIds);
      }
      
      sqlQuery += ` ORDER BY RANDOM() LIMIT $${paramIndex}`;
      params.push(limit);
      
      const result = await storage.executeRawQuery(sqlQuery, params);
      return result.rows || [];
      
    } catch (error) {
      console.error('❌ Error in fallback cache query:', error);
      return [];
    }
  }
  
  /**
   * Expand cuisine categories to include similar cuisines
   */
  private static expandCuisineCategories(cuisines: string[]): string[] {
    const expanded = new Set<string>();
    
    // Add original cuisines
    cuisines.forEach(c => expanded.add(c.toLowerCase()));
    
    // Expand based on cuisine families
    cuisines.forEach(cuisine => {
      const c = cuisine.toLowerCase();
      
      // Asian cuisine family
      if (['chinese', 'thai', 'vietnamese', 'korean', 'japanese'].includes(c)) {
        expanded.add('chinese');
        expanded.add('thai');
        expanded.add('asian');
      }
      
      // European cuisine family  
      if (['italian', 'french', 'spanish', 'greek', 'mediterranean'].includes(c)) {
        expanded.add('italian');
        expanded.add('mediterranean');
        expanded.add('european');
      }
      
      // British/American family
      if (['british', 'american', 'comfort'].includes(c)) {
        expanded.add('british');
        expanded.add('american');
        expanded.add('comfort');
      }
      
      // Indian/Middle Eastern family
      if (['indian', 'middle eastern', 'persian', 'turkish'].includes(c)) {
        expanded.add('indian');
        expanded.add('middle eastern');
      }
    });
    
    return Array.from(expanded);
  }
  
  /**
   * Generate simplified AI fallback when no cached recipes are available
   * Uses template-based generation for minimal cost
   */
  private static async generateSimplifiedAIFallback(query: RecipeCacheQuery): Promise<Recipe[]> {
    try {
      console.log('🤖 Generating simplified AI fallback recipe...');
      
      // Build a very basic prompt based on the original query
      const cuisine = query.cuisine?.[0] || 'comfort food';
      const cookTime = query.cookTime || 30;
      const servings = query.servings || 4;
      const dietary = query.dietary?.join(', ') || '';
      
      const prompt = `Generate 1 simple ${cuisine} recipe that:
- Takes ${cookTime} minutes or less
- Serves ${servings} people
${dietary ? `- Is ${dietary}` : ''}
- Uses common ingredients
- Has basic cooking methods only

Return ONLY valid JSON with this exact structure:
{
  "title": "Recipe Name",
  "cuisine": "${cuisine}",
  "difficulty": "easy", 
  "cookTime": ${cookTime},
  "servings": ${servings},
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "description": "Brief description"
}`;

      // Use a simple OpenAI call with minimal tokens
      const openai = await import('openai');
      const client = new openai.default({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini', // Cheapest model
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful recipe generator. Always return valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500, // Very limited
        temperature: 0.3 // Low creativity for consistency
      });
      
      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        console.log('❌ No content from AI fallback');
        return [];
      }
      
      // Parse the JSON response
      let recipeData;
      try {
        recipeData = JSON.parse(content);
      } catch (parseError) {
        console.log('❌ Failed to parse AI fallback JSON:', parseError);
        return [];
      }
      
      // Create a basic recipe object that matches our schema
      const fallbackRecipe: Recipe = {
        id: Date.now(), // Temporary ID - will be replaced when saved
        userId: 0, // System generated
        title: recipeData.title || 'Simple Recipe',
        cuisine: recipeData.cuisine || cuisine,
        difficulty: 'easy',
        cookTime: recipeData.cookTime || cookTime,
        servings: recipeData.servings || servings,
        ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
        instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
        description: recipeData.description || 'A simple, easy-to-make recipe.',
        isShared: false,
        shareId: null,
        imageUrl: null,
        createdAt: new Date()
      };
      
      console.log('✅ Generated simplified AI fallback recipe:', fallbackRecipe.title);
      
      // Add a special marker so we know this is a fallback
      fallbackRecipe.description = `${fallbackRecipe.description}\n\n💡 This recipe was generated when we couldn't find matching recipes in our collection. For more personalized options, consider upgrading to Flavr+!`;
      
      return [fallbackRecipe];
      
    } catch (error) {
      console.error('❌ Error generating AI fallback:', error);
      return [];
    }
  }

  /**
   * Scale recipe ingredients and servings to match user household size
   */
  private static scaleRecipeServings(recipe: any, targetServings: number): Recipe {
    if (!recipe.servings || recipe.servings === targetServings) {
      return recipe;
    }
    
    const scaleFactor = targetServings / recipe.servings;
    console.log(`🔄 Scaling recipe "${recipe.title}" from ${recipe.servings} to ${targetServings} servings`);
    
    // Scale ingredients (basic implementation - could be enhanced)
    let scaledIngredients = recipe.ingredients;
    if (Array.isArray(scaledIngredients)) {
      scaledIngredients = scaledIngredients.map((ingredient: string) => {
        // Simple scaling for numeric values in ingredients
        // This is a basic implementation - could be made more sophisticated
        return ingredient.replace(/(\d+(?:\.\d+)?)/g, (match: string) => {
          const num = parseFloat(match);
          const scaled = (num * scaleFactor).toFixed(2);
          return parseFloat(scaled).toString();
        });
      });
    }
    
    return {
      ...recipe,
      servings: targetServings,
      ingredients: scaledIngredients
    };
  }
  
  /**
   * Get recipe variety statistics for cache optimization
   */
  static async getCacheStatistics(): Promise<{
    totalRecipes: number;
    cuisineDistribution: Record<string, number>;
    difficultyDistribution: Record<string, number>;
    averageCookTime: number;
  }> {
    try {
      const stats = await storage.executeRawQuery(`
        SELECT 
          COUNT(*) as total_recipes,
          AVG(cook_time) as avg_cook_time
        FROM recipes 
        WHERE title IS NOT NULL 
          AND ingredients IS NOT NULL 
          AND instructions IS NOT NULL
      `);
      
      const cuisineStats = await storage.executeRawQuery(`
        SELECT LOWER(cuisine) as cuisine, COUNT(*) as count
        FROM recipes 
        WHERE cuisine IS NOT NULL
        GROUP BY LOWER(cuisine)
        ORDER BY count DESC
      `);
      
      const difficultyStats = await storage.executeRawQuery(`
        SELECT LOWER(difficulty) as difficulty, COUNT(*) as count
        FROM recipes 
        WHERE difficulty IS NOT NULL
        GROUP BY LOWER(difficulty)
        ORDER BY count DESC
      `);
      
      const cuisineDistribution: Record<string, number> = {};
      if (cuisineStats.rows) {
        cuisineStats.rows.forEach((row: any) => {
          cuisineDistribution[row.cuisine] = parseInt(row.count);
        });
      }
      
      const difficultyDistribution: Record<string, number> = {};
      if (difficultyStats.rows) {
        difficultyStats.rows.forEach((row: any) => {
          difficultyDistribution[row.difficulty] = parseInt(row.count);
        });
      }
      
      return {
        totalRecipes: stats.rows?.[0]?.total_recipes || 0,
        cuisineDistribution,
        difficultyDistribution,
        averageCookTime: Math.round(stats.rows?.[0]?.avg_cook_time || 0)
      };
      
    } catch (error) {
      console.error('❌ Error getting cache statistics:', error);
      return {
        totalRecipes: 0,
        cuisineDistribution: {},
        difficultyDistribution: {},
        averageCookTime: 0
      };
    }
  }
  
  /**
   * Check if we have enough cached recipes for a specific cuisine/difficulty combination
   */
  static async hasEnoughCachedRecipes(
    cuisine: string, 
    difficulty: string, 
    minCount: number = 3
  ): Promise<boolean> {
    try {
      const result = await storage.executeRawQuery(`
        SELECT COUNT(*) as count
        FROM recipes 
        WHERE LOWER(cuisine) = $1
          AND LOWER(difficulty) = $2
          AND title IS NOT NULL 
          AND ingredients IS NOT NULL 
          AND instructions IS NOT NULL
      `, [cuisine.toLowerCase(), difficulty.toLowerCase()]);
      
      const count = result.rows?.[0]?.count || 0;
      return parseInt(count) >= minCount;
      
    } catch (error) {
      console.error('❌ Error checking cached recipe availability:', error);
      return false;
    }
  }
}