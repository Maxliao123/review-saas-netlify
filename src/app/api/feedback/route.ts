import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

function jsonResponse(body: any, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(request: NextRequest) {
    // Rate limit check
    const ip = getClientIP(request);
    const rl = checkRateLimit(`feedback:${ip}`, RATE_LIMITS.feedback);
    const rlResp = rateLimitResponse(rl);
    if (rlResp) return rlResp;

    try {
        const body = await request.json();
        const { store_id, rating, feedback_text, contact_info } = body;

        if (!store_id || !rating) {
            return jsonResponse({ error: 'Missing store_id or rating' }, 400);
        }

        const ratingTag = `${rating}-star`;

        // Store feedback in dedicated table
        const { error: fbError } = await supabase
            .from('customer_feedback')
            .insert({
                store_id,
                rating,
                feedback_text: feedback_text || null,
                contact_info: contact_info || null,
                status: 'new',
            });

        if (fbError) {
            // Fallback: if table doesn't exist yet, just log to events
            console.warn('customer_feedback insert failed (table may not exist yet):', fbError.message);
        }

        // Also log to generator_events for analytics
        const { error } = await supabase
            .from('generator_events')
            .insert({
                store_id,
                event_type: 'negative_feedback',
                tags_used: [ratingTag, feedback_text ? 'has_text' : 'no_text'],
            });

        if (error) throw error;

        return jsonResponse({ success: true }, 200);

    } catch (err: any) {
        console.error('feedback error:', err);
        return jsonResponse({ error: String(err.message || err) }, 500);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
