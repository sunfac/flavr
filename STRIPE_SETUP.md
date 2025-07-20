# Stripe Setup Instructions for Flavr

## Overview
To enable Flavr+ subscriptions, you need to set up Stripe products and prices.

## Required Environment Variables

1. `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_`)
2. `VITE_STRIPE_PUBLIC_KEY` - Your Stripe publishable key (starts with `pk_`)
3. `STRIPE_MONTHLY_PRICE_ID` - The price ID for monthly subscriptions
4. `STRIPE_ANNUAL_PRICE_ID` - The price ID for annual subscriptions (optional)
5. `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret (optional but recommended)

## Setting Up Products and Prices

### 1. Go to Stripe Dashboard
Navigate to https://dashboard.stripe.com/test/products

### 2. Create a Product
1. Click "Add product"
2. Set the following:
   - Name: "Flavr+ Subscription"
   - Description: "Unlimited AI recipe generation and premium features"
   - Image: Upload a Flavr logo (optional)

### 3. Add Pricing
1. In the product, click "Add price"
2. For monthly subscription:
   - Pricing model: Standard pricing
   - Price: $4.99
   - Billing period: Monthly
   - Save the price ID (it will look like `price_1ABC...`)

3. For annual subscription (optional):
   - Add another price
   - Price: $49.99
   - Billing period: Yearly
   - Save the price ID

### 4. Update Environment Variables
Add the price IDs to your environment:
```
STRIPE_MONTHLY_PRICE_ID=price_1ABC... (your actual price ID)
STRIPE_ANNUAL_PRICE_ID=price_1DEF... (your actual price ID)
```

### 5. Set Up Webhook (Production)
1. Go to https://dashboard.stripe.com/test/webhooks
2. Add endpoint:
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Events to send: 
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. Copy the signing secret and add to environment:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Testing

For testing without real prices, you can use Stripe's test mode:
1. Use test API keys (they start with `sk_test_` and `pk_test_`)
2. Use test card numbers like `4242 4242 4242 4242`
3. Any future date for expiry, any 3 digits for CVC

## Common Issues

1. **"No such price" error**: Make sure you've created the product and price in Stripe
2. **Authentication errors**: Ensure your API keys are correct
3. **Webhook failures**: Check that the webhook secret matches

## Support
For more help, see the [Stripe documentation](https://stripe.com/docs/billing/subscriptions/overview).