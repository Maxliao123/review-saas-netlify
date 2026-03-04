import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getGoogleOAuth2Client, getGoogleClientForTenant } from '@/lib/google-business';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // 1. Verify Cron Secret
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('cron_secret');

        if (secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch 'approved' reviews with store → tenant mapping
        const { data: approvedReviews } = await supabase
            .from('reviews_raw')
            .select('*, stores!inner(tenant_id)')
            .eq('reply_status', 'approved');

        if (!approvedReviews || approvedReviews.length === 0) {
            return NextResponse.json({ message: 'No approved reviews to publish.' });
        }

        // Cache per-tenant OAuth clients
        const tenantAuthCache = new Map<string, any>();

        const successLog: string[] = [];
        const errorLog: string[] = [];

        for (const review of approvedReviews) {
            try {
                const resourceName = review.full_json?.name;

                if (!resourceName) {
                    throw new Error(`Missing 'name' in full_json for review ${review.id}`);
                }

                if (!review.reply_draft) {
                    throw new Error(`Missing reply_draft for review ${review.id}`);
                }

                // Resolve OAuth client: per-tenant first, env-var fallback
                const tenantId = (review.stores as any)?.tenant_id;
                let authClient: any = null;

                if (tenantId) {
                    if (!tenantAuthCache.has(tenantId)) {
                        const tenantClient = await getGoogleClientForTenant(tenantId);
                        tenantAuthCache.set(tenantId, tenantClient?.oauth2Client || null);
                    }
                    authClient = tenantAuthCache.get(tenantId);
                }

                if (!authClient) {
                    throw new Error(`No Google credentials for tenant ${tenantId || 'unknown'} (review ${review.id}). Ask tenant owner to reconnect Google Business.`);
                }

                console.log(`Publishing reply for ${review.author_name} (${resourceName})...`);

                const url = `https://mybusiness.googleapis.com/v4/${resourceName}/reply`;

                let replyBody = review.reply_draft;
                try {
                    const parsed = JSON.parse(replyBody);
                    if (parsed.draft) {
                        replyBody = parsed.draft;
                    }
                } catch {
                    // Not JSON, use as string
                }

                await authClient.request({
                    method: 'PUT',
                    url: url,
                    data: {
                        comment: replyBody
                    }
                });

                const { error: updateError } = await supabase
                    .from('reviews_raw')
                    .update({
                        reply_status: 'published',
                        published_at: new Date().toISOString()
                    })
                    .eq('id', review.id);

                if (updateError) {
                    throw new Error(`Failed to update DB status: ${updateError.message}`);
                }

                successLog.push(review.author_name);

            } catch (err: any) {
                console.error(`Failed to publish reply for review ${review.id}:`, err);
                errorLog.push(`Failed for ${review.author_name}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            published_count: successLog.length,
            published_authors: successLog,
            errors: errorLog
        });

    } catch (error: any) {
        console.error('Error in publish-replies:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
