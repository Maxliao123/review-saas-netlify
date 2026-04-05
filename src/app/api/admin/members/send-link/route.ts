import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendMemberLink } from '@/lib/sms';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/members/send-link
 * Send SMS with member portal link.
 * Body: { memberId }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    // Fetch member scoped to tenant stores
    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (tenantStoreIds.length === 0) {
      return NextResponse.json({ error: 'No stores found' }, { status: 404 });
    }

    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('id, name, phone, member_token, store_id, stores:store_id (id, name)')
      .eq('id', memberId)
      .in('store_id', tenantStoreIds)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!member.phone) {
      return NextResponse.json({ error: 'Member has no phone number' }, { status: 400 });
    }

    if (!member.member_token) {
      return NextResponse.json({ error: 'Member has no portal token' }, { status: 400 });
    }

    const storeName = (member.stores as any)?.name || ctx.tenant.name;

    // Send SMS
    const result = await sendMemberLink(member.phone, storeName, member.member_token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 502 }
      );
    }

    // Log to notification_log
    await supabaseAdmin.from('notification_log').insert({
      tenant_id: ctx.tenant.id,
      store_id: member.store_id,
      member_id: member.id,
      channel: 'sms',
      type: 'member_link',
      recipient: member.phone,
      status: 'sent',
      external_id: result.sid || null,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (err: any) {
    console.error('Send member link error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
