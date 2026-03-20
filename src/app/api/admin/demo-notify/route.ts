import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyNewReview, notifyUrgentReview } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/demo-notify
 * Triggers a demo notification for a specific review.
 * Sends to all active notification channels for the store.
 *
 * Body: { reviewId: number, storeId: number }
 * If no reviewId provided, picks the most recent review.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { reviewId, storeId } = body;

    // If no storeId, use first store
    if (!storeId && ctx.stores.length > 0) {
      storeId = ctx.stores[0].id;
    }

    if (!storeId) {
      return NextResponse.json({ error: 'No store found. Create a store first.' }, { status: 400 });
    }

    // Verify store belongs to tenant
    const storeIds = ctx.stores.map(s => s.id);
    if (!storeIds.includes(storeId)) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 403 });
    }

    // Get review
    let review: any;
    if (reviewId) {
      const { data } = await supabaseAdmin
        .from('reviews_raw')
        .select('*')
        .eq('id', reviewId)
        .eq('store_id', storeId)
        .single();
      review = data;
    } else {
      // Pick the most recent review with a draft
      const { data } = await supabaseAdmin
        .from('reviews_raw')
        .select('*')
        .eq('store_id', storeId)
        .not('reply_draft', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      review = data;
    }

    if (!review) {
      return NextResponse.json({ error: 'No reviews found. Use Demo Prep to create demo reviews first.' }, { status: 404 });
    }

    // Check if notification channels are configured
    const { data: channels } = await supabaseAdmin
      .from('notification_channels')
      .select('channel_type, is_active')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (!channels || channels.length === 0) {
      return NextResponse.json({
        error: 'No notification channels configured. Go to Settings → Notifications to set up Email, LINE, or Slack.',
        channelsNeeded: true,
      }, { status: 400 });
    }

    // Extract draft text
    let aiDraft = review.reply_draft || '';
    try {
      const parsed = JSON.parse(aiDraft);
      if (parsed.draft) aiDraft = parsed.draft;
    } catch {
      // Use as-is
    }

    // Send notification
    const isUrgent = review.rating <= 2;

    if (isUrgent && aiDraft) {
      await notifyUrgentReview(storeId, {
        reviewId: String(review.id),
        author_name: review.author_name,
        rating: review.rating,
        content: review.content,
        aiDraft,
      });
    } else {
      await notifyNewReview(storeId, {
        reviewId: String(review.id),
        author_name: review.author_name,
        rating: review.rating,
        content: review.content,
        aiDraft,
      });
    }

    const activeChannels = channels.map(c => c.channel_type);

    return NextResponse.json({
      success: true,
      review: {
        authorName: review.author_name,
        rating: review.rating,
        content: review.content?.substring(0, 100),
      },
      sentTo: activeChannels,
      message: `Demo notification sent to: ${activeChannels.join(', ')}`,
    });
  } catch (error: any) {
    console.error('[DemoNotify]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
