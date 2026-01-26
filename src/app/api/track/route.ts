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
        const { store_id, event_type, source_id, tags_used } = body;

        if (!store_id || !event_type) {
            return jsonResponse({ error: 'Missing store_id or event_type' }, 400);
        }

        const { data, error } = await supabase
            .from('generator_events')
            .insert({
                store_id,
                event_type,
                source_id: source_id || null,
                tags_used: (tags_used && tags_used.length > 0) ? tags_used : null,
            })
            .select('id')
            .single();

        if (error) throw error;

        return jsonResponse({ id: data?.id }, 200);

    } catch (err: any) {
        console.error('track error:', err);
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
