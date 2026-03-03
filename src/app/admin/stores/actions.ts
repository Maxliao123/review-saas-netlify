'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getStores() {
  const supabase = await createSupabaseServerClient();

  // RLS filters stores to the user's tenant automatically
  const { data, error } = await supabase
    .from('stores')
    .select('*')
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
