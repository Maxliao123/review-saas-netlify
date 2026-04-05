import { NextRequest, NextResponse } from 'next/server';
import { validateMemberToken } from '@/lib/member-token';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; bookingId: string }> }
) {
  const { token, bookingId } = await params;
  const { valid, member, error } = await validateMemberToken(token);

  if (!valid || !member) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, start_time, end_time, status,
      services:service_id (id, name),
      staff:staff_id (id, name)
    `)
    .eq('id', bookingId)
    .eq('member_id', member.id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Check if feedback already submitted
  const { data: existing } = await supabase
    .from('customer_feedback')
    .select('id')
    .eq('booking_id', bookingId)
    .single();

  return NextResponse.json({
    booking,
    already_submitted: !!existing,
    store: {
      name: member.stores?.name,
      place_id: member.stores?.place_id,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; bookingId: string }> }
) {
  const { token, bookingId } = await params;
  const { valid, member, error } = await validateMemberToken(token);

  if (!valid || !member) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  try {
    const body = await request.json();
    const { overall_rating, positive_tags, negative_tags, custom_feedback } = body;

    if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Verify booking belongs to member
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, store_id, service_id, staff_id')
      .eq('id', bookingId)
      .eq('member_id', member.id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if already submitted
    const { data: existing } = await supabase
      .from('customer_feedback')
      .select('id')
      .eq('booking_id', bookingId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 });
    }

    // Calculate sentiment
    const sentiment = overall_rating >= 4 ? 'positive' : overall_rating === 3 ? 'neutral' : 'negative';
    const redirectedTo = overall_rating >= 4 ? 'google_review' : 'internal_report';

    // Store feedback
    await supabase
      .from('customer_feedback')
      .insert({
        store_id: member.store_id,
        booking_id: bookingId,
        member_id: member.id,
        rating: overall_rating,
        sentiment,
        positive_tags: positive_tags || [],
        negative_tags: negative_tags || [],
        feedback_text: custom_feedback || null,
        redirected_to: redirectedTo,
        status: 'new',
      });

    // Award points for feedback
    const feedbackPoints = 50;
    await supabase
      .from('members')
      .update({
        points_balance: (member.points_balance || 0) + feedbackPoints,
      })
      .eq('id', member.id);

    // Build response
    const result: Record<string, unknown> = {
      success: true,
      sentiment,
      points_earned: feedbackPoints,
    };

    if (redirectedTo === 'google_review' && member.stores?.place_id) {
      result.google_review_url = `https://search.google.com/local/writereview?placeid=${member.stores.place_id}`;
      result.message = 'Thank you! Share your experience on Google to earn bonus points!';
    } else {
      result.message = 'Thank you for your feedback. We will use it to improve our service!';
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Feedback error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
