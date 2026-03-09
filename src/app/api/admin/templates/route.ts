import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { getPlanLimits, hasFeature } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/templates
 * List all reply templates for the current tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = ctx.tenant.plan || 'free';
    if (!hasFeature(plan, 'replyTemplates')) {
      return NextResponse.json(
        { error: 'Reply templates require Pro plan or higher.' },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const language = searchParams.get('language');
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabase
      .from('reply_templates')
      .select('*')
      .eq('tenant_id', ctx.tenant.id)
      .order('use_count', { ascending: false });

    if (activeOnly) query = query.eq('is_active', true);
    if (category) query = query.eq('category', category);
    if (language) query = query.eq('language', language);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ templates: data || [] });
  } catch (err: any) {
    console.error('Templates GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/templates
 * Create a new reply template.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = ctx.tenant.plan || 'free';
    if (!hasFeature(plan, 'replyTemplates')) {
      return NextResponse.json(
        { error: 'Reply templates require Pro plan or higher.' },
        { status: 403 }
      );
    }

    // Check template count limit
    const limits = getPlanLimits(plan);
    const supabase = await createSupabaseServerClient();

    const { count } = await supabase
      .from('reply_templates')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenant.id);

    const maxTemplates = (limits as any).maxTemplates || 50;
    if ((count || 0) >= maxTemplates) {
      return NextResponse.json(
        { error: `Template limit reached (${maxTemplates}). Upgrade your plan for more.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, category, min_rating, max_rating, vertical, language, body: templateBody, variables } = body;

    if (!name?.trim() || !templateBody?.trim()) {
      return NextResponse.json({ error: 'Name and body are required.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reply_templates')
      .insert({
        tenant_id: ctx.tenant.id,
        name: name.trim(),
        category: category || 'general',
        min_rating: Math.max(1, Math.min(5, min_rating || 1)),
        max_rating: Math.max(1, Math.min(5, max_rating || 5)),
        vertical: vertical || null,
        language: language || 'en',
        body: templateBody.trim(),
        variables: variables || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data }, { status: 201 });
  } catch (err: any) {
    console.error('Templates POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
