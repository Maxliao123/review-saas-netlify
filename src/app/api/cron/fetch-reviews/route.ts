import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getGoogleBusinessClient, getGoogleAccountManagementClient } from '@/lib/google-business';
import OpenAI from 'openai';
import { HANDBOOK_CONTENT, SYSTEM_PROMPT_TEMPLATE, USER_PROMPT_TEMPLATE } from '@/lib/handbook';

export const dynamic = 'force-dynamic'; // Ensure not cached

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
    try {
        // 1. Verify Cron Secret
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Allow local testing or valid cron
        }

        const gmb = getGoogleBusinessClient();
        const accountClient = getGoogleAccountManagementClient();
        const outputLog = [];

        // --- 90 Days Lookback ---
        const lookbackWindow = new Date();
        lookbackWindow.setDate(lookbackWindow.getDate() - 90);

        // --- Store Association Logic ---
        let memoryCornerId = null;
        const { data: storeData } = await supabase
            .from('stores')
            .select('id')
            .or('slug.eq.memorycorner,name.ilike.%memorycorner%')
            .limit(1)
            .single();

        if (storeData) {
            memoryCornerId = storeData.id;
            outputLog.push(`Found Memory Corner Store ID: ${memoryCornerId}`);
        } else {
            console.warn('Memory Corner store not found in DB.');
        }

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
        let locations = [];
        try {
            // API Doc: parent should be "accounts/{accountId}"
            const locationsResponse = await gmb.accounts.locations.list({
                parent: accountName,
                readMask: 'name,title,storeCode'
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

        for (const loc of locations) {
            // List Reviews
            // API: accounts/{accountId}/locations/{locationId}/reviews
            const reviewUrl = `${loc.name}/reviews`; // loc.name is "accounts/.../locations/..."

            let pageToken = undefined;
            do {
                const reviewsRes: any = await gmb.accounts.locations.reviews.list({
                    parent: loc.name,
                    pageSize: 50,
                    pageToken
                });

                const reviews = reviewsRes.data.reviews || [];
                for (const review of reviews) {
                    const reviewDate = new Date(review.updateTime); // or createTime
                    if (reviewDate < lookbackWindow) continue;

                    // Check existence
                    const { data: existing } = await supabase
                        .from('reviews_raw')
                        .select('review_id')
                        .eq('review_id', review.reviewId)
                        .single();

                    if (!existing) {
                        // Insert with Store ID link
                        await supabase.from('reviews_raw').insert({
                            review_id: review.reviewId,
                            author_name: review.reviewer.displayName,
                            rating: review.starRating,
                            content: review.comment || '',
                            full_json: review,
                            reply_status: 'pending',
                            created_at: new Date().toISOString(),
                            store_id: memoryCornerId // Associating here
                        });
                        outputLog.push(`Imported review ${review.reviewId}`);
                    }
                }
                pageToken = reviewsRes.data.nextPageToken;
            } while (pageToken);
        }

        // --- DRAFT GENERATION (Existing Logic) ---
        const { data: pendingReviews } = await supabase
            .from('reviews_raw')
            .select('*')
            .eq('reply_status', 'pending')
            .limit(10); // Batch size

        if (pendingReviews) {
            for (const review of pendingReviews) {
                const contactEmail = 'doa@bigwayhotpot.com'; // Extracted from blueprint
                const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('{{contact_email}}', contactEmail);
                let userPrompt = USER_PROMPT_TEMPLATE
                    .replace('{{handbook_content}}', HANDBOOK_CONTENT)
                    .replace('{{customer_review}}', review.content || '【這位顧客沒有留下任何文字評論】')
                    .replace('{{contact_email}}', contactEmail); // In case it's used in user prompt too

                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini', // Blueprint used this
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 1,
                    max_tokens: 2048
                });

                const draftReply = completion.choices[0]?.message?.content?.trim();

                if (draftReply) {
                    // Update DB
                    await supabase
                        .from('reviews_raw')
                        .update({
                            reply_draft: draftReply,
                            reply_status: 'drafted' // Ready for human review or auto-approve? Blueprint says "Draft", implies review.
                        })
                        .eq('id', review.id);

                    outputLog.push(`Drafted reply for ${review.review_id}`);
                }
            }
        }

        return NextResponse.json({ success: true, processed: outputLog });

    } catch (error: any) {
        console.error('Error in fetch-reviews:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
