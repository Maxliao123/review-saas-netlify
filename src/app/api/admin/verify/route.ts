import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { validateVerificationCode } from '@/lib/member-token';
import { verifyBooking } from '@/lib/verification';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/verify
 * Verify a booking by its verification code.
 * Body: { code, staffId }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, staffId } = body;

    if (!code?.trim()) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }

    // Try validation against each tenant store until we find a match
    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (tenantStoreIds.length === 0) {
      return NextResponse.json({ error: 'No stores found' }, { status: 404 });
    }

    let validationResult: { valid: boolean; booking: any; error: string | null } = {
      valid: false,
      booking: null,
      error: 'Invalid code or no booking found for today',
    };

    for (const storeId of tenantStoreIds) {
      const result = await validateVerificationCode(code.trim(), storeId);
      if (result.valid) {
        validationResult = result;
        break;
      }
      // Keep the most specific error
      if (result.error === 'Already verified') {
        validationResult = result;
        break;
      }
    }

    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const booking = validationResult.booking;

    // Perform the actual verification (deduct credits, update status, audit)
    const verifyResult = await verifyBooking({
      bookingId: booking.id,
      storeId: booking.store_id,
      staffId,
    });

    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: verifyResult.data,
    });
  } catch (err: any) {
    console.error('Verify POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
