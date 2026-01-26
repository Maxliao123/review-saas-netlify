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
        const { reviewId } = body;

        if (!reviewId) {
            return jsonResponse({ error: 'Missing reviewId' }, 400);
        }

        const { error } = await supabase
            .from('generated_reviews')
            .update({
                likely_posted: true,
                posted_at: new Date().toISOString()
            })
            .eq('id', reviewId);

        if (error) throw error;

        return jsonResponse({ updated: true }, 200);

    } catch (err: any) {
        console.error('confirm error:', err);
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
