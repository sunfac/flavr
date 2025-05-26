import { users, recipes, chatMessages, type User, type InsertUser, type Recipe, type InsertRecipe, type ChatMessage, type InsertChatMessage } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recipes: Map<number, Recipe>;
  private chatMessages: Map<number, ChatMessage>;
  private currentUserId: number;
  private currentRecipeId: number;
  private currentChatId: number;

  constructor() {
    this.users = new Map();
    this.recipes = new Map();
    this.chatMessages = new Map();
    this.currentUserId = 1;
    this.currentRecipeId = 1;
    this.currentChatId = 1;
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

  async getRecipesByUser(userId: number): Promise<Recipe[]> {
    return Array.from(this.recipes.values()).filter(
      (recipe) => recipe.userId === userId,
    );
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    return this.recipes.get(id);
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
