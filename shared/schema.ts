import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  hasFlavrPlus: boolean("has_flavr_plus").default(false),
  subscriptionTier: text("subscription_tier").default("free"),
  recipesThisMonth: integer("recipes_this_month").default(0),
  imagesThisMonth: integer("images_this_month").default(0),
  monthlyRecipeLimit: integer("monthly_recipe_limit").default(3),
  monthlyImageLimit: integer("monthly_image_limit").default(3),
  recipesGenerated: integer("recipes_generated").default(0),
  imagesGenerated: integer("images_generated").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  lastMonthlyReset: timestamp("last_monthly_reset").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pseudo-users table for tracking free usage without authentication
export const pseudoUsers = pgTable("pseudo_users", {
  id: serial("id").primaryKey(),
  pseudoId: text("pseudo_id").notNull().unique(), // Client-generated persistent ID
  recipesThisMonth: integer("recipes_this_month").default(0),
  monthlyRecipeLimit: integer("monthly_recipe_limit").default(3),
  lastMonthlyReset: timestamp("last_monthly_reset").defaultNow(),
  browserFingerprint: text("browser_fingerprint"), // Optional anti-abuse measure
  createdAt: timestamp("created_at").defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  cookTime: integer("cook_time"), // in minutes
  servings: integer("servings"),
  difficulty: text("difficulty"), // easy, medium, hard
  cuisine: text("cuisine"),
  mood: text("mood"),
  mode: text("mode").notNull(), // shopping, fridge, chef
  ingredients: jsonb("ingredients").$type<string[]>().notNull(),
  instructions: jsonb("instructions").$type<string[]>().notNull(),
  tips: text("tips"),
  imageUrl: text("image_url"),
  shoppingList: jsonb("shopping_list").$type<string[]>(),
  originalPrompt: text("original_prompt"),
  // Enhanced fields for full context storage
  ambition: text("ambition"),
  dietary: jsonb("dietary").$type<string[]>(),
  equipment: jsonb("equipment").$type<string[]>(),
  budget: text("budget"),
  cookingTime: integer("cooking_time_preference"), // user's time preference from quiz
  quizData: jsonb("quiz_data").$type<Record<string, any>>(), // complete quiz context
  recipeText: text("recipe_text"), // full formatted recipe output
  isShared: boolean("is_shared").default(false),
  shareId: text("share_id").unique(), // for public sharing links
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  message: text("message").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const developerLogs = pgTable("developer_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  mode: text("mode").notNull(), // shopping, fridge, chef
  quizInputs: jsonb("quiz_inputs").$type<Record<string, any>>().notNull(),
  promptSent: text("prompt_sent").notNull(),
  gptResponse: text("gpt_response").notNull(),
  expectedOutput: jsonb("expected_output").$type<Record<string, any>>().notNull(),
  actualOutput: jsonb("actual_output").$type<Record<string, any>>().notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  estimatedCost: text("estimated_cost").notNull(), // in USD
  matchStatus: boolean("match_status").notNull(),
  discrepancies: jsonb("discrepancies").$type<string[]>(),
  // Stable Diffusion tracking
  imagePrompt: text("image_prompt"),
  imageGenerated: boolean("image_generated").default(false),
  imageUrl: text("image_url"),
  imageCost: text("image_cost"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced recipe generation logs for analytics and AI training
export const recipeGenerationLogs = pgTable("recipe_generation_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // email or anonymous ID
  mode: text("mode").notNull(), // shopping, fridge, chef, rituals
  gptVersion: text("gpt_version").default("gpt-4o"),
  
  // Recipe card selected (from Tinder cards)
  recipeCardSelected: jsonb("recipe_card_selected").$type<{
    title: string;
    description: string;
  }>(),
  
  // Final recipe output
  recipeOutput: jsonb("recipe_output").$type<{
    title: string;
    cuisine?: string;
    difficulty: string;
    servings: number;
    cookTime: number;
    ingredients: string[];
    instructions: string[];
    tips?: string;
  }>().notNull(),
  
  // Image generation data
  imageGenerated: text("image_generated"), // URL or base64
  
  // User intent and preferences
  intentData: jsonb("intent_data").$type<{
    mood?: string;
    ambition?: string;
    diet?: string[];
    time?: number;
    budget?: string;
    equipment?: string[];
    cuisinePreference?: string;
    ingredientVariety?: string;
    reusabilityPreference?: string;
    ingredients?: string[]; // for fridge mode
    flexibility?: string; // for fridge mode
  }>().notNull(),
  
  // User actions and engagement
  userAction: jsonb("user_action").$type<{
    saved?: boolean;
    addedToShoppingList?: boolean;
    shared?: boolean;
    feedback?: string;
    chatbotUsed?: boolean;
    chatbotQueries?: string[];
  }>().default({}),
  
  // Source prompts for AI training
  sourcePrompt1: text("source_prompt_1"), // Tinder card generation prompt
  sourcePrompt2: text("source_prompt_2"), // Full recipe generation prompt
  
  // Analytics metadata
  sessionId: text("session_id"),
  browserFingerprint: text("browser_fingerprint"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  recipesThisMonth: true,
  imagesThisMonth: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
});

export const insertPseudoUserSchema = createInsertSchema(pseudoUsers).omit({
  id: true,
  createdAt: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertDeveloperLogSchema = createInsertSchema(developerLogs).omit({
  id: true,
  createdAt: true,
});

export const insertRecipeGenerationLogSchema = createInsertSchema(recipeGenerationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPseudoUser = z.infer<typeof insertPseudoUserSchema>;
export type PseudoUser = typeof pseudoUsers.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertDeveloperLog = z.infer<typeof insertDeveloperLogSchema>;
export type DeveloperLog = typeof developerLogs.$inferSelect;
export type InsertRecipeGenerationLog = z.infer<typeof insertRecipeGenerationLogSchema>;
export type RecipeGenerationLog = typeof recipeGenerationLogs.$inferSelect;
