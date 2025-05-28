import { storage } from "./storage";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";

export interface AppleSubscriptionData {
  userId: number;
  originalTransactionId: string;
  receiptData: string;
  subscriptionTier: 'monthly' | 'annual';
  expiresDate: Date;
  isActive: boolean;
}

export interface GoogleSubscriptionData {
  userId: number;
  purchaseToken: string;
  orderId: string;
  productId: string;
  subscriptionTier: 'monthly' | 'annual';
  expiryTimeMillis: number;
  isActive: boolean;
}

/**
 * 🍎 Apple App Store Subscription Management
 */
export class AppleSubscriptionManager {
  
  /**
   * Verify Apple receipt with App Store Server API
   */
  static async verifyAppleReceipt(receiptData: string, sandbox: boolean = false): Promise<any> {
    const verifyURL = sandbox 
      ? 'https://sandbox.itunes.apple.com/verifyReceipt'
      : 'https://buy.itunes.apple.com/verifyReceipt';
    
    const password = process.env.APPLE_SHARED_SECRET;
    if (!password) {
      throw new Error('APPLE_SHARED_SECRET environment variable is required');
    }

    const response = await fetch(verifyURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': password,
        'exclude-old-transactions': true
      })
    });

    const result = await response.json();
    
    // If production verification fails with 21007, try sandbox
    if (result.status === 21007 && !sandbox) {
      return this.verifyAppleReceipt(receiptData, true);
    }

    return result;
  }

  /**
   * Process Apple subscription update
   */
  static async processAppleSubscription(data: AppleSubscriptionData): Promise<void> {
    const { userId, originalTransactionId, receiptData, subscriptionTier, expiresDate, isActive } = data;

    const subscriptionStatus = isActive ? 'active' : 'inactive';
    const hasFlavrPlus = isActive;
    const monthlyRecipeLimit = hasFlavrPlus ? 999 : 3;
    const monthlyImageLimit = hasFlavrPlus ? 999 : 3;

    await db.update(users)
      .set({
        hasFlavrPlus,
        subscriptionStatus,
        subscriptionTier,
        subscriptionProvider: 'apple',
        appleOriginalTransactionId: originalTransactionId,
        appleReceiptData: receiptData,
        subscriptionEndDate: expiresDate,
        subscriptionRenewDate: expiresDate,
        monthlyRecipeLimit,
        monthlyImageLimit,
      })
      .where(eq(users.id, userId));

    console.log(`🍎 Apple subscription ${isActive ? 'activated' : 'deactivated'} for user ${userId}: ${subscriptionTier}`);
  }

  /**
   * Validate Apple subscription status
   */
  static async validateAppleSubscription(userId: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user?.appleReceiptData) return false;

    try {
      const receiptData = await this.verifyAppleReceipt(user.appleReceiptData);
      
      if (receiptData.status !== 0) {
        console.error('Apple receipt verification failed:', receiptData.status);
        return false;
      }

      const latestReceipt = receiptData.latest_receipt_info?.[0];
      if (!latestReceipt) return false;

      const expiresDate = new Date(parseInt(latestReceipt.expires_date_ms));
      const isActive = new Date() < expiresDate;

      // Update subscription status based on verification
      if (user.subscriptionStatus !== (isActive ? 'active' : 'inactive')) {
        await this.processAppleSubscription({
          userId,
          originalTransactionId: latestReceipt.original_transaction_id,
          receiptData: user.appleReceiptData,
          subscriptionTier: latestReceipt.product_id.includes('annual') ? 'annual' : 'monthly',
          expiresDate,
          isActive
        });
      }

      return isActive;
    } catch (error) {
      console.error('Error validating Apple subscription:', error);
      return false;
    }
  }
}

/**
 * 🤖 Google Play Store Subscription Management
 */
export class GoogleSubscriptionManager {

  /**
   * Verify Google Play purchase with Google Play Developer API
   */
  static async verifyGooglePurchase(packageName: string, productId: string, purchaseToken: string): Promise<any> {
    const accessToken = await this.getGoogleAccessToken();
    
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Play API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get Google Service Account access token
   */
  private static async getGoogleAccessToken(): Promise<string> {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
    }

    const credentials = JSON.parse(serviceAccountKey);
    
    // Create JWT for Google Service Account authentication
    const jwt = await this.createGoogleJWT(credentials);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const result = await response.json();
    return result.access_token;
  }

  /**
   * Create JWT for Google Service Account
   */
  private static async createGoogleJWT(credentials: any): Promise<string> {
    // This would typically use a JWT library, but for simplicity:
    // In production, you'd use 'jsonwebtoken' library or similar
    throw new Error('JWT creation not implemented - requires jsonwebtoken library');
  }

