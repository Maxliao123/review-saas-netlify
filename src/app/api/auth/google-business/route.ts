import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoogleOAuthUrl } from '@/lib/google-business';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant (must be owner)
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Only tenant owners can connect Google Business' }, { status: 403 });
    }

    const authUrl = getGoogleOAuthUrl(membership.tenant_id);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Google OAuth start error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
