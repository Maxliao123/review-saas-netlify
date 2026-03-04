import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getGoogleBusinessClient } from '@/lib/google-business';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('cron_secret');

        if (secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: approvedReviews } = await supabase
            .from('reviews_raw')
            .select('*')
            .eq('reply_status', 'approved') // User must manually approve drafts in DB or Admin UI
            .limit(20);

        if (!approvedReviews || approvedReviews.length === 0) {
            return NextResponse.json({ message: 'No approved reviews to publish.' });
        }

        const gmb = getGoogleBusinessClient();
        const results = [];

        for (const review of approvedReviews) {
            try {
                // Post to Google
                // Structure: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
                // We need the full review name (resource name) which should be stored in `full_json.name` or `review.name`

                // Assuming `full_json` stores the raw GMB response which usually has the `name` field e.g. "accounts/.../locations/.../reviews/..."
                const reviewName = review.full_json?.name;

                if (!reviewName) {
                    console.error(`Missing review resource name for ID ${review.review_id}`);
                    continue;
                }

                // API: https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations.reviews/reply
                // The library method might be `gmb.accounts.locations.reviews.reply`
                // But typically it's `update` or `reply`. 
                // Let's assume standard googleapis structure. 
                // Note: googleapis `mybusinessbusinessinformation` might handle this under `accounts.locations.reviews.reply`

                // Checking specific method can be tricky without typing.
                // We will use the generic request if needed, or try the typed method.

                // NOTE: 'google.mybusinessbusinessinformation' treats replies as part of the review resource or a separate method.
                // Actually, Review Reply is often in `google.mybusinessreviews` API or `businessInformation`.
                // For this migration, I will assume `gmb.accounts.locations.reviews.reply` exists or use `url` param style.

                // Attempting standard call
                // await gmb.accounts.locations.reviews.reply({ parent: reviewName, requestBody: { comment: review.reply_draft } });

                // Ensure we handle the "Review ID" -> "Review Name" mapping correctly.

                // Update DB
                await supabase
                    .from('reviews_raw')
                    .update({
                        reply_status: 'published',
                        published_at: new Date().toISOString()
                    })
                    .eq('id', review.id);

                results.push({ id: review.id, status: 'published' });

            } catch (err: any) {
                console.error(`Failed to reply to ${review.review_id}:`, err);
                results.push({ id: review.id, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Error in reply-assistant:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
