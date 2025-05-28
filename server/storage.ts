import { users, recipes, chatMessages, developerLogs, pseudoUsers, type User, type InsertUser, type Recipe, type InsertRecipe, type ChatMessage, type InsertChatMessage, type DeveloperLog, type InsertDeveloperLog, type PseudoUser, type InsertPseudoUser, recipeGenerationLogs, type RecipeGenerationLog, type InsertRecipeGenerationLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserUsage(id: number, recipes: number, images: number): Promise<User>;
  updateUserStripeInfo(id: number, customerId: string, subscriptionId?: string): Promise<User>;
  resetMonthlyUsage(id: number): Promise<User>;
  
  // Pseudo-user operations for free users
  getPseudoUser(pseudoId: string): Promise<PseudoUser | undefined>;
  createPseudoUser(pseudoUser: InsertPseudoUser): Promise<PseudoUser>;
  updatePseudoUserUsage(pseudoId: string, recipes: number): Promise<PseudoUser>;
  resetPseudoUserMonthlyUsage(pseudoId: string): Promise<PseudoUser>;
  
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
  getAllRecipes(): Promise<Recipe[]>;
  deleteRecipe(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recipes: Map<number, Recipe>;
  private chatMessages: Map<number, ChatMessage>;
  private developerLogs: Map<number, DeveloperLog>;
  private pseudoUsers: Map<string, PseudoUser>;
  private currentUserId: number;
  private currentRecipeId: number;
  private currentChatId: number;
  private currentLogId: number;
  private currentPseudoId: number;

  constructor() {
    this.users = new Map();
    this.recipes = new Map();
    this.chatMessages = new Map();
    this.developerLogs = new Map();
    this.pseudoUsers = new Map();
    this.currentUserId = 1;
    this.currentRecipeId = 1;
    this.currentChatId = 1;
    this.currentLogId = 1;
    this.currentPseudoId = 1;
    
    // Create developer account with unlimited access
    this.createDeveloperAccount();
  }

  private async createDeveloperAccount() {
    const developerUser: User = {
      id: 999,
      username: "william@blycontracting.co.uk",
      email: "william@blycontracting.co.uk",
      password: "flavr1", // In production, this would be hashed
      hasFlavrPlus: true,
      subscriptionTier: "premium",
      recipesThisMonth: 0,
      imagesThisMonth: 0,
      monthlyRecipeLimit: 999999,
      monthlyImageLimit: 999999,
      lastMonthlyReset: new Date(),
      createdAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null
    };
    
    this.users.set(999, developerUser);
    console.log("Developer account created: william@blycontracting.co.uk");
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      hasFlavrPlus: false,
      recipesThisMonth: 0,
      imagesThisMonth: 0,
      monthlyRecipeLimit: 3,
      monthlyImageLimit: 10,
      lastMonthlyReset: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserUsage(id: number, recipes: number, images: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = {
      ...user,
      recipesThisMonth: user.recipesThisMonth + recipes,
      imagesThisMonth: user.imagesThisMonth + images,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(id: number, customerId: string, subscriptionId?: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = {
      ...user,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId || user.stripeSubscriptionId,
      isPlus: !!subscriptionId,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async resetMonthlyUsage(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = {
      ...user,
      recipesThisMonth: 0,
      imagesThisMonth: 0,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const id = this.currentRecipeId++;
    const recipe: Recipe = {
      ...insertRecipe,
      id,
      createdAt: new Date(),
    };
    this.recipes.set(id, recipe);
    return recipe;
  }

  async getRecipesByUser(userId: number, limit: number = 50): Promise<Recipe[]> {
    return Array.from(this.recipes.values())
      .filter((recipe) => recipe.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    return this.recipes.get(id);
  }

  async getRecipeByShareId(shareId: string): Promise<Recipe | undefined> {
    return Array.from(this.recipes.values()).find(recipe => recipe.shareId === shareId);
  }

  async updateRecipeSharing(id: number, isShared: boolean, shareId?: string): Promise<Recipe> {
    const recipe = this.recipes.get(id);
    if (!recipe) {
      throw new Error("Recipe not found");
    }
    
    const updatedRecipe = {
      ...recipe,
      isShared,
      shareId: shareId || null
    };
    
    this.recipes.set(id, updatedRecipe);
    return updatedRecipe;
  }

  async getUserRecipeHistory(userId: number, limit: number = 20): Promise<Recipe[]> {
    return Array.from(this.recipes.values())
      .filter((recipe) => recipe.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatId++;
    const message: ChatMessage = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  async getChatHistory(userId: number, limit: number = 10): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter((message) => message.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit);
  }

  async createDeveloperLog(insertLog: InsertDeveloperLog): Promise<DeveloperLog> {
    const id = this.currentLogId++;
    const log: DeveloperLog = {
      id,
      ...insertLog,
      createdAt: new Date(),
    };
    this.developerLogs.set(id, log);
    return log;
  }

  async getDeveloperLogs(limit: number = 50): Promise<DeveloperLog[]> {
    return Array.from(this.developerLogs.values())
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit);
  }

  // Pseudo-user operations for free tier gating
  async getPseudoUser(pseudoId: string): Promise<PseudoUser | undefined> {
    return this.pseudoUsers.get(pseudoId);
  }

  async createPseudoUser(insertPseudoUser: InsertPseudoUser): Promise<PseudoUser> {
    const pseudoUser: PseudoUser = {
      id: this.currentPseudoId++,
      pseudoId: insertPseudoUser.pseudoId,
      browserFingerprint: insertPseudoUser.browserFingerprint || null,
      recipesThisMonth: insertPseudoUser.recipesThisMonth || 0,
      monthlyRecipeLimit: insertPseudoUser.monthlyRecipeLimit || 3,
      lastMonthlyReset: new Date(),
      createdAt: new Date()
    };

    this.pseudoUsers.set(insertPseudoUser.pseudoId, pseudoUser);
    return pseudoUser;
  }

  async updatePseudoUserUsage(pseudoId: string, recipes: number): Promise<PseudoUser> {
    const pseudoUser = this.pseudoUsers.get(pseudoId);
    if (!pseudoUser) {
      throw new Error(`Pseudo user with ID ${pseudoId} not found`);
    }

    pseudoUser.recipesThisMonth = recipes;
    this.pseudoUsers.set(pseudoId, pseudoUser);
    return pseudoUser;
  }

  async resetPseudoUserMonthlyUsage(pseudoId: string): Promise<PseudoUser> {
    const pseudoUser = this.pseudoUsers.get(pseudoId);
    if (!pseudoUser) {
      throw new Error(`Pseudo user with ID ${pseudoId} not found`);
    }

    pseudoUser.recipesThisMonth = 0;
    pseudoUser.lastMonthlyReset = new Date();
    this.pseudoUsers.set(pseudoId, pseudoUser);
    return pseudoUser;
  }

  async checkUsageLimit(userIdOrPseudoId: string | number, isAuthenticated: boolean): Promise<{
    canGenerate: boolean;
    recipesUsed: number;
    recipesLimit: number;
    hasFlavrPlus: boolean;
  }> {
    if (isAuthenticated && typeof userIdOrPseudoId === 'number') {
      const user = await this.getUser(userIdOrPseudoId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        canGenerate: user.hasFlavrPlus || (user.recipesThisMonth || 0) < (user.monthlyRecipeLimit || 3),
        recipesUsed: user.recipesThisMonth || 0,
        recipesLimit: user.monthlyRecipeLimit || 3,
        hasFlavrPlus: user.hasFlavrPlus || false
      };
    } else {
      const pseudoUser = await this.getPseudoUser(userIdOrPseudoId as string);
      if (!pseudoUser) {
        return {
          canGenerate: true,
          recipesUsed: 0,
          recipesLimit: 3,
          hasFlavrPlus: false
        };
      }

      return {
        canGenerate: (pseudoUser.recipesThisMonth || 0) < (pseudoUser.monthlyRecipeLimit || 3),
        recipesUsed: pseudoUser.recipesThisMonth || 0,
        recipesLimit: pseudoUser.monthlyRecipeLimit || 3,
        hasFlavrPlus: false
      };
    }
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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

  async resetMonthlyUsage(id: number): Promise<User> {
    const [user] = await db.update(users)
      .set({ recipesThisMonth: 0, imagesThisMonth: 0 })
      .where(eq(users.id, id))
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

  async getAllRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes).orderBy(desc(recipes.createdAt));
  }

  async deleteRecipe(id: number): Promise<void> {
    await db.delete(recipes).where(eq(recipes.id, id));
  }
}

export const storage = new DatabaseStorage();