  /**
   * Process Google subscription update
   */
  static async processGoogleSubscription(data: GoogleSubscriptionData): Promise<void> {
    const { userId, purchaseToken, orderId, productId, subscriptionTier, expiryTimeMillis, isActive } = data;

    const subscriptionStatus = isActive ? 'active' : 'inactive';
    const hasFlavrPlus = isActive;
    const monthlyRecipeLimit = hasFlavrPlus ? 999 : 3;
    const monthlyImageLimit = hasFlavrPlus ? 999 : 3;
    const expiresDate = new Date(expiryTimeMillis);

    await db.update(users)
      .set({
        hasFlavrPlus,
        subscriptionStatus,
        subscriptionTier,
        subscriptionProvider: 'google',
        googlePurchaseToken: purchaseToken,
        googleOrderId: orderId,
        googleProductId: productId,
        subscriptionEndDate: expiresDate,
        subscriptionRenewDate: expiresDate,
        monthlyRecipeLimit,
        monthlyImageLimit,
      })
      .where(eq(users.id, userId));

    console.log(`🤖 Google subscription ${isActive ? 'activated' : 'deactivated'} for user ${userId}: ${subscriptionTier}`);
  }

  /**
   * Validate Google subscription status
   */
  static async validateGoogleSubscription(userId: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user?.googlePurchaseToken || !user?.googleProductId) return false;

    try {
      const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.flavr.app';
      const purchaseData = await this.verifyGooglePurchase(
        packageName,
        user.googleProductId,
        user.googlePurchaseToken
      );

      const expiryTimeMillis = parseInt(purchaseData.expiryTimeMillis);
      const isActive = Date.now() < expiryTimeMillis;

      // Update subscription status based on verification
      if (user.subscriptionStatus !== (isActive ? 'active' : 'inactive')) {
        await this.processGoogleSubscription({
          userId,
          purchaseToken: user.googlePurchaseToken,
          orderId: user.googleOrderId || '',
          productId: user.googleProductId,
          subscriptionTier: user.googleProductId.includes('annual') ? 'annual' : 'monthly',
          expiryTimeMillis,
          isActive
        });
      }

      return isActive;
    } catch (error) {
      console.error('Error validating Google subscription:', error);
      return false;
    }
  }
}

/**
 * 🔄 Universal Subscription Manager
 * Handles all subscription providers (Stripe, Apple, Google)
 */
export class UniversalSubscriptionManager {

  /**
   * Check if user has active subscription from any provider
   */
  static async hasActiveSubscription(userId: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user) return false;

    // Check current subscription status first
    if (user.subscriptionStatus === 'active' && user.subscriptionEndDate) {
      const isNotExpired = new Date() < user.subscriptionEndDate;
      if (isNotExpired) return true;
    }

    // Validate with respective providers
    switch (user.subscriptionProvider) {
      case 'apple':
        return await AppleSubscriptionManager.validateAppleSubscription(userId);
      
      case 'google':
        return await GoogleSubscriptionManager.validateGoogleSubscription(userId);
      
      case 'stripe':
        // Stripe validation handled by existing subscriptionManager
        return user.subscriptionStatus === 'active';
      
      default:
        return false;
    }
  }

  /**
   * Get subscription details for user
   */
  static async getSubscriptionDetails(userId: number) {
    const user = await storage.getUser(userId);
    if (!user) return null;

    const hasActive = await this.hasActiveSubscription(userId);

    return {
      isActive: hasActive,
      provider: user.subscriptionProvider,
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      endDate: user.subscriptionEndDate,
      renewDate: user.subscriptionRenewDate,
      recipesThisMonth: user.recipesThisMonth || 0,
      monthlyRecipeLimit: user.monthlyRecipeLimit || 3,
    };
  }

  /**
   * Sync all subscriptions (run periodically)
   */
  static async syncAllSubscriptions(): Promise<void> {
    console.log('🔄 Starting subscription sync for all providers...');
    
    try {
      // Get all users with active subscriptions
      const activeUsers = await db.select()
        .from(users)
        .where(eq(users.subscriptionStatus, 'active'));

      for (const user of activeUsers) {
        try {
          await this.hasActiveSubscription(user.id);
        } catch (error) {
          console.error(`Error syncing subscription for user ${user.id}:`, error);
        }
      }
      
      console.log(`✅ Subscription sync completed for ${activeUsers.length} users`);
    } catch (error) {
      console.error('Error during subscription sync:', error);
    }
  }
}