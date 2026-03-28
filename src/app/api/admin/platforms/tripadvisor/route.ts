import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { searchTripAdvisorLocation, syncTripAdvisorSummary } from '@/lib/tripadvisor';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/platforms/tripadvisor — Search & connect a TripAdvisor location
 * Body: { name, location } to search, or { locationId } to connect directly
 */
export async function POST(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const storeId = ctx.stores?.[0]?.id;
    if (!storeId) {
      return NextResponse.json({ error: 'No store found' }, { status: 400 });
    }

    // If locationId provided, connect directly
    if (body.locationId) {
      const summary = await syncTripAdvisorSummary(storeId, body.locationId);
      if (!summary) {
        return NextResponse.json({ error: 'Could not fetch TripAdvisor details' }, { status: 400 });
      }
      return NextResponse.json({ success: true, summary });
    }

    // Otherwise search by name + location
    const { name, location } = body;
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await searchTripAdvisorLocation(name, location || '');
    if (!result) {
      return NextResponse.json({ error: 'No TripAdvisor location found' }, { status: 404 });
    }

    // Auto-sync summary after finding the location
    const summary = await syncTripAdvisorSummary(storeId, result.location_id);

    return NextResponse.json({
      success: true,
      location: result,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/platforms/tripadvisor — Disconnect TripAdvisor
 * Body: { storeId? } (optional, defaults to first store)
 */
export async function DELETE(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const storeId = body.storeId || ctx.stores?.[0]?.id;
    if (!storeId) {
      return NextResponse.json({ error: 'No store found' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('platform_summaries')
      .delete()
      .eq('store_id', storeId)
      .eq('platform', 'tripadvisor');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
