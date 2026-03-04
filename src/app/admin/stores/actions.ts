'use server';

import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

// ── Tag Management ──────────────────────────────────────────────────

export interface TagRow {
  id?: number;
  store_id: number;
  question_key: string;
  label: string;
  locale: string;
  is_active: boolean;
  order_index: number;
}

export const TAG_CATEGORIES = [
  {
    key: 'main_impression',
    label: '產品 Product',
    question: {
      zh: '你今天吃了什麼？（主力商品、新品）',
      en: 'What did you enjoy most about the food?',
    },
    defaults_zh: ['招牌牛肉麵', '滷味拼盤', '手工水餃', '酸辣湯', '新品嘗鮮'],
    defaults_en: ['Signature Dish', 'Chef Special', 'New Menu Item', 'Daily Fresh', 'Best Seller'],
  },
  {
    key: 'features',
    label: '服務 Service',
    question: {
      zh: '你覺得體驗上有哪些環節很棒？',
      en: 'What features stood out to you?',
    },
    defaults_zh: ['服務親切', '上菜快速', '環境舒適', '乾淨衛生', 'CP值高'],
    defaults_en: ['Friendly Staff', 'Fast Service', 'Cozy Ambiance', 'Very Clean', 'Great Value'],
  },
  {
    key: 'occasion',
    label: '場合 Occasion',
    question: {
      zh: '這次的用餐場合是？',
      en: 'What was the occasion for this visit?',
    },
    defaults_zh: ['家庭聚餐', '朋友聚會', '約會', '商務午餐', '一個人吃'],
    defaults_en: ['Family Dinner', 'Friends Gathering', 'Date Night', 'Business Lunch', 'Solo Dining'],
  },
  {
    key: 'cons',
    label: '建議 Suggestions',
    question: {
      zh: '你覺得有哪些建議？（選填）',
      en: 'Anything we can do better? (Optional)',
    },
    defaults_zh: ['等候時間長', '餐點偏鹹', '位置難找', '冷氣太冷', '份量可以再多'],
    defaults_en: ['Long Wait', 'Too Salty', 'Hard to Find', 'Too Cold Inside', 'Larger Portions'],
  },
];

export async function getStoreTags(storeId: number): Promise<TagRow[]> {
  const ctx = await getUserTenantContext();
  if (!ctx?.tenant) return [];

  // Verify store belongs to tenant
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from('stores')
    .select('id, tenant_id')
    .eq('id', storeId)
    .eq('tenant_id', ctx.tenant.id)
    .single();

  if (!store) return [];

  const { data, error } = await supabaseAdmin
    .from('generator_tags')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
  return data || [];
}

export async function saveStoreTags(
  storeId: number,
  tags: { question_key: string; label: string; locale: string; order_index: number }[]
) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) throw new Error('Not authenticated');

    // Verify store belongs to tenant
    const supabase = await createSupabaseServerClient();
    const { data: store } = await supabase
      .from('stores')
      .select('id, tenant_id')
      .eq('id', storeId)
      .eq('tenant_id', ctx.tenant.id)
      .single();

    if (!store) throw new Error('Store not found');

    // Soft-delete all existing tags for this store, then insert new ones
    await supabaseAdmin
      .from('generator_tags')
      .update({ is_active: false })
      .eq('store_id', storeId);

    if (tags.length > 0) {
      const rows = tags.map(t => ({
        store_id: storeId,
        question_key: t.question_key,
        label: t.label,
        locale: t.locale,
        is_active: true,
        order_index: t.order_index,
      }));

      const { error } = await supabaseAdmin
        .from('generator_tags')
        .insert(rows);

      if (error) throw error;
    }

    revalidatePath('/admin/stores/setup');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving tags:', error);
    return { success: false, error: error.message };
  }
}

// ── Store Settings ──────────────────────────────────────────────────

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
