import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PlanId } from '@/lib/plan-limits';

/**
 * Stripe webhook handler.
 * Handles subscription lifecycle events to keep tenant plans in sync.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = constructWebhookEvent(body, signature);
    const supabase = supabaseAdmin;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const tenantId = session.metadata?.tenant_id;
        if (!tenantId) break;

        // Store Stripe customer ID on tenant
        await supabase
          .from('tenants')
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          })
          .eq('id', Number(tenantId));

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata?.tenant_id;
        if (!tenantId) break;

        // Map Stripe price to plan
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = mapPriceToPlan(priceId);

        await supabase
          .from('tenants')
          .update({ plan })
          .eq('id', Number(tenantId));

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata?.tenant_id;
        if (!tenantId) break;

        // Downgrade to free
        await supabase
          .from('tenants')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
          })
          .eq('id', Number(tenantId));

        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[billing/webhook]', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 400 }
    );
  }
}

function mapPriceToPlan(priceId: string | undefined): PlanId {
  if (!priceId) return 'free';

  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;

  if (priceId === starterPriceId) return 'starter';
  if (priceId === proPriceId) return 'pro';

  return 'free';
}
