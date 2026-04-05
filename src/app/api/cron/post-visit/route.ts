import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendFeedbackInvite } from '@/lib/sms';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('cron_secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const errors: string[] = [];
    let sent = 0;

    const now = new Date();
    const from = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

    // Bookings verified (checked-in) 1-3 hours ago, not yet invited for review
    const { data: bookings, error: queryError } = await supabase
      .from('bookings')
      .select(`
        id,
        members!inner ( name, phone, member_token ),
        stores!inner ( name )
      `)
      .gte('verified_at', from)
      .lte('verified_at', to)
      .is('review_invited_at', null)
      .eq('status', 'completed');

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ sent: 0, errors: [], message: 'No post-visit invites to send' });
    }

    for (const booking of bookings) {
      const member = booking.members as any;
      const store = booking.stores as any;

      if (!member?.phone) {
        errors.push(`Booking ${booking.id}: member has no phone`);
        continue;
      }

      const result = await sendFeedbackInvite(
        member.phone,
        member.name,
        store.name,
        booking.id,
        member.member_token
      );

      if (result.success) {
        await supabase
          .from('bookings')
          .update({ review_invited_at: new Date().toISOString() })
          .eq('id', booking.id);
        sent++;
      } else {
        errors.push(`Booking ${booking.id}: ${result.error}`);
      }
    }

    return NextResponse.json({ sent, errors });
  } catch (error: any) {
    console.error('Error in post-visit cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
