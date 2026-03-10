import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import OpenAI from 'openai';
import { buildReplyPrompt } from '@/lib/handbook';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = 3; // Process 3 reviews per call (~6 seconds)

/**
 * Chunked AI draft generator for onboarding.
 * Processes BATCH_SIZE pending reviews per call.
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
    const { storeIds, tone } = body as { storeIds: number[]; tone: string };

    if (!storeIds || storeIds.length === 0) {
      return NextResponse.json({ error: 'No stores specified' }, { status: 400 });
    }

    // Verify stores belong to tenant
    const { data: stores } = await supabaseAdmin
      .from('stores')
      .select('id, name, support_email, tone_setting, can_dine_in, can_takeout, has_restroom, has_sauce_bar, has_parking, has_free_dessert, has_happy_hour, dessert_description, business_hours, custom_handbook_overrides, business_vertical')
      .eq('tenant_id', tenantId)
      .in('id', storeIds);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ error: 'No valid stores found' }, { status: 404 });
    }

    // Find pending reviews (no draft yet) for these stores
    const { data: pendingReviews } = await supabaseAdmin
      .from('reviews_raw')
      .select('*')
      .in('store_id', storeIds)
      .eq('reply_status', 'pending')
      .limit(BATCH_SIZE);

    if (!pendingReviews || pendingReviews.length === 0) {
      // Count remaining
      const { count: remaining } = await supabaseAdmin
        .from('reviews_raw')
        .select('id', { count: 'exact', head: true })
        .in('store_id', storeIds)
        .eq('reply_status', 'pending');

      const { count: draftedCount } = await supabaseAdmin
        .from('reviews_raw')
        .select('id', { count: 'exact', head: true })
        .in('store_id', storeIds)
        .eq('reply_status', 'drafted');

      return NextResponse.json({
        status: 'done',
        drafted: draftedCount || 0,
        remaining: remaining || 0,
      });
    }

    // Build store lookup
    const storeMap = new Map(stores.map(s => [s.id, s]));

    // Map tone setting
    const toneMap: Record<string, string> = {
      professional: 'Professional and Formal',
      friendly: 'Friendly and Warm',
      enthusiastic: 'Enthusiastic and Energetic',
    };
    const toneLabel = toneMap[tone] || 'Friendly and Warm';

    // Generate drafts in parallel
    const draftPromises = pendingReviews.map(async (review) => {
      const store = storeMap.get(review.store_id);
      if (!store) return;

      const storeName = store.name || 'Our Store';
      const contactEmail = store.support_email || '(no support email configured)';
      const dessertDesc = (store as any).dessert_description || 'dessert';
      const customOverrides = JSON.stringify((store as any).custom_handbook_overrides || {});
      const storeVertical = (store as any).business_vertical || 'restaurant';

      const facts = [
        `Dine-In: ${(store as any).can_dine_in ? 'Yes' : 'No'}`,
        `Takeout: ${(store as any).can_takeout ? 'Yes' : 'No'}`,
        `Restroom: ${(store as any).has_restroom ? 'Yes' : 'No'}`,
        `Sauce Bar: ${(store as any).has_sauce_bar ? 'Yes' : 'No'}`,
        `Parking: ${(store as any).has_parking ? 'Yes' : 'No'}`,
        `Free Dessert: ${(store as any).has_free_dessert ? 'Yes' : 'No'} (${dessertDesc})`,
        `Happy Hour: ${(store as any).has_happy_hour ? 'Yes' : 'No'}`,
        `Business Hours: ${(store as any).business_hours || 'Standard 11AM-10PM'}`,
      ].join(', ');

      const basePrompt = buildReplyPrompt(storeVertical);
      const finalPrompt = basePrompt
        .replaceAll('{{store_name}}', storeName)
        .replaceAll('{{store_facts}}', facts)
        .replaceAll('{{dessert_description}}', dessertDesc)
        .replaceAll('{{contact_email}}', contactEmail)
        .replaceAll('{{tone_setting}}', toneLabel)
        .replaceAll('{{custom_handbook_overrides}}', customOverrides)
        .replaceAll('{{customer_review}}', review.content || 'No text review')
        .replaceAll('{{rating}}', review.rating.toString());

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: finalPrompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return;

        let draftBody = '';
        let category = '';
        let detectedLanguage: string | null = null;

        try {
          const parsed = JSON.parse(content);
          draftBody = parsed.draft;
          category = parsed.category;
          detectedLanguage = parsed.detected_language || null;
        } catch {
          draftBody = content;
          category = 'Parsing Error';
        }

        if (draftBody) {
          const payload = JSON.stringify({ category, draft: draftBody });
          await supabaseAdmin
            .from('reviews_raw')
            .update({
              reply_draft: payload,
              reply_status: 'drafted',
              ...(detectedLanguage ? { detected_language: detectedLanguage } : {}),
            })
            .eq('id', review.id);
        }
      } catch (err: any) {
        console.error(`Failed to draft reply for review ${review.id}:`, err);
      }
    });

    await Promise.allSettled(draftPromises);

    // Count remaining
    const { count: remaining } = await supabaseAdmin
      .from('reviews_raw')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .eq('reply_status', 'pending');

    const { count: draftedCount } = await supabaseAdmin
      .from('reviews_raw')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .eq('reply_status', 'drafted');

    return NextResponse.json({
      status: (remaining || 0) > 0 ? 'in_progress' : 'done',
      drafted: draftedCount || 0,
      remaining: remaining || 0,
    });
  } catch (error: any) {
    console.error('Onboarding draft error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
