import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/admin/demo-prep
 * Creates a demo store with sample reviews and AI reply drafts.
 * Input: { storeName, vertical, placeId?, reviews: [{author, rating, content, date}] }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storeName, vertical, placeId, reviews } = body;

    if (!storeName?.trim()) {
      return NextResponse.json({ error: 'Store name is required' }, { status: 400 });
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ error: 'At least one review is required' }, { status: 400 });
    }

    // 1. Create demo store
    const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-demo';

    // Check if demo store already exists
    const { data: existingStore } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('tenant_id', ctx.tenant.id)
      .eq('slug', slug)
      .maybeSingle();

    let storeId: number;

    if (existingStore) {
      storeId = existingStore.id;
      // Clear old demo reviews
      await supabaseAdmin
        .from('reviews_raw')
        .delete()
        .eq('store_id', storeId);
    } else {
      const { data: newStore, error: storeError } = await supabaseAdmin
        .from('stores')
        .insert({
          tenant_id: ctx.tenant.id,
          name: storeName,
          slug,
          business_vertical: vertical || 'restaurant',
          place_id: placeId || null,
        })
        .select()
        .single();

      if (storeError) throw storeError;
      storeId = newStore.id;
    }

    // 2. Insert reviews + generate AI reply drafts in parallel batches
    const insertedReviews: any[] = [];

    for (const review of reviews) {
      // Generate AI reply draft
      let replyDraft = '';
      try {
        const ratingDesc = review.rating >= 4 ? 'positive' : review.rating >= 3 ? 'neutral' : 'negative';
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: `You are a ${vertical || 'restaurant'} owner replying to a Google review. Be warm, professional, and genuine. Reply in the same language as the review. Keep it under 100 words.`,
            },
            {
              role: 'user',
              content: `${review.rating}-star review from ${review.author}:\n"${review.content}"\n\nWrite a ${ratingDesc} reply:`,
            },
          ],
        });
        replyDraft = completion.choices[0]?.message?.content || '';
      } catch {
        replyDraft = '';
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('reviews_raw')
        .insert({
          store_id: storeId,
          google_review_id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          author_name: review.author || 'Anonymous',
          rating: review.rating || 5,
          content: review.content || '',
          reply_status: replyDraft ? 'drafted' : 'pending',
          reply_draft: replyDraft || null,
          platform: 'google',
          sentiment_score: review.rating >= 4 ? 0.8 : review.rating >= 3 ? 0.5 : 0.2,
          detected_language: detectLanguage(review.content || ''),
          created_at: review.date || new Date().toISOString(),
        })
        .select()
        .single();

      if (!insertError && inserted) {
        insertedReviews.push(inserted);
      }
    }

    // 3. Also create some scan_events for funnel data
    const scanPromises = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const scanDate = new Date(now);
      scanDate.setDate(scanDate.getDate() - daysAgo);

      scanPromises.push(
        supabaseAdmin.from('scan_events').insert({
          store_id: storeId,
          source: ['qr', 'nfc', 'link'][Math.floor(Math.random() * 3)],
          created_at: scanDate.toISOString(),
        })
      );
    }
    await Promise.all(scanPromises);

    return NextResponse.json({
      success: true,
      store: { id: storeId, name: storeName, slug },
      reviewsImported: insertedReviews.length,
      draftedReplies: insertedReviews.filter(r => r.reply_draft).length,
      links: {
        dashboard: '/admin',
        reviews: '/admin/reviews',
        customerPage: `/?store=${slug}`,
        storeSetup: '/admin/stores/setup',
      },
    });
  } catch (error: any) {
    console.error('Demo prep error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function detectLanguage(text: string): string {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[àâçéèêëïîôùûüÿœæ]/i.test(text)) return 'fr';
  if (/[áéíóúñ¿¡]/i.test(text)) return 'es';
  return 'en';
}
