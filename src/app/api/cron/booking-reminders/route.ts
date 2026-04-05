import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendBookingReminder } from '@/lib/sms';

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
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    // Bookings happening in 23-25 hours that haven't received a reminder yet
    const { data: bookings, error: queryError } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        notes,
        members!inner ( name, phone, member_token ),
        services!inner ( name ),
        stores!inner ( name )
      `)
      .gte('start_time', from)
      .lte('start_time', to)
      .is('reminder_sent_at', null)
      .eq('status', 'confirmed');

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ sent: 0, errors: [], message: 'No bookings to remind' });
    }

    for (const booking of bookings) {
      const member = booking.members as any;
      const service = booking.services as any;
      const store = booking.stores as any;

      if (!member?.phone) {
        errors.push(`Booking ${booking.id}: member has no phone`);
        continue;
      }

      // Format date/time for display
      const dt = new Date(booking.start_time);
      const dateTime = dt.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const result = await sendBookingReminder(
        member.phone,
        member.name,
        store.name,
        service.name,
        dateTime,
        member.member_token,
        booking.notes || undefined
      );

      if (result.success) {
        await supabase
          .from('bookings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', booking.id);
        sent++;
      } else {
        errors.push(`Booking ${booking.id}: ${result.error}`);
      }
    }

    return NextResponse.json({ sent, errors });
  } catch (error: any) {
    console.error('Error in booking-reminders cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
