import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoogleClientForTenant } from '@/lib/google-business';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_PER_CALL = 5; // Publish max 5 reviews per call to stay within 10s

/**
 * Batch publish approved review replies to Google.
 * Processes up to MAX_PER_CALL reviews per call.
 * Frontend polls until status === 'done'.
 */
export async function POST(request: Request) {
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
    const membership = memberships?.[0];

    if (!membership) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 });
    }

    const tenantId = membership.tenant_id;
    const body = await request.json();
    const { reviewIds } = body as { reviewIds: string[] };

    if (!reviewIds || reviewIds.length === 0) {
      return NextResponse.json({ error: 'No review IDs provided' }, { status: 400 });
    }

    // First, approve all specified reviews (change from drafted → approved)
    await supabaseAdmin
      .from('reviews_raw')
      .update({ reply_status: 'approved' })
      .in('id', reviewIds)
      .eq('reply_status', 'drafted');

    // Fetch approved reviews for this tenant's stores (limit to MAX_PER_CALL)
    const { data: toPublish } = await supabaseAdmin
      .from('reviews_raw')
      .select('*, stores!inner(tenant_id)')
      .in('id', reviewIds)
      .eq('reply_status', 'approved')
      .limit(MAX_PER_CALL);

    if (!toPublish || toPublish.length === 0) {
      return NextResponse.json({
        status: 'done',
        published: 0,
        failed: 0,
        errors: [],
      });
    }

    // Get Google OAuth client
    const client = await getGoogleClientForTenant(tenantId);
    if (!client) {
      return NextResponse.json({ error: 'Google Business not connected' }, { status: 400 });
    }

    const { oauth2Client } = client;
    let published = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const review of toPublish) {
      try {
        const resourceName = review.full_json?.name;
        if (!resourceName) {
          errors.push(`Missing resource name for review ${review.id}`);
          failed++;
          continue;
        }

        if (!review.reply_draft) {
          errors.push(`Missing draft for review ${review.id}`);
          failed++;
          continue;
        }

        // Extract reply body from JSON or plain text
        let replyBody = review.reply_draft;
        try {
          const parsed = JSON.parse(replyBody);
          if (parsed.draft) replyBody = parsed.draft;
        } catch {
          // Not JSON, use as-is
        }

        // Publish to Google
        const url = `https://mybusiness.googleapis.com/v4/${resourceName}/reply`;
        await oauth2Client.request({
          method: 'PUT',
          url,
          data: { comment: replyBody },
        });

        // Update status
        await supabaseAdmin
          .from('reviews_raw')
          .update({
            reply_status: 'published',
            published_at: new Date().toISOString(),
          })
          .eq('id', review.id);

        published++;
      } catch (err: any) {
        console.error(`Failed to publish review ${review.id}:`, err);
        errors.push(`${review.author_name}: ${err.message}`);
        failed++;
      }
    }

    // Check if more remain
    const { count: remainingCount } = await supabaseAdmin
      .from('reviews_raw')
      .select('id', { count: 'exact', head: true })
      .in('id', reviewIds)
      .eq('reply_status', 'approved');

    return NextResponse.json({
      status: (remainingCount || 0) > 0 ? 'in_progress' : 'done',
      published,
      failed,
      errors,
      remaining: remainingCount || 0,
    });
  } catch (error: any) {
    console.error('Onboarding publish error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
