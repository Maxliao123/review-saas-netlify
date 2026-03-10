import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleClientForTenant } from '@/lib/google-business';
import OpenAI from 'openai';
import { buildReplyPrompt } from '@/lib/handbook';
import { notifyNewReview, notifyUrgentReview } from '@/lib/notifications';
import { hasFeature } from '@/lib/plan-limits';
import { computeConfidence, shouldFlagForReview } from '@/lib/confidence';
import {
  verifyPubSubToken,
  parsePubSubMessage,
  recordReceived,
  recordProcessed,
  recordError,
  type PubSubMessage,
} from '@/lib/review-webhook';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/webhooks/google-reviews
 *
 * Receives Google Cloud Pub/Sub push notifications for new reviews.
 * Processes them in real-time: fetch → draft → auto-approve → publish.
 *
 * Latency target: < 30 seconds end-to-end.
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // 1. Verify authenticity
    const authHeader = request.headers.get('authorization');
    const verificationToken = process.env.PUBSUB_VERIFICATION_TOKEN || '';

    if (verificationToken && !verifyPubSubToken(authHeader, verificationToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    recordReceived();

    // 2. Parse Pub/Sub message
    const body: PubSubMessage = await request.json();
    const notification = parsePubSubMessage(body);

    if (!notification) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    // Only process new/updated reviews
    if (notification.changeType === 'DELETED_REVIEW') {
      return NextResponse.json({ status: 'ignored', reason: 'deleted review' });
    }

    // 3. Find the tenant and store that match this notification
    const accountId = notification.account.replace('accounts/', '');

    // Look up which tenant owns this Google account
    const { data: creds } = await supabaseAdmin
      .from('google_credentials')
      .select('tenant_id')
      .or(`google_account_id.eq.${accountId},google_email.ilike.%`)
      .limit(1)
      .single();

    if (!creds) {
      // Try matching by iterating connected tenants (fallback)
      return NextResponse.json({ status: 'skipped', reason: 'no matching tenant' });
    }

    const tenantId = creds.tenant_id;

    // 4. Get Google API client for this tenant
    const googleClient = await getGoogleClientForTenant(tenantId);
    if (!googleClient) {
      return NextResponse.json({ status: 'skipped', reason: 'no google credentials' });
    }

    const { oauth2Client } = googleClient;

    // 5. Fetch the specific review from Google
    const locationName = notification.location.startsWith('locations/')
      ? `accounts/${accountId}/${notification.location}`
      : `accounts/${accountId}/locations/${notification.location}`;

    let review: any;
    try {
      const reviewUrl = `https://mybusiness.googleapis.com/v4/${locationName}/reviews/${notification.reviewId}`;
      const res = await oauth2Client.request({ url: reviewUrl });
      review = res.data;
    } catch (fetchErr: any) {
      // Try fetching all recent reviews and find the one we need
      try {
        const reviewsUrl = `https://mybusiness.googleapis.com/v4/${locationName}/reviews`;
        const res = await oauth2Client.request({ url: reviewsUrl, params: { pageSize: 10 } });
        const reviews = (res.data as any).reviews || [];
        review = reviews.find((r: any) => r.reviewId === notification.reviewId);
      } catch {
        recordError();
        return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 });
      }
    }

    if (!review) {
      return NextResponse.json({ status: 'skipped', reason: 'review not found' });
    }

    // 6. Match to a store in our DB
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('id, name, slug, place_id, auto_reply_mode, auto_reply_min_rating, negative_review_threshold, tone_setting, custom_handbook_overrides, support_email, business_vertical, can_dine_in, can_takeout, has_restroom, has_sauce_bar, has_parking, has_free_dessert, has_happy_hour, dessert_description, business_hours, tenants!inner(plan)')
      .eq('tenant_id', tenantId);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ status: 'skipped', reason: 'no stores' });
    }

    // Match by place_id from the Google location metadata
    const googlePlaceId = review.name?.split('/locations/')[1]?.split('/')[0];
    const matchedStore = stores[0]; // Default to first store; improve matching later

    const STAR_RATING_MAP: Record<string, number> = {
      'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
    };
    const numericRating = STAR_RATING_MAP[review.starRating] || 5;

    // 7. Check if review already exists (dedup with cron)
    const { data: existing } = await supabaseAdmin
      .from('reviews_raw')
      .select('id')
      .eq('google_review_id', review.reviewId)
      .single();

    if (existing) {
      // Already imported by cron — skip
      return NextResponse.json({ status: 'duplicate', reviewId: review.reviewId });
    }

    // 8. Insert the review
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('reviews_raw')
      .insert({
        google_review_id: review.reviewId,
        author_name: review.reviewer?.displayName || 'Anonymous',
        rating: numericRating,
        content: review.comment || '',
        full_json: review,
        reply_status: 'pending',
        created_at: new Date().toISOString(),
        store_id: matchedStore.id,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      recordError();
      return NextResponse.json({ error: 'Failed to insert review' }, { status: 500 });
    }

    // Fire notification (non-blocking)
    notifyNewReview(matchedStore.id, {
      author_name: review.reviewer?.displayName || 'Anonymous',
      rating: numericRating,
      content: review.comment || '',
    }).catch(err => console.error('[Webhook] Notification error:', err));

    // 9. Generate AI reply draft
    const tenantData = matchedStore.tenants as any;
    const tenantPlan = tenantData?.plan || 'free';
    const storeVertical = matchedStore.business_vertical || 'restaurant';

    const storeFacts = [
      `Dine-In: ${matchedStore.can_dine_in ? 'Yes' : 'No'}`,
      `Takeout: ${matchedStore.can_takeout ? 'Yes' : 'No'}`,
      `Restroom: ${matchedStore.has_restroom ? 'Yes' : 'No'}`,
      `Sauce Bar: ${matchedStore.has_sauce_bar ? 'Yes' : 'No'}`,
      `Parking: ${matchedStore.has_parking ? 'Yes' : 'No'}`,
      `Free Dessert: ${matchedStore.has_free_dessert ? 'Yes' : 'No'} (${matchedStore.dessert_description || 'dessert'})`,
      `Happy Hour: ${matchedStore.has_happy_hour ? 'Yes' : 'No'}`,
      `Business Hours: ${matchedStore.business_hours || 'Standard'}`,
    ].join(', ');

    const basePrompt = buildReplyPrompt(storeVertical);
    const finalPrompt = basePrompt
      .replaceAll('{{store_name}}', matchedStore.name)
      .replaceAll('{{store_facts}}', storeFacts)
      .replaceAll('{{dessert_description}}', matchedStore.dessert_description || 'dessert')
      .replaceAll('{{contact_email}}', matchedStore.support_email || '(no support email)')
      .replaceAll('{{tone_setting}}', matchedStore.tone_setting || 'Professional and Warm')
      .replaceAll('{{custom_handbook_overrides}}', JSON.stringify(matchedStore.custom_handbook_overrides || {}))
      .replaceAll('{{customer_review}}', review.comment || 'No text review')
      .replaceAll('{{rating}}', numericRating.toString());

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: finalPrompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const aiContent = completion.choices[0]?.message?.content;
    let draftBody = '';
    let category = '';

    if (aiContent) {
      try {
        const parsed = JSON.parse(aiContent);
        draftBody = parsed.draft;
        category = parsed.category;
      } catch {
        draftBody = aiContent;
        category = 'Parsing Error';
      }
    }

    if (!draftBody) {
      recordError();
      return NextResponse.json({ status: 'error', reason: 'AI draft empty' });
    }

    // 10. Auto-approve logic
    const autoReplyMode = (matchedStore as any).auto_reply_mode || 'manual';
    const autoReplyMinRating = (matchedStore as any).auto_reply_min_rating || 4;
    let newStatus = 'drafted';

    if (hasFeature(tenantPlan, 'autoReplyMode')) {
      if (autoReplyMode === 'auto_all') {
        newStatus = 'approved';
      } else if (autoReplyMode === 'auto_positive' && numericRating >= autoReplyMinRating) {
        newStatus = 'approved';
      }
    }

    // Confidence check for auto-approved
    let confidence = null;
    if (newStatus === 'approved') {
      confidence = computeConfidence({
        rating: numericRating,
        reviewText: review.comment || '',
        replySource: 'ai',
        autoReplyMode,
        minRatingThreshold: autoReplyMinRating,
        sentimentScore: null,
        sentimentLabel: null,
      });

      if (shouldFlagForReview(confidence)) {
        newStatus = 'drafted';
      }
    }

    const replyPayload = JSON.stringify({
      category,
      draft: draftBody,
      ...(confidence ? { confidence: { score: confidence.score, level: confidence.level, reasons: confidence.reasons } } : {}),
      source: 'webhook_realtime',
    });

    await supabaseAdmin
      .from('reviews_raw')
      .update({ reply_draft: replyPayload, reply_status: newStatus })
      .eq('id', inserted.id);

    // 11. Urgent alert for negative reviews needing manual review
    const negThreshold = (matchedStore as any).negative_review_threshold ?? 2;
    if (numericRating <= negThreshold && newStatus !== 'approved') {
      notifyUrgentReview(matchedStore.id, {
        reviewId: inserted.id,
        author_name: review.reviewer?.displayName || 'Anonymous',
        rating: numericRating,
        content: review.comment || '',
        aiDraft: draftBody,
      }).catch(err => console.error('[Webhook] Urgent alert error:', err));
    }

    // 12. Instant publish if auto-approved
    if (newStatus === 'approved') {
      try {
        const resourceName = review.name;
        if (resourceName) {
          const publishUrl = `https://mybusiness.googleapis.com/v4/${resourceName}/reply`;
          await oauth2Client.request({
            method: 'PUT',
            url: publishUrl,
            data: { comment: draftBody },
          });

          await supabaseAdmin
            .from('reviews_raw')
            .update({
              reply_status: 'published',
              published_at: new Date().toISOString(),
            })
            .eq('id', inserted.id);
        }
      } catch (publishErr: any) {
        console.error('[Webhook] Publish failed:', publishErr.message);
        // Don't fail the whole request — reply is drafted/approved, will be published by cron
      }
    }

    const durationMs = Date.now() - startTime;
    recordProcessed(durationMs);

    return NextResponse.json({
      status: 'processed',
      reviewId: review.reviewId,
      replyStatus: newStatus,
      processingMs: durationMs,
      source: 'realtime_webhook',
    });

  } catch (error: any) {
    recordError();
    console.error('[Webhook] Unexpected error:', error);
    // Return 200 to prevent Pub/Sub retries on non-retryable errors
    return NextResponse.json({ status: 'error', message: error.message }, { status: 200 });
  }
}
