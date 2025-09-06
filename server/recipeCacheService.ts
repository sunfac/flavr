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
      
      console.log('⚠️ No cached recipes found matching criteria');
      return [];
      
    } catch (error) {
      console.error('❌ Error fetching cached recipes:', error);
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