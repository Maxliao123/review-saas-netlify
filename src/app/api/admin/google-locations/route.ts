import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listGoogleLocations } from '@/lib/google-business-locations';

export async function GET() {
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
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const locations = await listGoogleLocations(membership.tenant_id);
    return NextResponse.json({ locations });
  } catch (error: any) {
    console.error('Error fetching Google locations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
