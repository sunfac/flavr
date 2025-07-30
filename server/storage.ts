import { users, recipes, chatMessages, developerLogs, pseudoUsers, interactionLogs, type User, type InsertUser, type Recipe, type InsertRecipe, type ChatMessage, type InsertChatMessage, type DeveloperLog, type InsertDeveloperLog, type PseudoUser, type InsertPseudoUser, recipeGenerationLogs, type RecipeGenerationLog, type InsertRecipeGenerationLog, type InteractionLog, type InsertInteractionLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailOrUsername(emailOrUsername: string): Promise<User | undefined>;
  getUserByOAuth(provider: string, oauthId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserUsage(id: number, recipes: number, images: number): Promise<User>;
  updateUserStripeInfo(id: number, customerId: string, subscriptionId?: string): Promise<User>;
  updateUserSubscription(id: number, updates: Partial<User>): Promise<User>;
  resetMonthlyUsage(id: number): Promise<User>;
  getMonthlyUsage(userId: number, monthStart: Date): Promise<number>;
  incrementUsage(userId: number): Promise<User>;
  
  // Pseudo-user operations for free users
  getPseudoUser(pseudoId: string): Promise<PseudoUser | undefined>;
  createPseudoUser(pseudoUser: InsertPseudoUser): Promise<PseudoUser>;
  updatePseudoUserUsage(pseudoId: string, recipes: number): Promise<PseudoUser>;
  resetPseudoUserMonthlyUsage(pseudoId: string): Promise<PseudoUser>;
  
  // Usage counter methods for quota system
  getUserUsageCount(userId: number): Promise<number>;
  getPseudoUserUsageCount(pseudoId: string): Promise<number>;
  incrementUsageCounter(userIdOrPseudoId: string | number, isAuthenticated: boolean): Promise<void>;
  
  // Usage checking for gating
  checkUsageLimit(userIdOrPseudoId: string | number, isAuthenticated: boolean): Promise<{
    canGenerate: boolean;
    recipesUsed: number;
    recipesLimit: number;
    hasFlavrPlus: boolean;
  }>;
  
  // Recipe operations
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipesByUser(userId: number, limit?: number): Promise<Recipe[]>;
  getRecipe(id: number): Promise<Recipe | undefined>;
  getRecipeByShareId(shareId: string): Promise<Recipe | undefined>;
  updateRecipeSharing(id: number, isShared: boolean, shareId?: string): Promise<Recipe>;
  updateRecipe(id: number, updates: Partial<Recipe>): Promise<Recipe>;
  updateRecipeImage(recipeId: number, imageUrl: string): Promise<void>;
  getUserRecipeHistory(userId: number, limit?: number): Promise<Recipe[]>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(userId: number, limit?: number): Promise<ChatMessage[]>;
  
  // Developer logging operations
  createDeveloperLog(log: InsertDeveloperLog): Promise<DeveloperLog>;
  getDeveloperLogs(limit?: number): Promise<DeveloperLog[]>;
  
  // Enhanced recipe generation logging for analytics
  createRecipeGenerationLog(log: InsertRecipeGenerationLog): Promise<RecipeGenerationLog>;
  getRecipeGenerationLogs(limit?: number): Promise<RecipeGenerationLog[]>;
  
  // User interaction logging for analytics and debugging
  createInteractionLog(log: InsertInteractionLog): Promise<InteractionLog>;
  getInteractionLogs(limit?: number): Promise<InteractionLog[]>;
  getInteractionLogsByUser(userId: number, limit?: number): Promise<InteractionLog[]>;
  getInteractionLogsBySession(sessionId: string, limit?: number): Promise<InteractionLog[]>;
  
  getAllRecipes(): Promise<Recipe[]>;
  deleteRecipe(id: number): Promise<void>;
}



export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByEmailOrUsername(emailOrUsername: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(
        or(
          eq(users.email, emailOrUsername),
          eq(users.username, emailOrUsername)
        )
      );
    return user || undefined;
  }

  async getUserByOAuth(provider: string, oauthId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.oauthProvider, provider),
        eq(users.oauthId, oauthId)
      )
    );
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Only hash password if it's provided (not for OAuth users)
    let userWithPassword = { ...insertUser };
    
    if (insertUser.password) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
      userWithPassword.password = hashedPassword;
    }
    
    const [user] = await db.insert(users).values(userWithPassword).returning();
    return user;
  }

  async updateUserUsage(id: number, recipesUsed: number, imagesUsed: number): Promise<User> {
    const [user] = await db.update(users)
      .set({ recipesThisMonth: recipesUsed, imagesThisMonth: imagesUsed })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: number, customerId: string, subscriptionId?: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSubscription(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getMonthlyUsage(userId: number, monthStart: Date): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;
    
    // Check if we need to reset monthly usage
    const lastReset = user.lastMonthlyReset ? new Date(user.lastMonthlyReset) : new Date(0);
    if (lastReset < monthStart) {
      // Reset usage for new month
      await this.resetMonthlyUsage(userId);
      return 0;
    }
    
    return user.recipesThisMonth || 0;
  }

  async incrementUsage(userId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const [updatedUser] = await db.update(users)
      .set({ 
        recipesThisMonth: (user.recipesThisMonth || 0) + 1,
        recipesGenerated: (user.recipesGenerated || 0) + 1
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async resetMonthlyUsage(userId: number): Promise<User> {
    const [user] = await db.update(users)
      .set({ 
        recipesThisMonth: 0,
        imagesThisMonth: 0,
        lastMonthlyReset: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getPseudoUser(pseudoId: string): Promise<PseudoUser | undefined> {
    const [pseudoUser] = await db.select().from(pseudoUsers).where(eq(pseudoUsers.pseudoId, pseudoId));
    return pseudoUser || undefined;
  }

  async createPseudoUser(insertPseudoUser: InsertPseudoUser): Promise<PseudoUser> {
    const [pseudoUser] = await db.insert(pseudoUsers).values(insertPseudoUser).returning();
    return pseudoUser;
  }

  async updatePseudoUserUsage(pseudoId: string, recipesUsed: number): Promise<PseudoUser> {
    const [pseudoUser] = await db.update(pseudoUsers)
      .set({ recipesThisMonth: recipesUsed })
      .where(eq(pseudoUsers.pseudoId, pseudoId))
      .returning();
    return pseudoUser;
  }

  async resetPseudoUserMonthlyUsage(pseudoId: string): Promise<PseudoUser> {
    const [pseudoUser] = await db.update(pseudoUsers)
      .set({ recipesThisMonth: 0 })
      .where(eq(pseudoUsers.pseudoId, pseudoId))
      .returning();
    return pseudoUser;
  }

  async checkUsageLimit(userIdOrPseudoId: string | number, isAuthenticated: boolean): Promise<{
    canGenerate: boolean;
    recipesUsed: number;
    recipesLimit: number;
    hasFlavrPlus: boolean;
  }> {
    if (isAuthenticated) {
      const user = await this.getUser(userIdOrPseudoId as number);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        canGenerate: user.hasFlavrPlus || (user.recipesThisMonth || 0) < (user.monthlyRecipeLimit || 3),
        recipesUsed: user.recipesThisMonth || 0,
        recipesLimit: user.hasFlavrPlus ? 999 : (user.monthlyRecipeLimit || 3),
        hasFlavrPlus: user.hasFlavrPlus || false
      };
    } else {
      const pseudoUser = await this.getPseudoUser(userIdOrPseudoId as string);
      if (!pseudoUser) {
        throw new Error('Pseudo user not found');
      }

      return {
        canGenerate: (pseudoUser.recipesThisMonth || 0) < (pseudoUser.monthlyRecipeLimit || 3),
        recipesUsed: pseudoUser.recipesThisMonth || 0,
        recipesLimit: pseudoUser.monthlyRecipeLimit || 3,
        hasFlavrPlus: false
      };
    }
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const [recipe] = await db.insert(recipes).values(insertRecipe).returning();
    return recipe;
  }

  async getRecipesByUser(userId: number, limit: number = 20): Promise<Recipe[]> {
    return await db.select().from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(desc(recipes.createdAt))
      .limit(limit);
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe || undefined;
  }

  async getRecipeByShareId(shareId: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.shareId, shareId));
    return recipe || undefined;
  }

  async updateRecipeSharing(id: number, isShared: boolean, shareId?: string): Promise<Recipe> {
    const [recipe] = await db.update(recipes)
      .set({ isShared, shareId })
      .where(eq(recipes.id, id))
      .returning();
    return recipe;
  }

  async updateRecipe(id: number, updates: Partial<Recipe>): Promise<Recipe> {
    const [recipe] = await db.update(recipes)
      .set(updates)
      .where(eq(recipes.id, id))
      .returning();
    return recipe;
  }

  async getUserRecipeHistory(userId: number, limit: number = 20): Promise<Recipe[]> {
    return await db.select().from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(desc(recipes.createdAt))
      .limit(limit);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(insertMessage).returning();
    return message;
  }

  async getChatHistory(userId: number, limit: number = 10): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createDeveloperLog(insertLog: InsertDeveloperLog): Promise<DeveloperLog> {
    const [log] = await db.insert(developerLogs).values(insertLog).returning();
    return log;
  }

  async getDeveloperLogs(limit: number = 50): Promise<DeveloperLog[]> {
    return await db.select().from(developerLogs)
      .orderBy(desc(developerLogs.createdAt))
      .limit(limit);
  }

  async createRecipeGenerationLog(insertLog: InsertRecipeGenerationLog): Promise<RecipeGenerationLog> {
    const [log] = await db.insert(recipeGenerationLogs).values(insertLog).returning();
    return log;
  }

  async getRecipeGenerationLogs(limit: number = 50): Promise<RecipeGenerationLog[]> {
    return await db.select().from(recipeGenerationLogs)
      .orderBy(desc(recipeGenerationLogs.createdAt))
      .limit(limit);
  }

  async createInteractionLog(insertLog: InsertInteractionLog): Promise<InteractionLog> {
    const [log] = await db.insert(interactionLogs).values(insertLog).returning();
    return log;
  }

  async getInteractionLogs(limit: number = 100): Promise<InteractionLog[]> {
    return await db.select().from(interactionLogs)
      .orderBy(desc(interactionLogs.timestamp))
      .limit(limit);
  }

  async getInteractionLogsByUser(userId: number, limit: number = 100): Promise<InteractionLog[]> {
    return await db.select().from(interactionLogs)
      .where(eq(interactionLogs.userId, userId))
      .orderBy(desc(interactionLogs.timestamp))
      .limit(limit);
  }

  async getInteractionLogsBySession(sessionId: string, limit: number = 100): Promise<InteractionLog[]> {
    return await db.select().from(interactionLogs)
      .where(eq(interactionLogs.sessionId, sessionId))
      .orderBy(desc(interactionLogs.timestamp))
      .limit(limit);
  }

  async getAllRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes).orderBy(desc(recipes.createdAt));
  }

  async updateRecipeImage(recipeId: number, imageUrl: string): Promise<void> {
    await db
      .update(recipes)
      .set({ imageUrl })
      .where(eq(recipes.id, recipeId));
  }

  async deleteRecipe(id: number, userId?: number): Promise<void> {
    if (userId) {
      // Delete only if the recipe belongs to the user
      await db.delete(recipes).where(
        and(eq(recipes.id, id), eq(recipes.userId, userId))
      );
    } else {
      // Admin delete - delete any recipe
      await db.delete(recipes).where(eq(recipes.id, id));
    }
  }

  // Usage counter methods for quota system
  async getUserUsageCount(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    return user?.recipesThisMonth || 0;
  }

  async getPseudoUserUsageCount(pseudoId: string): Promise<number> {
    const pseudoUser = await this.getPseudoUser(pseudoId);
    return pseudoUser?.recipesThisMonth || 0;
  }

  async incrementUsageCounter(userIdOrPseudoId: string | number, isAuthenticated: boolean): Promise<void> {
    if (isAuthenticated) {
      const userId = userIdOrPseudoId as number;
      const user = await this.getUser(userId);
      if (user) {
        await db.update(users)
          .set({ recipesThisMonth: (user.recipesThisMonth || 0) + 1 })
          .where(eq(users.id, userId));
      }
    } else {
      const pseudoId = userIdOrPseudoId as string;
      const pseudoUser = await this.getPseudoUser(pseudoId);
      if (pseudoUser) {
        await db.update(pseudoUsers)
          .set({ recipesThisMonth: (pseudoUser.recipesThisMonth || 0) + 1 })
          .where(eq(pseudoUsers.pseudoId, pseudoId));
      }
    }
  }
}

export const storage = new DatabaseStorage();
