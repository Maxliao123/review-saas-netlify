import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe';
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

    const { priceId } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await createCheckoutSession({
      priceId,
      tenantId: ctx.tenant.id,
      customerEmail: ctx.user.email || '',
      successUrl: `${origin}/admin?billing=success`,
      cancelUrl: `${origin}/admin?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[billing/checkout]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
