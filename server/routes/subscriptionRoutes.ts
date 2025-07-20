import type { Express } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { requireAuth } from "./authRoutes";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export function registerSubscriptionRoutes(app: Express) {
  // Usage check endpoint
  app.post("/api/usage/check", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user has Flavr+ subscription
      if (user.hasFlavrPlus) {
        return res.json({
          canGenerate: true,
          remaining: "unlimited",
          isPlus: true
        });
      }

      // For free users, check usage in current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const monthlyUsage = await storage.getMonthlyUsage(user.id, monthStart);
      const remaining = Math.max(0, 3 - monthlyUsage);
      
      res.json({
        canGenerate: remaining > 0,
        remaining,
        isPlus: false
      });
    } catch (error) {
      console.error("Usage check error:", error);
      res.status(500).json({ error: "Failed to check usage" });
    }
  });

  // Usage increment endpoint
  app.post("/api/usage/increment", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't increment for Flavr+ users
      if (user.hasFlavrPlus) {
        return res.json({ success: true, remaining: "unlimited" });
      }

      // Increment usage for free users
      await storage.incrementUsage(user.id);
      
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyUsage = await storage.getMonthlyUsage(user.id, monthStart);
      const remaining = Math.max(0, 3 - monthlyUsage);
      
      res.json({ success: true, remaining });
    } catch (error) {
      console.error("Usage increment error:", error);
      res.status(500).json({ error: "Failed to increment usage" });
    }
  });

  // Usage reset endpoint (admin)
  app.post("/api/usage/reset", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Reset monthly usage for user
      await storage.resetMonthlyUsage(req.session.userId);
      
      res.json({ success: true, message: "Usage reset successfully" });
    } catch (error) {
      console.error("Usage reset error:", error);
      res.status(500).json({ error: "Failed to reset usage" });
    }
  });

  // Stripe webhook endpoint
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!endpointSecret) {
        console.error("Stripe webhook secret not configured");
        return res.status(400).json({ error: "Webhook secret not configured" });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        console.error(`Webhook signature verification failed:`, err);
        return res.status(400).json({ error: "Invalid signature" });
      }

      console.log(`🔔 Stripe webhook received: ${event.type}`);

      // Handle the event
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await handleSubscriptionCanceled(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Create Stripe checkout session
  app.post("/api/create-checkout-session", requireAuth, async (req, res) => {
    try {
      const { priceId, successUrl, cancelUrl } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl || `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${req.headers.origin}/subscribe`,
        customer_email: user.email,
        metadata: {
          userId: user.id.toString(),
        },
      });

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Create checkout session error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Get subscription status
  app.get("/api/subscription/status", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        hasFlavrPlus: user.hasFlavrPlus || false,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionProvider: user.subscriptionProvider
      });
    } catch (error) {
      console.error("Get subscription status error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });
}

// Subscription event handlers
async function handleSubscriptionUpdated(subscription: any) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error("No userId in subscription metadata");
      return;
    }

    await storage.updateUserSubscription(parseInt(userId), {
      hasFlavrPlus: subscription.status === 'active',
      subscriptionTier: 'flavr_plus',
      subscriptionStatus: subscription.status,
      subscriptionProvider: 'stripe',
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
    });

    console.log(`✅ Updated subscription for user ${userId}: ${subscription.status}`);
  } catch (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error("No userId in subscription metadata");
      return;
    }

    await storage.updateUserSubscription(parseInt(userId), {
      hasFlavrPlus: false,
      subscriptionStatus: 'canceled',
    });

    console.log(`✅ Canceled subscription for user ${userId}`);
  } catch (error) {
    console.error("Error canceling subscription:", error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    console.log(`💳 Payment failed for invoice ${invoice.id}`);
    // Could add logic to notify user or retry payment
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}