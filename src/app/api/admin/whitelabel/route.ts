import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { isValidHexColor, isValidDomain, generateDnsVerification } from '@/lib/whitelabel';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/whitelabel — Get white-label config
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('whitelabel_config')
      .select('*')
      .eq('tenant_id', ctx.tenant.id)
      .single();

    return NextResponse.json({ config: data || null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/whitelabel — Create or update white-label config
 */
export async function POST(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }

    const body = await request.json();

    // Validate colors
    for (const colorField of ['primaryColor', 'secondaryColor', 'accentColor']) {
      if (body[colorField] && !isValidHexColor(body[colorField])) {
        return NextResponse.json({ error: `Invalid color: ${colorField}` }, { status: 400 });
      }
    }

    // Validate domain
    if (body.customDomain && !isValidDomain(body.customDomain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Upsert
    const { data: existing } = await supabase
      .from('whitelabel_config')
      .select('id')
      .eq('tenant_id', ctx.tenant.id)
      .single();

    const payload = {
      tenant_id: ctx.tenant.id,
      brand_name: body.brandName,
      logo_url: body.logoUrl,
      favicon_url: body.faviconUrl,
      primary_color: body.primaryColor,
      secondary_color: body.secondaryColor,
      accent_color: body.accentColor,
      custom_domain: body.customDomain,
      hide_powered_by: body.hidePoweredBy,
      custom_email_from: body.customEmailFrom,
      custom_email_name: body.customEmailName,
      css_overrides: body.cssOverrides,
      is_active: body.isActive ?? false,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      result = await supabase
        .from('whitelabel_config')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('whitelabel_config')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });

    // Include DNS verification if custom domain set
    const dns = body.customDomain
      ? generateDnsVerification(ctx.tenant.id, body.customDomain)
      : null;

    return NextResponse.json({ config: result.data, dnsVerification: dns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
