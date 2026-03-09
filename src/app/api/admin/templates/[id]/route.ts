import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/templates/:id
 * Update an existing reply template.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = ctx.tenant.plan || 'free';
    if (!hasFeature(plan, 'replyTemplates')) {
      return NextResponse.json({ error: 'Reply templates require Pro plan or higher.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = await createSupabaseServerClient();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.min_rating !== undefined) updates.min_rating = Math.max(1, Math.min(5, body.min_rating));
    if (body.max_rating !== undefined) updates.max_rating = Math.max(1, Math.min(5, body.max_rating));
    if (body.vertical !== undefined) updates.vertical = body.vertical || null;
    if (body.language !== undefined) updates.language = body.language;
    if (body.body !== undefined) updates.body = body.body.trim();
    if (body.variables !== undefined) updates.variables = body.variables;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error } = await supabase
      .from('reply_templates')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', ctx.tenant.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template: data });
  } catch (err: any) {
    console.error('Templates PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/templates/:id
 * Delete a reply template.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = ctx.tenant.plan || 'free';
    if (!hasFeature(plan, 'replyTemplates')) {
      return NextResponse.json({ error: 'Reply templates require Pro plan or higher.' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('reply_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', ctx.tenant.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Templates DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
