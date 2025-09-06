import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  hasFlavrPlus: boolean("has_flavr_plus").default(false),
  subscriptionTier: text("subscription_tier").default("free"), // "free", "monthly", "annual"
  subscriptionStatus: text("subscription_status").default("inactive"), // "active", "canceled", "past_due", "inactive"
  subscriptionProvider: text("subscription_provider").default("none"), // "stripe", "apple", "google", "none"
  recipesThisMonth: integer("recipes_this_month").default(0),
  imagesThisMonth: integer("images_this_month").default(0),
  monthlyRecipeLimit: integer("monthly_recipe_limit").default(3),
  monthlyImageLimit: integer("monthly_image_limit").default(3),
  recipesGenerated: integer("recipes_generated").default(0),
  imagesGenerated: integer("images_generated").default(0),
  // Stripe subscription data
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Apple App Store subscription data
  appleOriginalTransactionId: text("apple_original_transaction_id"),
  appleReceiptData: text("apple_receipt_data"),
  // Google Play Store subscription data
  googlePurchaseToken: text("google_purchase_token"),
  googleOrderId: text("google_order_id"),
  googleProductId: text("google_product_id"),
  // OAuth authentication fields
  oauthProvider: text("oauth_provider"), // 'google', 'apple', null for email
  oauthId: text("oauth_id"), // OAuth provider's user ID
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImage: text("profile_image"),
  // Biometric authentication fields
  biometricEnabled: boolean("biometric_enabled").default(false),
  biometricCredentialId: text("biometric_credential_id"),
  // Universal subscription tracking
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  subscriptionRenewDate: timestamp("subscription_renew_date"),
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
  // Sub-recipe tracking
  parentRecipeId: integer("parent_recipe_id"), // Links to parent recipe (self-reference)
  isSubRecipe: boolean("is_sub_recipe").default(false),
  subRecipeFor: text("sub_recipe_for"), // Which ingredient this is a sub-recipe for
  subRecipeIds: jsonb("sub_recipe_ids").$type<number[]>(), // IDs of related sub-recipes
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

