import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { notifyNewReview } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx || !ctx.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { store_id, channel_type } = await request.json();

    // Verify user has access to this store
    const hasAccess = ctx.stores.some(s => s.id === store_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No access to this store' }, { status: 403 });
    }

    // Send a test notification
    await notifyNewReview(store_id, {
      author_name: 'Test User',
      rating: 5,
      content: 'This is a test notification from your reputation monitoring system. If you received this, your notification channel is working correctly!',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
