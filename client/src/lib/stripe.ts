// Stripe utilities for subscription management

export interface SubscriptionStatus {
  isActive: boolean;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  status?: string;
}

export interface PaymentIntent {
  clientSecret: string;
  subscriptionId?: string;
}

class StripeUtils {
  private readonly PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

  constructor() {
    if (!this.PUBLIC_KEY) {
      console.warn("Stripe public key not found in environment variables");
    }
  }

  // Format currency amounts
  formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100);
  }

  // Calculate subscription pricing
  calculateMonthlyPrice(): number {
    return 499; // $4.99 in cents
  }

  calculateYearlyPrice(): number {
    return 4999; // $49.99 in cents (2 months free)
  }

  getYearlySavings(): number {
    const monthly = this.calculateMonthlyPrice() * 12;
    const yearly = this.calculateYearlyPrice();
    return monthly - yearly;
  }

  // Subscription status helpers
  isSubscriptionActive(status: string): boolean {
    return ["active", "trialing"].includes(status);
  }

  isSubscriptionCanceling(status: string): boolean {
    return status === "cancel_at_period_end";
  }

  needsPaymentMethod(status: string): boolean {
    return ["incomplete", "past_due"].includes(status);
  }

  // Format subscription dates
  formatSubscriptionDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Usage calculation helpers
  calculateUsagePercentage(used: number, limit: number): number {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  }

  getRemainingUsage(used: number, limit: number): number {
    return Math.max(limit - used, 0);
  }

  // Billing cycle helpers
  getDaysUntilRenewal(periodEnd: Date | string): number {
    const end = new Date(periodEnd);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Subscription benefits
  getPlusFeatures(): string[] {
    return [
      "Unlimited AI recipe generation",
      "HD recipe images with every recipe", 
      "Priority customer support",
      "Advanced recipe customization",
      "Recipe history and favorites",
      "Offline recipe access",
      "Meal planning tools",
      "Nutrition information",
    ];
  }

  getFreeFeatures(): string[] {
    return [
      "5 free recipes per month",
      "Basic recipe generation",
      "All three cooking modes",
      "Chef assistant chat",
      "Recipe saving",
    ];
  }

  // Error handling
  getStripeErrorMessage(error: any): string {
    if (error.type === "card_error" || error.type === "validation_error") {
      return error.message;
    }
    
    switch (error.code) {
      case "payment_intent_authentication_failure":
        return "Your payment could not be authenticated. Please try a different payment method.";
      case "payment_method_unactivated":
        return "Your payment method needs to be activated. Please contact your bank.";
      case "payment_method_unexpected_state":
        return "Your payment method is in an unexpected state. Please try again or use a different payment method.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  // Webhook event handling helpers
  isRelevantWebhookEvent(eventType: string): boolean {
    const relevantEvents = [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
    ];
    return relevantEvents.includes(eventType);
  }
}

export const stripeUtils = new StripeUtils();
export default stripeUtils;
