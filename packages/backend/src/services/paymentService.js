import { pool } from '../config/database.js';
import { stripeClient } from '../config/stripe.js';

// TechSpeak Vitalicio: one-time purchase, not a subscription (Dia 46's
// pricing decision) - see PRICING.md/MONETIZATION.md.
export const LIFETIME_PRICE_BRL_CENTS = 5700;
export const LIFETIME_PRODUCT_NAME = 'TechSpeak Vitalicio';

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

export async function createLifetimeCheckoutSession(user) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return stripeClient.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: { name: LIFETIME_PRODUCT_NAME },
          unit_amount: LIFETIME_PRICE_BRL_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: { userId: user.id },
    success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/payment/cancel`,
  });
}

export function constructWebhookEvent(rawBody, signature) {
  return stripeClient.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}

export async function grantLifetimeAccess(userId) {
  await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [userId]);
}
