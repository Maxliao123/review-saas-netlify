import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { computeABResults } from '@/lib/ab-testing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/experiments
 * List all A/B experiments with results.
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    const { data: experiments } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('tenant_id', ctx.tenant.id)
      .order('created_at', { ascending: false });

    // Get review data for active experiments
    const activeExps = (experiments || []).filter(e => e.status === 'active' || e.status === 'completed');
    const expIds = activeExps.map(e => e.id);

    let reviewsByExp: Record<string, any[]> = {};
    if (expIds.length > 0) {
      const { data: abReviews } = await supabase
        .from('reviews_raw')
        .select('ab_experiment_id, ab_variant_id, rating, reply_status')
        .in('ab_experiment_id', expIds);

      for (const r of (abReviews || [])) {
        if (!reviewsByExp[r.ab_experiment_id]) reviewsByExp[r.ab_experiment_id] = [];
        reviewsByExp[r.ab_experiment_id].push(r);
      }
    }

    // Compute results for each experiment
    const enriched = (experiments || []).map(exp => ({
      ...exp,
      results: computeABResults(exp.variants || [], reviewsByExp[exp.id] || []),
    }));

    return NextResponse.json({ experiments: enriched });
  } catch (err: any) {
    console.error('Experiments GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/experiments
 * Create a new A/B experiment.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.role === 'staff') {
      return NextResponse.json({ error: 'Only owners/managers can create experiments.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, storeId, variants } = body;

    if (!name?.trim() || !variants?.length || variants.length < 2) {
      return NextResponse.json({ error: 'Name and at least 2 variants are required.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('ab_experiments')
      .insert({
        tenant_id: ctx.tenant.id,
        store_id: storeId || null,
        name: name.trim(),
        variants,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ experiment: data }, { status: 201 });
  } catch (err: any) {
    console.error('Experiments POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/experiments
 * Update experiment status (pause/complete).
 */
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !['active', 'paused', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Valid id and status required.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const updates: Record<string, any> = { status };
    if (status === 'completed') updates.ended_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('ab_experiments')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', ctx.tenant.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ experiment: data });
  } catch (err: any) {
    console.error('Experiments PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
