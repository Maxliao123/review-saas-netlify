import { NextRequest, NextResponse } from 'next/server';
import { validateMemberToken, generateVerificationCode } from '@/lib/member-token';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getAvailableStaff, isSlotAvailable } from '@/lib/booking-utils';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { valid, member, error } = await validateMemberToken(token);

  if (!valid || !member) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('service_id');
  const date = searchParams.get('date');

  // If no service_id, return list of active services
  if (!serviceId) {
    const { data: services } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price, credits_required, description')
      .eq('store_id', member.store_id)
      .eq('is_active', true)
      .order('name');

    return NextResponse.json({ services: services || [] });
  }

  // If service_id but no date, return next 14 days
  if (!date) {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return NextResponse.json({ dates });
  }

  // If both service_id and date, return available staff + slots
  const staff = await getAvailableStaff(member.store_id, serviceId, date);

  return NextResponse.json({ staff });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { valid, member, error } = await validateMemberToken(token);

  if (!valid || !member) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  try {
    const body = await request.json();
    const { service_id, staff_id, start_time } = body;

    if (!service_id || !staff_id || !start_time) {
      return NextResponse.json(
        { error: 'Missing service_id, staff_id, or start_time' },
        { status: 400 }
      );
    }

    // Get service duration
    const { data: service } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price, credits_required')
      .eq('id', service_id)
      .eq('store_id', member.store_id)
      .single();

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const startDate = new Date(start_time);
    if (isNaN(startDate.getTime()) || startDate < new Date()) {
      return NextResponse.json({ error: 'Invalid or past date' }, { status: 400 });
    }
    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60 * 1000);
    const endTime = endDate.toISOString();

    // Check slot availability
    const available = await isSlotAvailable(staff_id, member.store_id, start_time, endTime);
    if (!available) {
      return NextResponse.json({ error: 'Time slot no longer available' }, { status: 409 });
    }

    const verificationCode = generateVerificationCode();

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        member_id: member.id,
        store_id: member.store_id,
        service_id,
        staff_id,
        start_time,
        end_time: endTime,
        status: 'confirmed',
        verification_code: verificationCode,
        source: 'member_portal',
      })
      .select('id, start_time, end_time, verification_code, status')
      .single();

    if (bookingError) {
      throw bookingError;
    }

    // Deduct credits if applicable
    if (service.credits_required && service.credits_required > 0) {
      const { data: credit } = await supabase
        .from('member_credits')
        .select('id, remaining')
        .eq('member_id', member.id)
        .gt('remaining', 0)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (credit && credit.remaining >= service.credits_required) {
        await supabase
          .from('member_credits')
          .update({ remaining: credit.remaining - service.credits_required })
          .eq('id', credit.id);
      }
    }

    // Send notification email to store owner
    try {
      const RESEND_KEY = process.env.RESEND_API_KEY;
      const NOTIFY_EMAIL = 'maxliao2020@gmail.com';
      if (RESEND_KEY && NOTIFY_EMAIL) {
        const memberName = member.name || 'A member';
        const timeStr = startDate.toLocaleString('en-CA', { timeZone: 'America/Vancouver', dateStyle: 'medium', timeStyle: 'short' });
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'ReplyWise AI <noreply@replywiseai.com>',
            to: [NOTIFY_EMAIL],
            subject: `📅 New Booking: ${memberName} — ${service.name}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
                <h2 style="color:#E8654A">New Booking Received</h2>
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  <tr><td style="padding:8px 0;color:#666">Member</td><td style="padding:8px 0;font-weight:bold">${memberName} (${member.phone})</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Service</td><td style="padding:8px 0;font-weight:bold">${service.name} (${service.duration_minutes} min)</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Date/Time</td><td style="padding:8px 0;font-weight:bold">${timeStr}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Verification Code</td><td style="padding:8px 0;font-weight:bold;font-size:20px;color:#E8654A;letter-spacing:2px">${verificationCode}</td></tr>
                </table>
                <p style="color:#999;font-size:12px;margin-top:20px">— ReplyWise AI · Lush Nail Studio</p>
              </div>
            `,
          }),
        });
      }
    } catch (emailErr) {
      console.error('Notification email failed:', emailErr);
      // Don't fail the booking if email fails
    }

    return NextResponse.json({
      booking,
      service_name: service.name,
    });
  } catch (err: unknown) {
    console.error('Booking error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
