import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isPlus: boolean("is_plus").default(false),
  recipesThisMonth: integer("recipes_this_month").default(0),
  imagesThisMonth: integer("images_this_month").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  message: text("message").notNull(),
  response: text("response").notNull(),
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

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
