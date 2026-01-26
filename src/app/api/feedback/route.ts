import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

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
    try {
        const body = await request.json();
        const { store_id, rating, feedback_text, contact_info } = body;

        if (!store_id || !rating) {
            return jsonResponse({ error: 'Missing store_id or rating' }, 400);
        }

        const ratingTag = `${rating}-star`;

        // Log to generator_events
        const { error } = await supabase
            .from('generator_events')
            .insert({
                store_id,
                event_type: 'negative_feedback',
                tags_used: [ratingTag, feedback_text ? 'has_text' : 'no_text'],
            });

        if (error) throw error;

        console.log(`[Negative Feedback] Store ${store_id} | Rating: ${rating} | Text: ${feedback_text} | Contact: ${contact_info}`);

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
