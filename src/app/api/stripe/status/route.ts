import { NextResponse } from 'next/server';
import { isStripeConfigured, isStripeWebhookConfigured } from '@/lib/stripe';

export async function GET() {
  return NextResponse.json({
    enabled: isStripeConfigured(),
    webhooks: isStripeWebhookConfigured(),
  });
}
