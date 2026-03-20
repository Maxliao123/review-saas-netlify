import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/line-bind
 * Generate a 6-digit verification code for LINE binding.
 * User sends this code to the LINE bot to complete binding.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storeId } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    // Verify store belongs to tenant
    const validStore = ctx.stores.find(s => s.id === storeId);
    if (!validStore) {
      return NextResponse.json({ error: 'Store not found' }, { status: 403 });
    }

    // Expire any old pending codes for this store
    await supabaseAdmin
      .from('line_verifications')
      .update({ status: 'expired' })
      .eq('store_id', storeId)
      .eq('status', 'pending');

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const { error: insertErr } = await supabaseAdmin.from('line_verifications').insert({
      store_id: storeId,
      tenant_id: ctx.tenant.id,
      code,
      expires_at: expiresAt,
    });
    console.log('[LineBind] Insert code:', code, 'storeId:', storeId, 'tenantId:', ctx.tenant.id, 'error:', insertErr);
    if (insertErr) {
      return NextResponse.json({ error: `Failed to create code: ${insertErr.message}` }, { status: 500 });
    }

    // LINE Bot ID for the QR code / friend add URL
    const botId = process.env.LINE_CHANNEL_ID || '';
    const friendUrl = `https://line.me/R/ti/p/@${process.env.LINE_BOT_BASIC_ID || '804fofnx'}`;

    return NextResponse.json({
      code,
      expiresAt,
      friendUrl,
      botId,
      instructions: [
        '1. 用 LINE 掃描 QR Code 或點連結加好友',
        `2. 在 LINE 聊天中輸入驗證碼：${code}`,
        '3. 收到「綁定成功」訊息即完成',
      ],
    });
  } catch (error: any) {
    console.error('[LineBind]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/line-bind?storeId=xxx
 * Check current LINE binding status for a store.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storeId = request.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    // Check if LINE channel exists and is active
    const { data: channel } = await supabaseAdmin
      .from('notification_channels')
      .select('id, is_active, config')
      .eq('store_id', Number(storeId))
      .eq('channel_type', 'line')
      .maybeSingle();

    // Check for pending verification
    const { data: pending } = await supabaseAdmin
      .from('line_verifications')
      .select('code, expires_at, status')
      .eq('store_id', Number(storeId))
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    return NextResponse.json({
      bound: !!channel?.is_active,
      pendingCode: pending?.code || null,
      pendingExpires: pending?.expires_at || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
