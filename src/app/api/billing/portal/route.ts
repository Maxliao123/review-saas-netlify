import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe';
import { getUserTenantContext } from '@/lib/supabase/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || !ctx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Only tenant owners can manage billing' }, { status: 403 });
    }

    // Get Stripe customer ID from tenant
    const supabase = await createSupabaseServerClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', ctx.tenant.id)
      .limit(1)
      .single();

    if (!tenant?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 404 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await createPortalSession({
      customerId: tenant.stripe_customer_id,
      returnUrl: `${origin}/admin`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[billing/portal]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
