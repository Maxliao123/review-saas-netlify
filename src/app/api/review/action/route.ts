import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleClientForTenant } from '@/lib/google-business';

export const dynamic = 'force-dynamic';

/**
 * GET /api/review/action?token=xxx
 * Fetch review data for the lightweight edit page.
 * No login required — secured by token.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('review_approve_tokens')
      .select('*, reviews_raw!inner(id, reply_draft, reply_status, content, rating, author_name, created_at, google_review_id, full_json, stores!inner(tenant_id, name))')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 404 });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired. Please use the dashboard instead.' }, { status: 410 });
    }

    if (tokenRecord.used_at) {
      return NextResponse.json({ error: 'This review has already been processed.' }, { status: 410 });
    }

    const review = tokenRecord.reviews_raw;
    const store = review.stores;

    // Extract draft text from JSON if needed
    let draftText = review.reply_draft || '';
    try {
      const parsed = JSON.parse(draftText);
      if (parsed.draft) draftText = parsed.draft;
    } catch {
      // Use as-is
    }

    return NextResponse.json({
      review: {
        id: review.id,
        storeName: store.name,
        authorName: review.author_name,
        rating: review.rating,
        content: review.content,
        replyDraft: draftText,
        replyStatus: review.reply_status,
        createdAt: review.created_at,
      },
    });
  } catch (error: any) {
    console.error('[ReviewAction GET]', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

/**
 * POST /api/review/action
 * Update draft and publish reply.
 * No login required — secured by token.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, draft } = await request.json();

    if (!token || !draft?.trim()) {
      return NextResponse.json({ error: 'Token and reply text are required.' }, { status: 400 });
    }

    // Validate token
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('review_approve_tokens')
      .select('*, reviews_raw!inner(id, reply_draft, reply_status, google_review_id, full_json, stores!inner(tenant_id, name))')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 404 });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired.' }, { status: 410 });
    }

    if (tokenRecord.used_at) {
      return NextResponse.json({ error: 'This review has already been processed.' }, { status: 410 });
    }

    const review = tokenRecord.reviews_raw;
    const store = review.stores;

    // Update the draft
    await supabaseAdmin
      .from('reviews_raw')
      .update({ reply_draft: draft.trim() })
      .eq('id', review.id);

    // Try to publish to Google
    let publishedToGoogle = false;
    const resourceName = review.full_json?.name;

    if (resourceName && store.tenant_id) {
      try {
        const client = await getGoogleClientForTenant(store.tenant_id);
        if (client) {
          const url = `https://mybusiness.googleapis.com/v4/${resourceName}/reply`;
          await client.oauth2Client.request({
            method: 'PUT',
            url,
            data: { comment: draft.trim() },
          });
          publishedToGoogle = true;
        }
      } catch (publishErr: any) {
        console.error('[ReviewAction] Google publish failed:', publishErr.message);
      }
    }

    // Update status
    const newStatus = publishedToGoogle ? 'published' : 'approved';
    await supabaseAdmin
      .from('reviews_raw')
      .update({
        reply_status: newStatus,
        ...(publishedToGoogle ? { published_at: new Date().toISOString() } : {}),
      })
      .eq('id', review.id);

    // Mark token used
    await supabaseAdmin
      .from('review_approve_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    return NextResponse.json({
      success: true,
      publishedToGoogle,
      status: newStatus,
    });
  } catch (error: any) {
    console.error('[ReviewAction POST]', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
