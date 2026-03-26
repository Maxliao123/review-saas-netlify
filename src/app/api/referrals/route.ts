import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = await getUserTenantContext();
  if (!ctx?.tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const tenantId = ctx.tenant.id;

  // Get tenant's referral code
  const { data: tenant } = await supabase
    .from('tenants')
    .select('referral_code')
    .eq('id', tenantId)
    .single();

  const referralCode = tenant?.referral_code || null;

  if (!referralCode) {
    return NextResponse.json({
      referral_code: null,
      stats: { clicks: 0, signups: 0, paid: 0, rewards: 0 },
      referrals: [],
    });
  }

  // Get click count
  const { count: clicks } = await supabase
    .from('referral_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('referral_code', referralCode);

  // Get referrals list
  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, referred_email, referred_name, status, reward_type, reward_amount, created_at, converted_at')
    .eq('referrer_tenant_id', tenantId)
    .order('created_at', { ascending: false });

  const referralList = referrals || [];

  // Calculate stats
  const signups = referralList.length;
  const paid = referralList.filter((r) => r.status === 'paid' || r.status === 'rewarded').length;
  const rewards = referralList.filter((r) => r.status === 'rewarded').length;

  return NextResponse.json({
    referral_code: referralCode,
    stats: {
      clicks: clicks || 0,
      signups,
      paid,
      rewards,
    },
    referrals: referralList,
  });
}
