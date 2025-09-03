import type { Express } from "express";
import express from "express";
import Stripe from "stripe";
import { storage } from "../storage";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Define subscription prices (you'll need to create these in Stripe Dashboard)
const PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || '', // Set STRIPE_MONTHLY_PRICE_ID in environment
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || '', // Set STRIPE_ANNUAL_PRICE_ID in environment
};

export function registerStripeRoutes(app: Express) {
  // Create subscription endpoint
  app.post("/api/create-subscription", async (req, res) => {
    try {
      console.log("🔔 Create subscription request received");
      console.log("Session userId:", req.session?.userId);
      console.log("STRIPE_MONTHLY_PRICE_ID:", process.env.STRIPE_MONTHLY_PRICE_ID ? `Set: ${process.env.STRIPE_MONTHLY_PRICE_ID.substring(0, 15)}...` : "Not set");
      
      if (!req.session?.userId) {
        console.log("❌ Authentication failed - no session userId");
        return res.status(401).json({ error: "Authentication required" });
      }

      const { priceId = PRICE_IDS.monthly } = req.body;
      console.log("Using price ID:", priceId);
      
      // Check if price ID is configured and valid
      if (!priceId || !priceId.startsWith('price_')) {
        console.log("❌ Invalid price ID configured:", priceId);
        return res.status(400).json({ 
          error: "Invalid Stripe price configuration", 
          message: `The price ID '${priceId}' is invalid. Price IDs must start with 'price_'. Please check your Stripe dashboard and update STRIPE_MONTHLY_PRICE_ID.` 
        });
      }
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;

      // Create or retrieve Stripe customer
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id.toString(),
          },
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(user.id, customerId);
      }

      console.log("✅ Creating subscription with customer:", customerId);
      
      // Create subscription with trial
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      console.log("✅ Subscription created:", subscription.id);
      console.log("Invoice status:", subscription.latest_invoice ? "Present" : "Missing");

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      if (!invoice || typeof invoice === 'string') {
        console.log("❌ Invoice issue - invoice:", typeof invoice, invoice);
        throw new Error('Failed to retrieve invoice');
      }
      
      console.log("Payment intent status:", (invoice as any).payment_intent ? "Present" : "Missing");
      
      const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent;
      if (!paymentIntent || typeof paymentIntent === 'string') {
        console.log("❌ Payment intent issue - type:", typeof paymentIntent, "value:", paymentIntent);
        throw new Error('Failed to create payment intent');
      }

      console.log("✅ Payment intent created successfully:", paymentIntent.id);

      res.json({ 
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error("Create subscription error:", error);
      res.status(500).json({ error: error.message || "Failed to create subscription" });
    }
  });

  // Cancel subscription endpoint
  app.post("/api/cancel-subscription", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ error: "No active subscription found" });
      }

      const subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      await storage.updateUserSubscription(user.id, {
        subscriptionStatus: 'canceled',
      });

      res.json({ 
        success: true, 
        message: "Subscription will be canceled at the end of the billing period",
        cancelAt: subscription.cancel_at 
      });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ error: error.message || "Failed to cancel subscription" });
    }
  });

  // Reactivate subscription endpoint
  app.post("/api/reactivate-subscription", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ error: "No subscription found" });
      }

      const subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        { cancel_at_period_end: false }
      );

      await storage.updateUserSubscription(user.id, {
        subscriptionStatus: 'active',
      });

      res.json({ 
        success: true, 
        message: "Subscription reactivated successfully" 
      });
    } catch (error: any) {
      console.error("Reactivate subscription error:", error);
      res.status(500).json({ error: error.message || "Failed to reactivate subscription" });
    }
  });

  // Get subscription status
  app.get("/api/subscription-status", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check Stripe subscription status if exists
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          // Update local database with latest status
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          await storage.updateUserSubscription(user.id, {
            hasFlavrPlus: isActive,
            subscriptionStatus: subscription.status,
            subscriptionEndDate: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
          });

          return res.json({
            hasFlavrPlus: isActive,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: (subscription as any).current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        } catch (stripeError) {
          console.error("Stripe subscription fetch error:", stripeError);
        }
      }

      // Return database status
      res.json({
        hasFlavrPlus: user.hasFlavrPlus || false,
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        subscriptionProvider: user.subscriptionProvider || 'none',
      });
    } catch (error: any) {
      console.error("Get subscription status error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Stripe webhook endpoint
  app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.warn("Stripe webhook secret not configured - skipping verification");
      return res.status(200).json({ received: true });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`🔔 Stripe webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          await storage.updateUserSubscription(parseInt(userId), {
            hasFlavrPlus: isActive,
            subscriptionStatus: subscription.status,
            subscriptionProvider: 'stripe',
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            subscriptionStartDate: new Date(subscription.start_date * 1000),
            subscriptionEndDate: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
          });
          console.log(`✅ Updated subscription for user ${userId}: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        
        if (userId) {
          await storage.updateUserSubscription(parseInt(userId), {
            hasFlavrPlus: false,
            subscriptionStatus: 'canceled',
            subscriptionEndDate: new Date(),
          });
          console.log(`❌ Canceled subscription for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = (invoice as any).subscription;
        
        if (subscription && typeof subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(subscription);
          const userId = sub.metadata?.userId;
          
          if (userId) {
            await storage.updateUserSubscription(parseInt(userId), {
              hasFlavrPlus: true,
              subscriptionStatus: 'active',
              subscriptionRenewDate: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : null,
            });
            console.log(`💰 Payment succeeded for user ${userId}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = (invoice as any).subscription;
        
        if (subscription && typeof subscription === 'string') {
          const sub = await stripe.subscriptions.retrieve(subscription);
          const userId = sub.metadata?.userId;
          
          if (userId) {
            await storage.updateUserSubscription(parseInt(userId), {
              subscriptionStatus: 'past_due',
            });
            console.log(`⚠️ Payment failed for user ${userId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  });
}