'use server';

import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getStores() {
  const ctx = await getUserTenantContext();
  if (!ctx?.tenant) return [];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('tenant_id', ctx.tenant.id)
    .order('name');

  if (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
  return data;
}

export async function updateStoreSettings(id: number, settings: any) {
  try {
    const supabase = await createSupabaseServerClient();

    // RLS ensures user can only update stores in their tenant
    const { error } = await supabase
      .from('stores')
      .update(settings)
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/stores/setup');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating store settings:', error);
    return { success: false, error: error.message };
  }
}
