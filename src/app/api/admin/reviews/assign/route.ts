import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/reviews/assign
 * Assign a review to a team member.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || !ctx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners and managers can assign
    if (ctx.role === 'staff') {
      return NextResponse.json({ error: 'Staff cannot assign reviews.' }, { status: 403 });
    }

    const body = await request.json();
    const { reviewId, assignTo } = body;

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Verify the review belongs to a store in this tenant
    const { data: review } = await supabase
      .from('reviews_raw')
      .select('id, store_id, stores!inner(tenant_id)')
      .eq('id', reviewId)
      .single();

    if (!review || (review.stores as any)?.tenant_id !== ctx.tenant.id) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    // If assignTo is null, unassign
    const updatePayload: Record<string, any> = {
      assigned_to: assignTo || null,
      assigned_at: assignTo ? new Date().toISOString() : null,
      assigned_by: assignTo ? ctx.user.id : null,
    };

    const { error } = await supabase
      .from('reviews_raw')
      .update(updatePayload)
      .eq('id', reviewId);

    if (error) throw error;

    return NextResponse.json({ success: true, reviewId, assignedTo: assignTo || null });
  } catch (err: any) {
    console.error('Review assign error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/reviews/assign?view=inbox|mine|unassigned
 * Get team inbox view of reviews.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || !ctx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'inbox';
    const storeId = searchParams.get('store_id');

    const supabase = await createSupabaseServerClient();

    // Get tenant store IDs
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('tenant_id', ctx.tenant.id);

    const storeIds = stores?.map(s => s.id) || [];
    if (storeIds.length === 0) {
      return NextResponse.json({ reviews: [], members: [] });
    }

    // Build query
    let query = supabase
      .from('reviews_raw')
      .select('id, store_id, author_name, rating, content, reply_draft, reply_status, assigned_to, assigned_at, created_at, platform')
      .in('store_id', storeId ? [Number(storeId)] : storeIds)
      .order('created_at', { ascending: false })
      .limit(50);

    switch (view) {
      case 'mine':
        query = query.eq('assigned_to', ctx.user.id);
        break;
      case 'unassigned':
        query = query.is('assigned_to', null).in('reply_status', ['pending', 'drafted']);
        break;
      case 'inbox':
      default:
        // Show all pending/drafted (team inbox view)
        query = query.in('reply_status', ['pending', 'drafted', 'approved']);
        break;
    }

    const { data: reviews, error } = await query;
    if (error) throw error;

    // Get team members for assignment dropdown
    const { data: members } = await supabase
      .from('tenant_members')
      .select('user_id, role, profiles!inner(id, email, display_name)')
      .eq('tenant_id', ctx.tenant.id)
      .in('role', ['owner', 'manager']);

    const teamMembers = (members || []).map((m: any) => ({
      id: m.user_id,
      email: m.profiles?.email || '',
      name: m.profiles?.display_name || m.profiles?.email || 'Unknown',
      role: m.role,
    }));

    // Map store names
    const storeMap = new Map(stores?.map(s => [s.id, s.name]) || []);

    const enrichedReviews = (reviews || []).map(r => ({
      ...r,
      store_name: storeMap.get(r.store_id) || 'Unknown',
    }));

    return NextResponse.json({
      reviews: enrichedReviews,
      members: teamMembers,
      stores: stores || [],
      currentUserId: ctx.user.id,
    });
  } catch (err: any) {
    console.error('Team inbox error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
