import Stripe from 'stripe';

export const STRIPE_NOT_CONFIGURED = 'STRIPE_NOT_CONFIGURED';

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

/** User-safe message — never expose env var names in the UI */
export function stripeUnavailableMessage(): string {
  return 'Ticket payments aren’t live yet. Browse for now; checkout opens soon.';
}

export function getStripeServerClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error(STRIPE_NOT_CONFIGURED);
  }
  return new Stripe(secretKey);
}
