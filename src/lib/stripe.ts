/**
 * Stripe server-side client.
 * Requires STRIPE_SECRET_KEY environment variable.
 */

import Stripe from 'stripe';

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key, {
    typescript: true,
    maxNetworkRetries: 1,
    timeout: 8000, // 8s to stay under Vercel's 10s limit
  });
}

/**
 * Create a Stripe Checkout session for a subscription.
 */
export async function createCheckoutSession({
  priceId,
  tenantId,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  tenantId: number;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenant_id: String(tenantId),
    },
    subscription_data: {
      metadata: {
        tenant_id: String(tenantId),
      },
    },
  });

  return session;
}

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Verify and construct a Stripe webhook event.
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}
