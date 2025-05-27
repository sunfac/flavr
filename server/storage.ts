import { users, recipes, chatMessages, developerLogs, type User, type InsertUser, type Recipe, type InsertRecipe, type ChatMessage, type InsertChatMessage, type DeveloperLog, type InsertDeveloperLog } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserUsage(id: number, recipes: number, images: number): Promise<User>;
  updateUserStripeInfo(id: number, customerId: string, subscriptionId?: string): Promise<User>;
  resetMonthlyUsage(id: number): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recipes: Map<number, Recipe>;
  private chatMessages: Map<number, ChatMessage>;
  private developerLogs: Map<number, DeveloperLog>;
  private currentUserId: number;
  private currentRecipeId: number;
  private currentChatId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.recipes = new Map();
    this.chatMessages = new Map();
    this.developerLogs = new Map();
    this.currentUserId = 1;
    this.currentRecipeId = 1;
    this.currentChatId = 1;
    this.currentLogId = 1;
    
    // Create developer account with unlimited access
    this.createDeveloperAccount();
  }

  private async createDeveloperAccount() {
    const developerUser: User = {
      id: 999,
      username: "william@blycontracting.co.uk",
      email: "william@blycontracting.co.uk",
      password: "flavr1", // In production, this would be hashed
      subscriptionTier: "premium",
      recipesGenerated: 0,
      imagesGenerated: 0,
      monthlyRecipeLimit: 999999,
      monthlyImageLimit: 999999,
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
      isPlus: false,
      recipesThisMonth: 0,
      imagesThisMonth: 0,
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
}

export const storage = new MemStorage();
