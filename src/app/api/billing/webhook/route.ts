import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PlanId } from '@/lib/plan-limits';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify signature locally (no network call)
    const event = Stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const supabase = supabaseAdmin;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const tenantId = session.metadata?.tenant_id;
        if (!tenantId) break;

        // Get subscription details to determine plan
        const subscriptionId = session.subscription;
        let plan: PlanId = 'starter'; // default for paid

        if (subscriptionId) {
          // Fetch subscription from Stripe to get the price ID
          const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
          if (stripeKey) {
            try {
              const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
                headers: { 'Authorization': `Bearer ${stripeKey}` },
              });
              const sub = await res.json();
              const priceId = sub.items?.data?.[0]?.price?.id;
              plan = mapPriceToPlan(priceId);
            } catch (e) {
              console.error('[webhook] Failed to fetch subscription:', e);
            }
          }
        }

        // Store Stripe IDs AND update plan
        await supabase
          .from('tenants')
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscriptionId,
            plan,
          })
          .eq('id', tenantId);

        console.log(`[webhook] checkout.session.completed: tenant=${tenantId} plan=${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata?.tenant_id;
        if (!tenantId) break;

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = mapPriceToPlan(priceId);

        await supabase
          .from('tenants')
          .update({ plan })
          .eq('id', tenantId);

        console.log(`[webhook] subscription.updated: tenant=${tenantId} plan=${plan}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const tenantId = subscription.metadata?.tenant_id;
        if (!tenantId) break;

        await supabase
          .from('tenants')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
          })
          .eq('id', tenantId);

        console.log(`[webhook] subscription.deleted: tenant=${tenantId} → free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        console.error(`[webhook] Payment failed for customer ${invoice.customer}`);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[billing/webhook]', error?.message || error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 400 }
    );
  }
}

function mapPriceToPlan(priceId: string | undefined): PlanId {
  if (!priceId) return 'free';

  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID?.trim();
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID?.trim();

  if (priceId === starterPriceId) return 'starter';
  if (priceId === proPriceId) return 'pro';

  return 'free';
}
