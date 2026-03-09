import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/invite/track?token=xxx&event=opened|completed
 * Public endpoint for tracking invite engagement (pixel tracking / redirect).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const event = searchParams.get('event');

    if (!token || !event) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (event === 'opened') {
      await supabaseAdmin
        .from('review_invites')
        .update({ status: 'opened', opened_at: now })
        .eq('invite_token', token)
        .in('status', ['sent', 'delivered']);
    } else if (event === 'completed') {
      await supabaseAdmin
        .from('review_invites')
        .update({ status: 'completed', completed_at: now })
        .eq('invite_token', token)
        .in('status', ['sent', 'delivered', 'opened']);
    }

    // Return 1x1 transparent pixel for email tracking
    if (event === 'opened') {
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      return new NextResponse(pixel, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