// AI Cost tracking for developer analytics
export const aiCosts = pgTable("ai_costs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"), // For anonymous users
  provider: text("provider").notNull(), // openai, google, replicate, etc.
  model: text("model"), // gpt-4o, gemini-pro, etc.
  operation: text("operation").notNull(), // recipe-generation, chat, image-generation, etc.
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  costUsd: text("cost_usd").notNull(), // Store as string to avoid floating point issues
  requestData: jsonb("request_data").$type<Record<string, any>>(), // Additional context
  responseData: jsonb("response_data").$type<Record<string, any>>(), // Response metadata
  timestamp: timestamp("timestamp").defaultNow(),
  monthYear: text("month_year").notNull(), // Format: "YYYY-MM" for easy monthly aggregation
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
  
  // Data integrity and validation
  recipeFingerprint: text("recipe_fingerprint").notNull(), // SHA256 hash for validation
  
  // Analytics metadata
  sessionId: text("session_id"),
  browserFingerprint: text("browser_fingerprint"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User interaction logs for analytics and debugging
export const interactionLogs = pgTable("interaction_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // FK to users table
  pseudoUserId: text("pseudo_user_id"), // For anonymous users
  sessionId: text("session_id"), // Browser session identifier
  interactionType: text("interaction_type").notNull(), // page_view, button_click, form_submit, recipe_generated, etc.
  page: text("page"), // current page/route
  component: text("component"), // specific component that triggered the interaction
  action: text("action"), // specific action taken
  data: jsonb("data").$type<Record<string, any>>().notNull(), // structured interaction data
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  browserFingerprint: text("browser_fingerprint"),
  timestamp: timestamp("timestamp").defaultNow(),
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

export const insertInteractionLogSchema = createInsertSchema(interactionLogs).omit({
  id: true,
  timestamp: true,
});

// Sessions table for persistent login across server restarts
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// User cooking preferences for Zest AI memory
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  pseudoUserId: integer("pseudo_user_id").references(() => pseudoUsers.id),
  
  // Cooking preferences
  preferredCuisines: jsonb("preferred_cuisines").$type<string[]>(),
  dietaryRestrictions: jsonb("dietary_restrictions").$type<string[]>(),
  avoidedIngredients: jsonb("avoided_ingredients").$type<string[]>(),
  favoriteIngredients: jsonb("favorite_ingredients").$type<string[]>(),
  
  // Cooking style and skills
  skillLevel: text("skill_level"), // "beginner", "intermediate", "advanced"
  timePreference: integer("time_preference"), // usual cooking time in minutes
  budgetPreference: text("budget_preference"), // "budget", "moderate", "premium"
  ambitionLevel: text("ambition_level"), // "quick", "balanced", "ambitious"
  
  // Equipment and kitchen setup
  availableEquipment: jsonb("available_equipment").$type<string[]>(),
  kitchenSize: text("kitchen_size"), // "small", "medium", "large"
  
  // Personal preferences
  spiceLevel: text("spice_level"), // "mild", "medium", "hot"
  cookingMood: text("cooking_mood"), // last expressed mood preference
  
  // Memory and context
  lastInteractionTopics: jsonb("last_interaction_topics").$type<string[]>(),
  mentionedPreferences: jsonb("mentioned_preferences").$type<Record<string, any>>(),
  cookingGoals: text("cooking_goals"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertAiCostSchema = createInsertSchema(aiCosts).omit({
  id: true,
  timestamp: true,
});

// Weekly meal plans for Flavr+ subscription feature
export const weeklyPlans = pgTable("weekly_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  
  // Plan identification
  weekStartDate: timestamp("week_start_date").notNull(), // Monday of the week
  weekEndDate: timestamp("week_end_date").notNull(), // Sunday of the week
  planStatus: text("plan_status").notNull().default("pending"), // "pending", "accepted", "adjusted", "skipped"
  
  // Plan generation metadata
  generatedAt: timestamp("generated_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  adjustedAt: timestamp("adjusted_at"),
  skipReason: text("skip_reason"),
  
  // Meal assignments (IDs of recipes in the plan)
  plannedRecipes: jsonb("planned_recipes").$type<Array<{
    day: string; // "monday", "tuesday", etc.
    mealType: string; // "dinner" primarily, could expand to "lunch"
    recipeId: number;
    recipeTitle: string;
    cookTime: number;
    servings: number;
    isFlexible: boolean; // can be swapped easily
  }>>().notNull(),
  
  // User preferences snapshot for this plan
  preferencesSnapshot: jsonb("preferences_snapshot").$type<{
    householdSize: { adults: number; kids: number };
    cookingFrequency: number; // meals per week
    timeComfort: { weeknight: number; weekend: number };
    cuisineWeighting: Record<string, number>; // e.g. {"italian": 40, "asian": 20}
    ambitionLevel: string;
    dietaryNeeds: string[];
    budgetPerServing?: number; // Flavr+ only
  }>(),
  
  // Shopping list and logistics
  consolidatedShoppingList: jsonb("consolidated_shopping_list").$type<Array<{
    ingredient: string;
    quantity: string;
    aisle: string;
    recipes: string[]; // which recipes need this ingredient
  }>>(),
  
  // Export and calendar integration
  icsExported: boolean("ics_exported").default(false),
  icsExportedAt: timestamp("ics_exported_at"),
  calendarData: jsonb("calendar_data").$type<{
    events: Array<{
      title: string;
      date: string;
      time: string;
      duration: number;
    }>;
  }>(),
  
  // Analytics and engagement
  viewedAt: timestamp("viewed_at"),
  lastInteractedAt: timestamp("last_interacted_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// User onboarding and weekly planning preferences
export const weeklyPlanPreferences = pgTable("weekly_plan_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  
  // Core onboarding data
  householdSize: jsonb("household_size").$type<{
    adults: number;
    kids: number;
  }>().notNull(),
  
  cookingFrequency: integer("cooking_frequency").notNull(), // meals per week (2, 4, 6)
  
  timeComfort: jsonb("time_comfort").$type<{
    weeknight: number; // max minutes 20-30
    weekend: number; // max minutes 45-60
  }>().notNull(),
  
  ambitionLevel: text("ambition_level").notNull(), // "quick_simple", "balanced", "experimental_creative"
  
  // Dietary and restrictions
  dietaryNeeds: jsonb("dietary_needs").$type<string[]>().notNull().default([]),
  
  // Flavr+ premium preferences
  cuisineWeighting: jsonb("cuisine_weighting").$type<Record<string, number>>(), // {"italian": 40, "asian": 20, etc}
  cuisinePreferences: jsonb("cuisine_preferences").$type<string[]>().default([]), // ["italian", "asian", "british", etc]
  budgetPerServing: integer("budget_per_serving"), // in pence, Flavr+ only
  
  // Auto-generation settings
  autoGenerateEnabled: boolean("auto_generate_enabled").default(true),
  generationDay: text("generation_day").default("sunday"), // when to auto-generate
  generationTime: text("generation_time").default("09:00"), // time to auto-generate
  
  // Notification preferences
  planReadyNotifications: boolean("plan_ready_notifications").default(true),
  cookingReminders: boolean("cooking_reminders").default(true),
  shoppingListReminders: boolean("shopping_list_reminders").default(true),
  
  // Onboarding completion
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWeeklyPlanSchema = createInsertSchema(weeklyPlans).omit({
  id: true,
  createdAt: true,
  generatedAt: true,
});

export const insertWeeklyPlanPreferencesSchema = createInsertSchema(weeklyPlanPreferences).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
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
export type InsertInteractionLog = z.infer<typeof insertInteractionLogSchema>;
export type InteractionLog = typeof interactionLogs.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertAiCost = z.infer<typeof insertAiCostSchema>;
export type AiCost = typeof aiCosts.$inferSelect;
export type InsertWeeklyPlan = z.infer<typeof insertWeeklyPlanSchema>;
export type WeeklyPlan = typeof weeklyPlans.$inferSelect;
export type InsertWeeklyPlanPreferences = z.infer<typeof insertWeeklyPlanPreferencesSchema>;
export type WeeklyPlanPreferences = typeof weeklyPlanPreferences.$inferSelect;
