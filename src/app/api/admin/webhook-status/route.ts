import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getHealthStatus,
  estimateLatencyImprovement,
  generateSetupInstructions,
  generateVerificationToken,
  getPushEndpointUrl,
} from '@/lib/review-webhook';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.replywiseai.com';
    const secret = process.env.CRON_SECRET || 'default-secret';
    const webhookEnabled = process.env.PUBSUB_VERIFICATION_TOKEN ? true : false;

    // Get membership for tenant info
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) return NextResponse.json({ error: 'No tenant' }, { status: 403 });

    const verificationToken = generateVerificationToken(membership.tenant_id, secret);
    const health = getHealthStatus(webhookEnabled);
    const latency = estimateLatencyImprovement(5, health.avgProcessingMs || 15000);
    const instructions = generateSetupInstructions(baseUrl, verificationToken);
    const pushEndpoint = getPushEndpointUrl(baseUrl);

    return NextResponse.json({
      health,
      latency,
      instructions,
      pushEndpoint,
      verificationToken,
      cronFallbackActive: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
