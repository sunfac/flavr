import Stripe from "stripe";
import { storage } from "./storage";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export interface SubscriptionUpdate {
  userId: number;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'inactive';
  subscriptionTier: 'free' | 'monthly' | 'annual';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionRenewDate?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/**
 * Check if user has active Flavr+ subscription
 */
export async function hasActiveFlavrPlus(userId: number): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user) return false;

  // Check if subscription is active and not expired
  const isActive = user.subscriptionStatus === 'active';
  const notExpired = !user.subscriptionEndDate || new Date() < user.subscriptionEndDate;
  
  return isActive && notExpired;
}

/**
 * Update user subscription from Stripe webhook data
 */
export async function updateUserSubscription(update: SubscriptionUpdate): Promise<void> {
  const { userId, ...updateData } = update;
  
  // Determine hasFlavrPlus based on subscription status
  const hasFlavrPlus = update.subscriptionStatus === 'active';
  
  // Update monthly limits based on subscription tier
  let monthlyRecipeLimit = 3; // Free tier default
  let monthlyImageLimit = 3;
  
  if (hasFlavrPlus) {
    monthlyRecipeLimit = 999; // Unlimited for Flavr+
    monthlyImageLimit = 999;
  }

  await db.update(users)
    .set({
      hasFlavrPlus,
      subscriptionStatus: update.subscriptionStatus,
      subscriptionTier: update.subscriptionTier,
      subscriptionStartDate: update.subscriptionStartDate,
      subscriptionEndDate: update.subscriptionEndDate,
      subscriptionRenewDate: update.subscriptionRenewDate,
      stripeCustomerId: update.stripeCustomerId,
      stripeSubscriptionId: update.stripeSubscriptionId,
      monthlyRecipeLimit,
      monthlyImageLimit,
    })
    .where(eq(users.id, userId));
}

/**
 * Handle Stripe subscription created
 */
export async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const user = await getUserByStripeCustomerId(customerId);
  
  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return;
  }

  const tier = getSubscriptionTier(subscription);
  const { startDate, endDate, renewDate } = getSubscriptionDates(subscription);

  await updateUserSubscription({
    userId: user.id,
    subscriptionStatus: subscription.status as any,
    subscriptionTier: tier,
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    subscriptionRenewDate: renewDate,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  });

  console.log(`✅ Subscription created for user ${user.email}: ${tier} (${subscription.status})`);
}

/**
 * Handle Stripe subscription updated
 */
export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const user = await getUserBySubscriptionId(subscription.id);
  
  if (!user) {
    console.error(`User not found for subscription: ${subscription.id}`);
    return;
  }

  const tier = getSubscriptionTier(subscription);
  const { startDate, endDate, renewDate } = getSubscriptionDates(subscription);

  await updateUserSubscription({
    userId: user.id,
    subscriptionStatus: subscription.status as any,
    subscriptionTier: tier,
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    subscriptionRenewDate: renewDate,
  });

  console.log(`🔄 Subscription updated for user ${user.email}: ${tier} (${subscription.status})`);
}

/**
 * Handle Stripe subscription canceled
 */
export async function handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
  const user = await getUserBySubscriptionId(subscription.id);
  
  if (!user) {
    console.error(`User not found for subscription: ${subscription.id}`);
    return;
  }

  await updateUserSubscription({
    userId: user.id,
    subscriptionStatus: 'canceled',
    subscriptionTier: 'free',
    subscriptionEndDate: new Date(subscription.canceled_at! * 1000),
  });

  console.log(`❌ Subscription canceled for user ${user.email}`);
}

/**
 * Handle Stripe invoice payment failed
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  const user = await getUserBySubscriptionId(subscriptionId);
  
  if (!user) {
    console.error(`User not found for subscription: ${subscriptionId}`);
    return;
  }

  await updateUserSubscription({
    userId: user.id,
    subscriptionStatus: 'past_due',
    subscriptionTier: user.subscriptionTier as any || 'free',
  });

  console.log(`⚠️ Payment failed for user ${user.email} - subscription marked as past_due`);
}

/**
 * Determine subscription tier from Stripe subscription
 */
function getSubscriptionTier(subscription: Stripe.Subscription): 'monthly' | 'annual' {
  // Check the price interval to determine if monthly or annual
  const price = subscription.items.data[0]?.price;
  if (price?.recurring?.interval === 'year') {
    return 'annual';
  }
  return 'monthly';
}

/**
 * Extract subscription dates from Stripe subscription
 */
function getSubscriptionDates(subscription: Stripe.Subscription) {
  const startDate = new Date(subscription.current_period_start * 1000);
  const endDate = new Date(subscription.current_period_end * 1000);
  const renewDate = new Date(subscription.current_period_end * 1000);

  return { startDate, endDate, renewDate };
}

/**
 * Find user by Stripe customer ID
 */
async function getUserByStripeCustomerId(customerId: string) {
  const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
  return user || null;
}

/**
 * Find user by Stripe subscription ID
 */
async function getUserBySubscriptionId(subscriptionId: string) {
  const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
  return user || null;
}

/**
 * Check for expired subscriptions and update status
 */
export async function checkExpiredSubscriptions(): Promise<void> {
  const now = new Date();
  
  // Find users with active subscriptions that have expired
  const expiredUsers = await db.select()
    .from(users)
    .where(eq(users.subscriptionStatus, 'active'));

  for (const user of expiredUsers) {
    if (user.subscriptionEndDate && now > user.subscriptionEndDate) {
      await updateUserSubscription({
        userId: user.id,
        subscriptionStatus: 'inactive',
        subscriptionTier: 'free',
      });
      
      console.log(`⏰ Subscription expired for user ${user.email}`);
    }
  }
}

/**
 * Sync subscription status with Stripe (for manual verification)
 */
export async function syncSubscriptionWithStripe(userId: number): Promise<boolean> {
  const user = await storage.getUser(userId);
  
  if (!user?.stripeSubscriptionId) {
    return false;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    const tier = getSubscriptionTier(subscription);
    const { startDate, endDate, renewDate } = getSubscriptionDates(subscription);

    await updateUserSubscription({
      userId: user.id,
      subscriptionStatus: subscription.status as any,
      subscriptionTier: tier,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      subscriptionRenewDate: renewDate,
    });

    return subscription.status === 'active';
  } catch (error) {
    console.error(`Failed to sync subscription for user ${user.email}:`, error);
    return false;
  }
}