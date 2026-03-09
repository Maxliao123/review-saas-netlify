import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getConnectedTenants, getGoogleClientForTenant } from '@/lib/google-business';
import OpenAI from 'openai';
import { buildReplyPrompt } from '@/lib/handbook';
import { notifyNewReview, notifyUrgentReview } from '@/lib/notifications';
import { analyzeSentimentBatch } from '@/lib/sentiment';
import { hasFeature } from '@/lib/plan-limits';
import { findBestTemplate, hydrateTemplate, inferCategoryFromRating, type ReplyTemplate } from '@/lib/template-matcher';
import { computeConfidence, shouldFlagForReview } from '@/lib/confidence';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/** Concurrency-limited Promise runner */
async function runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number
): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(batch.map(fn => fn()));
        results.push(...batchResults);
    }
    return results;
}

export async function GET(request: Request) {
    try {
        // 1. Verify Cron Secret
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('cron_secret');

        if (secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const outputLog: string[] = [];

        // --- 90 Days Lookback ---
        const lookbackWindow = new Date();
        lookbackWindow.setDate(lookbackWindow.getDate() - 90);

        // --- MULTI-TENANT: Iterate over all connected tenants ---
        const tenantIds = await getConnectedTenants();

        if (tenantIds.length === 0) {
            outputLog.push('No connected tenants found.');
            return NextResponse.json({ success: true, processed: outputLog });
        }

        outputLog.push(`Processing ${tenantIds.length} tenant(s)...`);

        const storeHoursMap = new Map<number, string>();

        // Cache store auto-reply settings: storeId → { mode, minRating, tenantPlan }
        const storeAutoReplyMap = new Map<number, {
            mode: string;
            minRating: number;
            tenantPlan: string;
        }>();

        // Cache per-tenant OAuth clients for publish step
        const tenantAuthCache = new Map<string, any>();

        for (const tenantId of tenantIds) {
            try {
                const client = await getGoogleClientForTenant(tenantId);
                if (!client) {
                    outputLog.push(`[Tenant ${tenantId}] No valid Google credentials, skipping.`);
                    continue;
                }

                const { oauth2Client, accounts: accountClient, gmb } = client;

                // Cache the OAuth client for later publish
                tenantAuthCache.set(tenantId, oauth2Client);

                // 1. List Accounts
                let accountName = '';
                try {
                    const accountsRes = await accountClient.accounts.list();
                    const accountsList = accountsRes.data.accounts || [];

                    if (accountsList.length > 0) {
                        accountName = accountsList[0].name!;
                        outputLog.push(`[Tenant ${tenantId}] Using account: ${accountName}`);
                    } else {
                        outputLog.push(`[Tenant ${tenantId}] No Google Business accounts found, skipping.`);
                        continue;
                    }
                } catch (error: any) {
                    outputLog.push(`[Tenant ${tenantId}] Failed to list accounts: ${error.message}`);
                    continue;
                }

                // 2. List Locations
                let locations: any[] = [];
                try {
                    const locationsResponse = await gmb.accounts.locations.list({
                        parent: accountName,
                        readMask: 'name,title,storeCode,regularHours,metadata'
                    });
                    locations = locationsResponse.data.locations || [];
                } catch (e: any) {
                    console.error(`[Tenant ${tenantId}] Failed to list locations:`, e);
                    outputLog.push(`[Tenant ${tenantId}] Error listing locations: ${e.message}`);
                    continue;
                }

                if (locations.length === 0) {
                    outputLog.push(`[Tenant ${tenantId}] No locations found.`);
                    continue;
                }

                // Fetch stores for this tenant (include auto_reply settings + tenant plan)
                const { data: tenantStores } = await supabase
                    .from('stores')
                    .select('id, name, slug, place_id, auto_reply_mode, auto_reply_min_rating, tenants!inner(plan)')
                    .eq('tenant_id', tenantId);

                for (const loc of locations) {
                    // Dynamic Store Matching
                    let storeId = null;
                    const locTitle = (loc.title || '').toLowerCase();
                    const googlePlaceId = loc.metadata?.placeId;

                    if (tenantStores) {
                        const matchedStore = tenantStores.find((s: any) => {
                            if (googlePlaceId && s.place_id && s.place_id === googlePlaceId) {
                                return true;
                            }
                            if (locTitle === (s.name || '').toLowerCase()) {
                                return true;
                            }
                            return false;
                        });

                        if (matchedStore) {
                            storeId = matchedStore.id;
                            outputLog.push(`[Tenant ${tenantId}] Matched "${loc.title}" → ${matchedStore.name} (ID: ${storeId})`);

                            // Cache auto-reply settings
                            const tenantData = matchedStore.tenants as any;
                            storeAutoReplyMap.set(storeId, {
                                mode: (matchedStore as any).auto_reply_mode || 'manual',
                                minRating: (matchedStore as any).auto_reply_min_rating || 4,
                                tenantPlan: tenantData?.plan || 'free',
                            });

                            if (loc.regularHours) {
                                const formattedHours = formatGoogleHours(loc.regularHours);
                                if (formattedHours) {
                                    storeHoursMap.set(storeId, formattedHours);
                                }
                            }
                        }
                    }

                    if (!storeId) {
                        outputLog.push(`[Tenant ${tenantId}] Skipping "${loc.title}" (no DB match)`);
                        continue;
                    }

                    // Fetch Reviews for this location
                    let pageToken = undefined;
                    do {
                        try {
                            const url = `https://mybusiness.googleapis.com/v4/${accountName}/${loc.name}/reviews`;
                            const res = await oauth2Client.request({
                                url,
                                params: { pageSize: 50, pageToken }
                            });

                            const reviewsRes = res.data as any;
                            const reviews = reviewsRes.reviews || [];

                            for (const review of reviews) {
                                const reviewDate = new Date(review.updateTime);
                                if (reviewDate < lookbackWindow) continue;

                                const { data: existing } = await supabase
                                    .from('reviews_raw')
                                    .select('id, google_review_id, store_id')
                                    .eq('google_review_id', review.reviewId)
                                    .single();

                                if (!existing) {
                                    const STAR_RATING_MAP: Record<string, number> = {
                                        'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
                                    };
                                    const numericRating = STAR_RATING_MAP[review.starRating] || 5;

                                    const { error: insertError } = await supabase.from('reviews_raw').insert({
                                        google_review_id: review.reviewId,
                                        author_name: review.reviewer.displayName,
                                        rating: numericRating,
                                        content: review.comment || '',
                                        full_json: review,
                                        reply_status: 'pending',
                                        created_at: new Date().toISOString(),
                                        store_id: storeId,
                                    });

                                    if (insertError) {
                                        outputLog.push(`Failed to insert ${review.reviewId}: ${insertError.message}`);
                                    } else {
                                        outputLog.push(`Imported review ${review.reviewId}`);
                                        notifyNewReview(storeId, {
                                            author_name: review.reviewer.displayName,
                                            rating: numericRating,
                                            content: review.comment || '',
                                        }).catch(err => console.error('Notification failed:', err));
                                    }
                                } else if (existing.store_id !== storeId) {
                                    await supabase
                                        .from('reviews_raw')
                                        .update({ store_id: storeId })
                                        .eq('id', existing.id);
                                    outputLog.push(`Auto-repaired store_id for ${review.reviewId}`);
                                }
                            }
                            pageToken = reviewsRes.nextPageToken;
                        } catch (err: any) {
                            outputLog.push(`Error fetching reviews for ${loc.name}: ${err.message}`);
                            break;
                        }
                    } while (pageToken);
                }
            } catch (tenantErr: any) {
                outputLog.push(`[Tenant ${tenantId}] Unexpected error: ${tenantErr.message}`);
                continue; // Don't let one tenant's failure stop others
            }
        }

        // --- PRE-FETCH REPLY TEMPLATES (for all tenants at once) ---
        const allTenantIdsSet = new Set(tenantIds);
        const tenantTemplatesMap = new Map<string, ReplyTemplate[]>();

        if (allTenantIdsSet.size > 0) {
            const { data: allTemplates } = await supabase
                .from('reply_templates')
                .select('*')
                .in('tenant_id', [...allTenantIdsSet])
                .eq('is_active', true);

            if (allTemplates) {
                for (const t of allTemplates) {
                    const existing = tenantTemplatesMap.get(t.tenant_id) || [];
                    existing.push(t as ReplyTemplate);
                    tenantTemplatesMap.set(t.tenant_id, existing);
                }
                outputLog.push(`Loaded ${allTemplates.length} active reply templates across ${tenantTemplatesMap.size} tenant(s).`);
            }
        }

        // --- DRAFT GENERATION (Parallel with concurrency 5) ---
        const { data: pendingReviews } = await supabase
            .from('reviews_raw')
            .select('*, stores!inner(tenant_id, business_vertical)')
            .or('reply_status.eq.pending,reply_status.eq.drafted')
            .limit(20);

        const autoApprovedReviewIds: string[] = [];

        if (pendingReviews && pendingReviews.length > 0) {
            outputLog.push(`Generating AI drafts for ${pendingReviews.length} reviews (parallel)...`);

            const draftTasks = pendingReviews.map((review) => async () => {
                let contactEmail = '';
                let toneSetting = 'Professional and Warm';
                let customOverrides = 'None';
                let storeName = 'Our Store';
                let dessertDesc = 'dessert';
                let storeFacts = 'None specified';
                let storeVertical: string | null = null;

                if (review.store_id) {
                    const { data: s } = await supabase
                        .from('stores')
                        .select('*')
                        .eq('id', review.store_id)
                        .single();

                    if (s) {
                        storeName = s.name;
                        contactEmail = s.support_email || '';
                        toneSetting = s.tone_setting || toneSetting;
                        customOverrides = JSON.stringify(s.custom_handbook_overrides || {});
                        dessertDesc = s.dessert_description || 'dessert';
                        storeVertical = s.business_vertical || 'restaurant';

                        const dbHours = s.business_hours && s.business_hours.trim() !== '' ? s.business_hours : null;
                        const googleHours = storeHoursMap.get(review.store_id);
                        const finalHours = dbHours || googleHours || 'Standard 11AM-10PM';

                        const facts = [
                            `Dine-In: ${s.can_dine_in ? 'Yes' : 'No'}`,
                            `Takeout: ${s.can_takeout ? 'Yes' : 'No'}`,
                            `Restroom: ${s.has_restroom ? 'Yes' : 'No'}`,
                            `Sauce Bar: ${s.has_sauce_bar ? 'Yes' : 'No'}`,
                            `Parking: ${s.has_parking ? 'Yes' : 'No'}`,
                            `Free Dessert: ${s.has_free_dessert ? 'Yes' : 'No'} (${dessertDesc})`,
                            `Happy Hour: ${s.has_happy_hour ? 'Yes' : 'No'}`,
                            `Business Hours: ${finalHours}`
                        ];
                        storeFacts = facts.join(', ');
                    }
                }

                const emailReplacement = contactEmail || '(no support email configured)';

                // --- TEMPLATE MATCHING: check for a matching template before calling OpenAI ---
                const tenantId = (review.stores as any)?.tenant_id;
                const tenantTemplates = tenantId ? (tenantTemplatesMap.get(tenantId) || []) : [];
                const reviewLang = review.detected_language || 'en';
                const inferredCategory = inferCategoryFromRating(review.rating);

                const matchedTemplate = tenantTemplates.length > 0
                    ? findBestTemplate(tenantTemplates, {
                        rating: review.rating,
                        language: reviewLang,
                        vertical: storeVertical,
                        storeName,
                        authorName: review.author_name || 'Valued Customer',
                        reviewText: review.content || '',
                    }, inferredCategory)
                    : null;

                let draftBody = '';
                let category = '';
                let detectedLanguage: string | null = null;
                let usedTemplate = false;

                if (matchedTemplate) {
                    // Use template — skip OpenAI call entirely
                    draftBody = hydrateTemplate(matchedTemplate, {
                        rating: review.rating,
                        language: reviewLang,
                        vertical: storeVertical,
                        storeName,
                        authorName: review.author_name || 'Valued Customer',
                        reviewText: review.content || '',
                    });
                    category = matchedTemplate.category;
                    detectedLanguage = reviewLang;
                    usedTemplate = true;

                    // Increment template use_count (fire-and-forget)
                    supabase
                        .from('reply_templates')
                        .update({ use_count: matchedTemplate.use_count + 1 })
                        .eq('id', matchedTemplate.id)
                        .then(() => {});
                } else {
                    // Fall back to AI generation
                    const basePrompt = buildReplyPrompt(storeVertical);
                    const finalPrompt = basePrompt
                        .replaceAll('{{store_name}}', storeName)
                        .replaceAll('{{store_facts}}', storeFacts)
                        .replaceAll('{{dessert_description}}', dessertDesc)
                        .replaceAll('{{contact_email}}', emailReplacement)
                        .replaceAll('{{tone_setting}}', toneSetting)
                        .replaceAll('{{custom_handbook_overrides}}', customOverrides)
                        .replaceAll('{{customer_review}}', review.content || 'No text review')
                        .replaceAll('{{rating}}', review.rating.toString());

                    const completion = await openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'system', content: finalPrompt }],
                        temperature: 0.7,
                        response_format: { type: "json_object" }
                    });

                    const content = completion.choices[0]?.message?.content;

                    if (content) {
                        try {
                            const parsed = JSON.parse(content);
                            draftBody = parsed.draft;
                            category = parsed.category;
                            detectedLanguage = parsed.detected_language || null;
                        } catch (e) {
                            console.error('Failed to parse AI JSON', e);
                            draftBody = content;
                            category = 'Parsing Error';
                        }
                    }
                }

                if (draftBody) {
                    // Determine auto-approve status based on store settings + plan gating
                    const storeSettings = storeAutoReplyMap.get(review.store_id);
                    let newStatus = 'drafted';

                    if (storeSettings && hasFeature(storeSettings.tenantPlan, 'autoReplyMode')) {
                        if (storeSettings.mode === 'auto_all') {
                            newStatus = 'approved';
                        } else if (
                            storeSettings.mode === 'auto_positive' &&
                            review.rating >= storeSettings.minRating
                        ) {
                            newStatus = 'approved';
                        }
                    }

                    // Compute confidence score for auto-approved replies
                    let confidence = null;
                    if (newStatus === 'approved') {
                        confidence = computeConfidence({
                            rating: review.rating,
                            reviewText: review.content || '',
                            replySource: usedTemplate ? 'template' : 'ai',
                            autoReplyMode: storeSettings?.mode || 'manual',
                            minRatingThreshold: storeSettings?.minRating || 4,
                            sentimentScore: review.sentiment_score ?? null,
                            sentimentLabel: review.sentiment_label ?? null,
                        });

                        // Safety net: if confidence is too low, downgrade to drafted
                        if (shouldFlagForReview(confidence)) {
                            newStatus = 'drafted';
                        }
                    }

                    const payload = JSON.stringify({
                        category,
                        draft: draftBody,
                        ...(confidence ? { confidence: { score: confidence.score, level: confidence.level, reasons: confidence.reasons } } : {}),
                    });

                    await supabase
                        .from('reviews_raw')
                        .update({
                            reply_draft: payload,
                            reply_status: newStatus,
                            ...(detectedLanguage ? { detected_language: detectedLanguage } : {}),
                        })
                        .eq('id', review.id);

                    if (newStatus === 'approved') {
                        autoApprovedReviewIds.push(review.id);
                    }

                    // URGENT ALERT: 1-2 star reviews that need manual approval
                    if (review.rating <= 2 && newStatus !== 'approved' && review.store_id) {
                        notifyUrgentReview(review.store_id, {
                            reviewId: review.id,
                            author_name: review.author_name || 'Anonymous',
                            rating: review.rating,
                            content: review.content || '',
                            aiDraft: draftBody,
                        }).catch(err => console.error('[UrgentAlert] Failed:', err));
                    }

                    const source = usedTemplate ? 'Template' : 'AI';
                    return `[${source}] Drafted reply for ${review.google_review_id} (Category: ${category}, Status: ${newStatus})`;
                }
                return `No content for ${review.google_review_id}`;
            });

            // Run AI drafts in parallel with concurrency of 5
            const draftResults = await runWithConcurrency(draftTasks, 5);

            for (const result of draftResults) {
                if (result.status === 'fulfilled') {
                    outputLog.push(result.value);
                } else {
                    outputLog.push(`Draft error: ${result.reason?.message || result.reason}`);
                }
            }
        }

        // --- INLINE PUBLISH: Auto-approved reviews get published immediately ---
        if (autoApprovedReviewIds.length > 0) {
            outputLog.push(`Auto-publishing ${autoApprovedReviewIds.length} approved reviews...`);

            const { data: toPublish } = await supabase
                .from('reviews_raw')
                .select('*, stores!inner(tenant_id)')
                .in('id', autoApprovedReviewIds)
                .eq('reply_status', 'approved');

            if (toPublish && toPublish.length > 0) {
                for (const review of toPublish) {
                    try {
                        const resourceName = review.full_json?.name;
                        if (!resourceName) {
                            outputLog.push(`[Publish] Missing 'name' in full_json for review ${review.id}, skipping.`);
                            continue;
                        }

                        if (!review.reply_draft) {
                            outputLog.push(`[Publish] Missing reply_draft for review ${review.id}, skipping.`);
                            continue;
                        }

                        // Get OAuth client for this tenant
                        const tenantId = (review.stores as any)?.tenant_id;
                        let authClient = tenantAuthCache.get(tenantId) || null;

                        if (!authClient && tenantId) {
                            const tenantClient = await getGoogleClientForTenant(tenantId);
                            if (tenantClient) {
                                authClient = tenantClient.oauth2Client;
                                tenantAuthCache.set(tenantId, authClient);
                            }
                        }

                        if (!authClient) {
                            outputLog.push(`[Publish] No Google credentials for tenant ${tenantId}, skipping review ${review.id}.`);
                            continue;
                        }

                        // Extract reply body
                        let replyBody = review.reply_draft;
                        try {
                            const parsed = JSON.parse(replyBody);
                            if (parsed.draft) {
                                replyBody = parsed.draft;
                            }
                        } catch {
                            // Not JSON, use as string
                        }

                        // Publish to Google
                        const url = `https://mybusiness.googleapis.com/v4/${resourceName}/reply`;
                        await authClient.request({
                            method: 'PUT',
                            url,
                            data: { comment: replyBody }
                        });

                        // Update status to published
                        await supabase
                            .from('reviews_raw')
                            .update({
                                reply_status: 'published',
                                published_at: new Date().toISOString()
                            })
                            .eq('id', review.id);

                        outputLog.push(`[Publish] Auto-published reply for ${review.author_name} (${review.google_review_id})`);
                    } catch (publishErr: any) {
                        console.error(`[Publish] Failed for review ${review.id}:`, publishErr);
                        outputLog.push(`[Publish] Failed for ${review.author_name}: ${publishErr.message}`);
                    }
                }
            }
        }

        // --- SENTIMENT ANALYSIS BATCH ---
        const { data: unanalyzed } = await supabase
            .from('reviews_raw')
            .select('id, content, rating')
            .is('sentiment_analyzed_at', null)
            .not('content', 'is', null)
            .neq('content', '')
            .limit(30);

        if (unanalyzed && unanalyzed.length > 0) {
            outputLog.push(`Running sentiment analysis on ${unanalyzed.length} reviews...`);
            const results = await analyzeSentimentBatch(
                unanalyzed.map((r) => ({ id: r.id, content: r.content!, rating: r.rating }))
            );

            for (const [id, result] of results) {
                await supabase
                    .from('reviews_raw')
                    .update({
                        sentiment_score: result.score,
                        sentiment_label: result.label,
                        emotion_tags: result.emotions,
                        key_topics: result.topics,
                        sentiment_analyzed_at: new Date().toISOString(),
                    })
                    .eq('id', id);
            }
            outputLog.push(`Sentiment analysis complete: ${results.size} reviews analyzed.`);
        }

        return NextResponse.json({ success: true, processed: outputLog });

    } catch (error: any) {
        console.error('Error in fetch-reviews:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function formatGoogleHours(regularHours: any): string {
    if (!regularHours || !regularHours.periods) return '';

    const shortDays: Record<string, string> = {
        'SUNDAY': 'Sun', 'MONDAY': 'Mon', 'TUESDAY': 'Tue', 'WEDNESDAY': 'Wed',
        'THURSDAY': 'Thu', 'FRIDAY': 'Fri', 'SATURDAY': 'Sat'
    };

    const periods = regularHours.periods;
    if (!periods.length) return '';

    return periods.map((p: any) => {
        const day = shortDays[p.openDay] || p.openDay;
        const openH = p.openTime.hours !== undefined ? p.openTime.hours : 0;
        const closeH = p.closeTime.hours !== undefined ? p.closeTime.hours : 0;
        const open = `${openH}:${(p.openTime.minutes || 0).toString().padStart(2, '0')}`;
        const close = `${closeH}:${(p.closeTime.minutes || 0).toString().padStart(2, '0')}`;
        return `${day} ${open}-${close}`;
    }).join(', ');
}
