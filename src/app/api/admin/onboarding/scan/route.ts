import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoogleClientForTenant } from '@/lib/google-business';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

/**
 * Chunked review scanner for onboarding.
 * Processes one store at a time to stay within Vercel Hobby 10s timeout.
 * Frontend polls repeatedly until status === 'done'.
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
    const { storeIds, cursor } = body as { storeIds: number[]; cursor?: string };

    if (!storeIds || storeIds.length === 0) {
      return NextResponse.json({ error: 'No stores specified' }, { status: 400 });
    }

    // Parse cursor: "storeIndex:pageToken" or start from 0
    let storeIndex = 0;
    let pageToken: string | undefined;
    if (cursor) {
      const [idx, token] = cursor.split(':');
      storeIndex = parseInt(idx, 10) || 0;
      pageToken = token || undefined;
    }

    if (storeIndex >= storeIds.length) {
      // Count totals
      const { count: totalCount } = await supabaseAdmin
        .from('reviews_raw')
        .select('id', { count: 'exact', head: true })
        .in('store_id', storeIds);

      const { count: pendingCount } = await supabaseAdmin
        .from('reviews_raw')
        .select('id', { count: 'exact', head: true })
        .in('store_id', storeIds)
        .eq('reply_status', 'pending');

      return NextResponse.json({
        status: 'done',
        imported: totalCount || 0,
        pending: pendingCount || 0,
        total: totalCount || 0,
      });
    }

    const currentStoreId = storeIds[storeIndex];

    // Verify store belongs to tenant
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, name, place_id, tenant_id')
      .eq('id', currentStoreId)
      .eq('tenant_id', tenantId)
      .single();

    if (!store) {
      // Skip invalid store, move to next
      return NextResponse.json({
        status: 'in_progress',
        imported: 0,
        pending: 0,
        total: 0,
        cursor: `${storeIndex + 1}:`,
      });
    }

    // Get Google client
    const client = await getGoogleClientForTenant(tenantId);
    if (!client) {
      return NextResponse.json({ error: 'Google Business not connected' }, { status: 400 });
    }

    const { oauth2Client, accounts, gmb } = client;

    // Get account
    const accountsRes = await accounts.accounts.list();
    const accountsList = accountsRes.data.accounts || [];
    if (accountsList.length === 0) {
      return NextResponse.json({ error: 'No Google Business accounts found' }, { status: 404 });
    }
    const accountName = accountsList[0].name!;

    // Find the matching Google location for this store
    const locationsResponse = await gmb.accounts.locations.list({
      parent: accountName,
      readMask: 'name,title,metadata',
    });
    const locations = locationsResponse.data.locations || [];

    const matchedLocation = locations.find((loc: any) => {
      const googlePlaceId = loc.metadata?.placeId;
      if (googlePlaceId && store.place_id && googlePlaceId === store.place_id) return true;
      if ((loc.title || '').toLowerCase() === (store.name || '').toLowerCase()) return true;
      return false;
    });

    if (!matchedLocation) {
      // No matching location, skip to next store
      return NextResponse.json({
        status: storeIndex + 1 >= storeIds.length ? 'done' : 'in_progress',
        imported: 0,
        pending: 0,
        total: 0,
        cursor: `${storeIndex + 1}:`,
      });
    }

    // Fetch reviews for this location (one page per call)
    let imported = 0;
    let newPending = 0;

    try {
      const url = `https://mybusiness.googleapis.com/v4/${accountName}/${matchedLocation.name}/reviews`;
      const res = await oauth2Client.request({
        url,
        params: { pageSize: 50, pageToken },
      });

      const reviewsRes = res.data as any;
      const reviews = reviewsRes.reviews || [];

      for (const review of reviews) {
        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from('reviews_raw')
          .select('id')
          .eq('google_review_id', review.reviewId)
          .maybeSingle();

        if (!existing) {
          const numericRating = STAR_RATING_MAP[review.starRating] || 5;
          const { error: insertError } = await supabaseAdmin.from('reviews_raw').insert({
            google_review_id: review.reviewId,
            author_name: review.reviewer?.displayName || 'Anonymous',
            rating: numericRating,
            content: review.comment || '',
            full_json: review,
            reply_status: review.reviewReply ? 'published' : 'pending',
            created_at: new Date().toISOString(),
            store_id: currentStoreId,
          });

          if (!insertError) {
            imported++;
            if (!review.reviewReply) newPending++;
          }
        }
      }

      const nextPageToken = reviewsRes.nextPageToken;

      // Determine next cursor
      let nextCursor: string;
      if (nextPageToken) {
        nextCursor = `${storeIndex}:${nextPageToken}`;
      } else {
        nextCursor = `${storeIndex + 1}:`;
      }

      const isDone = !nextPageToken && storeIndex + 1 >= storeIds.length;

      // Get running totals
      const { count: totalCount } = await supabaseAdmin
        .from('reviews_raw')
        .select('id', { count: 'exact', head: true })
        .in('store_id', storeIds);

      const { count: pendingCount } = await supabaseAdmin
        .from('reviews_raw')
        .select('id', { count: 'exact', head: true })
        .in('store_id', storeIds)
        .eq('reply_status', 'pending');

      return NextResponse.json({
        status: isDone ? 'done' : 'in_progress',
        imported: totalCount || 0,
        pending: pendingCount || 0,
        total: totalCount || 0,
        cursor: isDone ? undefined : nextCursor,
      });
    } catch (err: any) {
      console.error(`Error scanning reviews for store ${currentStoreId}:`, err);
      // Skip to next store on error
      return NextResponse.json({
        status: storeIndex + 1 >= storeIds.length ? 'done' : 'in_progress',
        imported: 0,
        pending: 0,
        total: 0,
        cursor: `${storeIndex + 1}:`,
        error: err.message,
      });
    }
  } catch (error: any) {
    console.error('Onboarding scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
