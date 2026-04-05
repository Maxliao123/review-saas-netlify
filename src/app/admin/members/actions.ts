'use server';

import { getUserTenantContext } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

function generateMemberToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function createMember(formData: FormData) {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) return { error: 'Unauthorized' };

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const email = (formData.get('email') as string) || null;
  const storeId = Number(formData.get('store_id'));

  if (!name || !phone || !storeId) {
    return { error: 'Name, phone, and store are required.' };
  }

  // Verify store belongs to tenant
  const storeIds = (ctx.stores || []).map((s) => s.id);
  if (!storeIds.includes(storeId)) {
    return { error: 'Invalid store.' };
  }

  const supabase = createSupabaseAdmin();
  const memberToken = generateMemberToken();

  const { data, error } = await supabase
    .from('members')
    .insert({
      store_id: storeId,
      tenant_id: ctx.tenant.id,
      name,
      phone,
      email,
      member_token: memberToken,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'A member with this phone number already exists at this store.' };
    }
    return { error: error.message };
  }

  revalidatePath('/admin/members');
  return { success: true, memberId: data.id };
}

export async function sendMemberLink(memberId: string) {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) return { error: 'Unauthorized' };

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/members/send-link`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, tenantId: ctx.tenant.id }),
      }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || 'Failed to send link.' };
    }

    return { success: true };
  } catch {
    return { error: 'Network error sending link.' };
  }
}

export async function updateMember(
  id: string,
  data: { name?: string; phone?: string; email?: string; status?: string; notes?: string }
) {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) return { error: 'Unauthorized' };

  const supabase = createSupabaseAdmin();

  // Verify member belongs to tenant's stores
  const storeIds = (ctx.stores || []).map((s) => s.id);
  const { data: member } = await supabase
    .from('members')
    .select('id, store_id')
    .eq('id', id)
    .single();

  if (!member || !storeIds.includes(member.store_id)) {
    return { error: 'Member not found.' };
  }

  const { error } = await supabase
    .from('members')
    .update(data)
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/admin/members');
  return { success: true };
}
