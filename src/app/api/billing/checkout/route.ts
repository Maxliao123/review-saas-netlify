import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || !ctx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Only tenant owners can manage billing' }, { status: 403 });
    }

    const body = await request.json();

    const PLAN_TO_PRICE: Record<string, string | undefined> = {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    };

    const priceId = (body.priceId || PLAN_TO_PRICE[body.planId] || '').trim();
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or priceId' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://www.replywiseai.com';
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // Check if tenant was referred — offer 50% off first month
    let isReferred = false;
    if (ctx.tenant.referred_by_tenant_id) {
      isReferred = true;
    }

    // Use fetch directly — Stripe SDK has connection issues on Vercel serverless
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[]', 'card');
    params.append('customer_email', ctx.user.email || '');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${origin}/admin?billing=success`);
    params.append('cancel_url', `${origin}/admin?billing=cancelled`);
    params.append('metadata[tenant_id]', String(ctx.tenant.id));
    params.append('subscription_data[metadata][tenant_id]', String(ctx.tenant.id));

    // Enable promotion codes for all users + auto-apply referral coupon
    params.append('allow_promotion_codes', 'true');

    // If referred, apply the REFERRED50 coupon (50% off first month)
    // This coupon should be pre-created in Stripe Dashboard
    if (isReferred && process.env.STRIPE_REFERRED_COUPON_ID) {
      params.append('discounts[0][coupon]', process.env.STRIPE_REFERRED_COUPON_ID);
      // When using discounts, allow_promotion_codes must be removed
      params.delete('allow_promotion_codes');
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await res.json();

    if (!res.ok) {
      console.error('[billing/checkout] Stripe error:', session);
      return NextResponse.json({ error: session.error?.message || 'Stripe error' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[billing/checkout] Error:', error?.message);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
