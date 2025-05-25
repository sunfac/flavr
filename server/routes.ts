import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertRecipeSchema, insertChatMessageSchema } from "@shared/schema";

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser({ username, email, password });
      req.session!.userId = user.id;
      res.json({ user: { id: user.id, username: user.username, email: user.email, isPlus: user.isPlus } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session!.userId = user.id;
      res.json({ user: { id: user.id, username: user.username, email: user.email, isPlus: user.isPlus } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session?.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: { id: user.id, username: user.username, email: user.email, isPlus: user.isPlus, recipesThisMonth: user.recipesThisMonth } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Recipe generation routes
  app.post("/api/generate-recipe-ideas", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { mode, quizData, prompt } = req.body;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const recipeIdeas = JSON.parse(response.choices[0].message.content!);
      res.json({ recipeIdeas });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate recipe ideas: " + error.message });
    }
  });

  app.post("/api/generate-full-recipe", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check usage limits for non-Plus users
      if (!user.isPlus && user.recipesThisMonth >= 5) {
        return res.status(403).json({ message: "Recipe limit reached. Upgrade to Flavr+ for unlimited access." });
      }

      const { selectedRecipe, mode, quizData, prompt } = req.body;

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const fullRecipe = JSON.parse(response.choices[0].message.content!);

      // Generate image if user has remaining credits
      let imageUrl = null;
      if (user.isPlus || user.imagesThisMonth < 5) {
        try {
          const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A beautiful, appetizing photo of ${fullRecipe.title}, professional food photography, high quality`,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          });
          imageUrl = imageResponse.data[0].url;
          
          // Update image usage
          if (!user.isPlus) {
            await storage.updateUserUsage(user.id, 0, 1);
          }
        } catch (imageError) {
          console.error("Failed to generate image:", imageError);
        }
      }

      // Save recipe to database
      const recipe = await storage.createRecipe({
        userId: user.id,
        title: fullRecipe.title,
        description: fullRecipe.description,
        cookTime: fullRecipe.cookTime,
        servings: fullRecipe.servings,
        difficulty: fullRecipe.difficulty,
        cuisine: quizData.cuisine,
        mood: quizData.mood,
        mode,
        ingredients: fullRecipe.ingredients,
        instructions: fullRecipe.instructions,
        tips: fullRecipe.tips,
        imageUrl,
        shoppingList: fullRecipe.shoppingList,
        originalPrompt: prompt,
      });

      // Update recipe usage for non-Plus users
      if (!user.isPlus) {
        await storage.updateUserUsage(user.id, 1, 0);
      }

      res.json({ recipe });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate full recipe: " + error.message });
    }
  });

  // Enhanced Chat routes with recipe context
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { message, currentRecipe, mode } = req.body;
      const userId = req.session!.userId;

      // Build context-aware system prompt
      let systemPrompt = "You are a friendly, creative private chef who helps users adjust, enhance, and understand their AI-generated recipes. Provide cooking advice, substitutions, and modifications. Keep responses concise and practical.";
      
      if (mode) {
        const modeContext = {
          shopping: "The user is in shopping mode, planning meals and creating shopping lists.",
          fridge: "The user is in fridge-to-fork mode, working with ingredients they already have.",
          chef: "The user is in chef assist mode, looking for expert culinary guidance."
        };
        systemPrompt += ` ${modeContext[mode as keyof typeof modeContext] || ''}`;
      }

      if (currentRecipe) {
        systemPrompt += ` The user is currently working with this recipe: "${currentRecipe.title}". Ingredients: ${currentRecipe.ingredients?.join(', ')}. Instructions: ${currentRecipe.instructions?.join(' ')}`;
      }

      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
      });

      const aiResponse = JSON.parse(response.choices[0].message.content!);
      const botResponse = aiResponse.response || response.choices[0].message.content!;
      
      // Check if AI provided an updated recipe
      let updatedRecipe = null;
      if (aiResponse.updatedRecipe && currentRecipe) {
        updatedRecipe = {
          ...currentRecipe,
          ...aiResponse.updatedRecipe
        };
      }
      
      // Save chat message
      await storage.createChatMessage({
        userId,
        message,
        response: botResponse,
      });

      res.json({ 
        response: botResponse,
        updatedRecipe
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to process chat: " + error.message });
    }
  });

  app.get("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const history = await storage.getChatHistory(userId, 20);
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Recipe routes
  app.get("/api/recipes", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const recipes = await storage.getRecipesByUser(userId);
      res.json({ recipes });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/recipes/:id", requireAuth, async (req, res) => {
    try {
      const recipe = await storage.getRecipe(parseInt(req.params.id));
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      if (recipe.userId !== req.session!.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json({ recipe });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string, {
          expand: ['payment_intent']
        });

        res.json({
          subscriptionId: subscription.id,
          clientSecret: (invoice.payment_intent as any)?.client_secret,
        });
        return;
      }

      if (!user.email) {
        throw new Error('No user email on file');
      }

      let customer;
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
        });
        await storage.updateUserStripeInfo(user.id, customer.id);
      }

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || 'price_test', // This needs to be set by user
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);

      const invoice = subscription.latest_invoice as any;
      res.json({
        subscriptionId: subscription.id,
        clientSecret: invoice.payment_intent.client_secret,
      });
    } catch (error: any) {
      res.status(400).json({ error: { message: error.message } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
