import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getGoogleBusinessClient, getGoogleAccountManagementClient, getGoogleOAuth2Client, getConnectedTenants, getGoogleClientForTenant } from '@/lib/google-business';
import OpenAI from 'openai';
import { EXPERT_SYSTEM_PROMPT } from '@/lib/handbook';
import { notifyNewReview } from '@/lib/notifications';

export const dynamic = 'force-dynamic'; // Ensure not cached

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
    try {
        // 1. Verify Cron Secret
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('cron_secret');

        if (secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const gmb = getGoogleBusinessClient();
        const accountClient = getGoogleAccountManagementClient();
        const outputLog = [];

        // --- 90 Days Lookback ---
        const lookbackWindow = new Date();
        lookbackWindow.setDate(lookbackWindow.getDate() - 90);

        // --- FETCHING ACCOUNTS DYNAMICALLY ---
        // 1. List Accounts
        let accountName = '';
        try {
            const accountsRes = await accountClient.accounts.list();
            const accounts = accountsRes.data.accounts || [];

            if (accounts.length > 0) {
                accountName = accounts[0].name!;
                outputLog.push(`Using account: ${accountName}`);
            } else {
                throw new Error('No accounts found for the authenticated user.');
            }
        } catch (error: any) {
            return NextResponse.json({ error: `Failed to list accounts: ${error.message}` }, { status: 500 });
        }

        // 2. List Locations using the found account
        let locations: any[] = [];
        try {
            // API Doc: parent should be "accounts/{accountId}"
            const locationsResponse = await gmb.accounts.locations.list({
                parent: accountName,
                readMask: 'name,title,storeCode,regularHours,metadata'
            });
            locations = locationsResponse.data.locations || [];
        } catch (e: any) {
            console.error('Failed to list locations:', e);
            outputLog.push(`Error listing locations: ${e.message}`);
        }

        if (locations.length === 0) {
            outputLog.push('No locations found.');
            return NextResponse.json({ success: true, processed: outputLog });
        }

        const auth = getGoogleOAuth2Client();

        // Fetch all stores once for JS matching (to handle partial matches better than specific RPC queries)
        const { data: allStores } = await supabase
            .from('stores')
            .select('id, name, slug, place_id');

        const storeHoursMap = new Map<number, string>();

        for (const loc of locations) {
            // Dynamic Store Matching (In-Memory JS for flexibility)
            let storeId = null;
            const locTitle = (loc.title || '').toLowerCase();

            if (allStores) {
                // Strict Matching by Place ID
                // API returns placeId in metadata (v4 or performace API)
                // For v4 accounts.locations.list, metadata might contain placeId if requested.
                // Let's check loc.metadata?.placeId
                const googlePlaceId = loc.metadata?.placeId;

                const matchedStore = allStores.find(s => {
                    if (googlePlaceId && s.place_id && s.place_id === googlePlaceId) {
                        return true;
                    }

                    // Fallback to strict name match ONLY if Place ID is missing in DB
                    // User directive: "Strictly forbid .includes()". 
                    // But if user hasn't set place_id yet, we might brake everything.
                    // New directive: "Add fallback Exact Name Match"
                    // locTitle === dbName
                    if (locTitle === (s.name || '').toLowerCase()) {
                        return true;
                    }

                    return false;
                });

                if (matchedStore) {
                    storeId = matchedStore.id;
                    outputLog.push(`Matched store for "${loc.title}": ${matchedStore.name} (ID: ${storeId})`);

                    // Capture Google Hours
                    if (loc.regularHours) {
                        const formattedHours = formatGoogleHours(loc.regularHours);
                        if (formattedHours) {
                            storeHoursMap.set(storeId, formattedHours);
                            outputLog.push(`Captured Google Hours for ${matchedStore.name}: ${formattedHours}`);
                        }
                    }
                }
            }

            if (!storeId) {
                console.warn(`No matching store found for location title: "${loc.title}". Skipping.`);
                outputLog.push(`Skipping location "${loc.title}" (No DB match)`);
                continue;
            }

            // List Reviews
            // API: accounts/{accountId}/locations/{locationId}/reviews
            console.log('Fetching reviews for:', loc.name); // Debug log

            let pageToken = undefined;
            do {
                try {
                    const url = `https://mybusiness.googleapis.com/v4/${accountName}/${loc.name}/reviews`;
                    const res = await auth.request({
                        url,
                        params: {
                            pageSize: 50,
                            pageToken
                        }
                    });

                    const reviewsRes = res.data as any; // Cast to expected shape

                    const reviews = reviewsRes.reviews || [];
                    for (const review of reviews) {
                        const reviewDate = new Date(review.updateTime); // or createTime
                        if (reviewDate < lookbackWindow) continue;

                        // Check existence
                        const { data: existing } = await supabase
                            .from('reviews_raw')
                            .select('id, google_review_id, store_id') // Fetch store_id for comparison
                            .eq('google_review_id', review.reviewId)
                            .single();

                        if (!existing) {
                            // Convert Star Rating (e.g. "FIVE" -> 5)
                            const STAR_RATING_MAP: Record<string, number> = {
                                'ONE': 1,
                                'TWO': 2,
                                'THREE': 3,
                                'FOUR': 4,
                                'FIVE': 5
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
                                store_id: storeId // Strict ID
                            });

                            if (insertError) {
                                console.error(`Failed to insert review ${review.reviewId}:`, insertError);
                                outputLog.push(`Failed to insert ${review.reviewId}: ${insertError.message}`);
                            } else {
                                outputLog.push(`Imported review ${review.reviewId}`);

                                // Fire-and-forget notification
                                notifyNewReview(storeId, {
                                    author_name: review.reviewer.displayName,
                                    rating: numericRating,
                                    content: review.comment || '',
                                }).catch(err => console.error('Notification failed:', err));
                            }
                        } else {
                            // Auto-Repair Logic: Fix Store ID if mismatched
                            if (existing.store_id !== storeId) {
                                console.log(`Auto-Repairing Store ID for review ${review.reviewId}. Old: ${existing.store_id}, New: ${storeId}`);
                                await supabase
                                    .from('reviews_raw')
                                    .update({ store_id: storeId })
                                    .eq('id', existing.id);
                                outputLog.push(`Auto-Repaired Store ID for ${review.reviewId}`);
                            }
                        }
                    }
                    pageToken = reviewsRes.nextPageToken;
                } catch (err: any) {
                    console.error(`Error fetching reviews for ${loc.name}:`, err);
                    outputLog.push(`Error fetching reviews for ${loc.name}: ${err.message}`);
                    break; // Skip to next location if one fails
                }
            } while (pageToken);
        }

        // --- DRAFT GENERATION (Existing Logic) ---
        const { data: pendingReviews } = await supabase
            .from('reviews_raw')
            .select('*')
            // Draft Refresh: Select both pending and drafted to allow regeneration
            .or('reply_status.eq.pending,reply_status.eq.drafted')
            .limit(20); // Throttle batch size

        if (pendingReviews) {
            for (const review of pendingReviews) {
                // Fetch Store Settings
                let contactEmail = 'doa@bigwayhotpot.com';
                let toneSetting = 'Professional and Warm';
                let customOverrides = 'None';
                let storeName = 'Big Way Hot Pot';
                let dessertDesc = 'dessert';
                let storeFacts = 'None specified'; // Default

                if (review.store_id) {
                    const { data: s } = await supabase
                        .from('stores')
                        .select('*') // Select all to get facilities
                        .eq('id', review.store_id)
                        .single();

                    if (s) {
                        storeName = s.name;
                        contactEmail = s.support_email || contactEmail;
                        toneSetting = s.tone_setting || toneSetting;
                        customOverrides = JSON.stringify(s.custom_handbook_overrides || {});
                        dessertDesc = s.dessert_description || 'dessert';

                        // Fact Logic: Prioritize Google Hours if DB is standard/empty or if explicitly requested
                        // User Rule: "Leave blank to use Google". So if s.business_hours is empty/null, use Google.
                        // Also logic: "if failure, use DB". 
                        // Implementation: If we have Google Hours, use them IF DB is default or empty.
                        // Actually, let's strictly follow: Use Google if available. Fallback to DB.
                        // BUT user might have custom override in DB.
                        // Refined Logic based on "Leave blank": 
                        // If DB has value (and not just default? No, user might want default), use DB.
                        // Wait, user said: "Unless they want to 'specifically set'... they can leave it blank."
                        // This implies: If DB is NOT blank, use DB. If DB IS blank, use Google.
                        const dbHours = s.business_hours && s.business_hours.trim() !== '' ? s.business_hours : null;
                        const googleHours = storeHoursMap.get(review.store_id);
                        const finalHours = dbHours || googleHours || 'Standard 11AM-10PM';

                        // Build Fact Sheet
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

                // Construct Prompt
                const finalPrompt = EXPERT_SYSTEM_PROMPT
                    .replace('{{store_name}}', storeName)
                    .replace('{{store_facts}}', storeFacts)
                    .replace('{{dessert_description}}', dessertDesc)
                    .replace('{{contact_email}}', contactEmail)
                    .replace('{{tone_setting}}', toneSetting)
                    .replace('{{custom_handbook_overrides}}', customOverrides)
                    .replace('{{customer_review}}', review.content || 'No text review')
                    .replace('{{rating}}', review.rating.toString());

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: finalPrompt }
                    ],
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                });

                const content = completion.choices[0]?.message?.content;

                if (content) {
                    let draftBody = '';
                    let category = '';

                    try {
                        const parsed = JSON.parse(content);
                        draftBody = parsed.draft;
                        category = parsed.category;
                    } catch (e) {
                        console.error('Failed to parse AI JSON', e);
                        draftBody = content;
                        category = 'Parsing Error';
                    }

                    // Save as JSON string to preserve category for Frontend
                    const payload = JSON.stringify({ category, draft: draftBody });

                    await supabase
                        .from('reviews_raw')
                        .update({
                            reply_draft: payload,
                            reply_status: 'drafted'
                        })
                        .eq('id', review.id);

                    outputLog.push(`Drafted reply for ${review.google_review_id} (Category: ${category})`);
                }
            }
        }

        return NextResponse.json({ success: true, processed: outputLog });

    } catch (error: any) {
        console.error('Error in fetch-reviews:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function formatGoogleHours(regularHours: any): string {
    if (!regularHours || !regularHours.periods) return '';

    // periods: [{openDay: "MONDAY", openTime: "11:00", closeDay: "MONDAY", closeTime: "22:00"}, ...]
    // We want to group by time? Or just list them.
    // Simple Compact Format: "Mon 11:00-22:00, Tue..."

    // Sort determines order, but API usually returns sorted
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const shortDays: Record<string, string> = {
        'SUNDAY': 'Sun', 'MONDAY': 'Mon', 'TUESDAY': 'Tue', 'WEDNESDAY': 'Wed', 'THURSDAY': 'Thu', 'FRIDAY': 'Fri', 'SATURDAY': 'Sat'
    };

    const periods = regularHours.periods;
    if (!periods.length) return '';

    // Simple textual representation
    return periods.map((p: any) => {
        const day = shortDays[p.openDay] || p.openDay;
        // Fix: openTime/closeTime are objects {hours, minutes}
        // Handle 0 hours (midnight or start of day) explicitly
        const openH = p.openTime.hours !== undefined ? p.openTime.hours : 0;
        const closeH = p.closeTime.hours !== undefined ? p.closeTime.hours : 0;

        const open = `${openH}:${(p.openTime.minutes || 0).toString().padStart(2, '0')}`;
        const close = `${closeH}:${(p.closeTime.minutes || 0).toString().padStart(2, '0')}`;
        return `${day} ${open}-${close}`;
    }).join(', ');
}
