import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getFacebookOAuthUrl } from '@/lib/facebook';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: memberships } = await supabase
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .limit(1);
    const membership = memberships?.[0] || null;

    if (!membership) {
      return NextResponse.json({ error: 'Only tenant owners can connect Facebook' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirect') || undefined;

    const authUrl = getFacebookOAuthUrl(membership.tenant_id, redirectTo);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Facebook OAuth start error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
