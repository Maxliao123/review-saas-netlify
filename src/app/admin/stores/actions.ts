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
    .limit(1)
    .maybeSingle();

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
      .limit(1)
      .maybeSingle();

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

// ── Store Image Upload ──────────────────────────────────────────────

export async function uploadStoreImage(
  storeId: number,
  imageType: 'hero' | 'logo',
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
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
      .limit(1)
      .maybeSingle();

    if (!store) throw new Error('Store not found');

    const file = formData.get('file') as File;
    if (!file || file.size === 0) throw new Error('No file provided');

    // Validate file type and size (max 5MB)
    if (!file.type.startsWith('image/')) throw new Error('File must be an image');
    if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${storeId}/${imageType}.${ext}`;

    // Upload to Supabase Storage (upsert to overwrite existing)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('store-images')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('store-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update store record
    const column = imageType === 'hero' ? 'hero_url' : 'logo_url';
    const { error: updateError } = await supabaseAdmin
      .from('stores')
      .update({ [column]: publicUrl })
      .eq('id', storeId);

    if (updateError) throw updateError;

    revalidatePath('/admin/stores/setup');
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Error uploading store image:', error);
    return { success: false, error: error.message };
  }
}

export async function removeStoreImage(
  storeId: number,
  imageType: 'hero' | 'logo'
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) throw new Error('Not authenticated');

    const supabase = await createSupabaseServerClient();
    const { data: store } = await supabase
      .from('stores')
      .select('id, tenant_id')
      .eq('id', storeId)
      .eq('tenant_id', ctx.tenant.id)
      .limit(1)
      .maybeSingle();

    if (!store) throw new Error('Store not found');

    // Clear the URL in the store record
    const column = imageType === 'hero' ? 'hero_url' : 'logo_url';
    const { error: updateError } = await supabaseAdmin
      .from('stores')
      .update({ [column]: null })
      .eq('id', storeId);

    if (updateError) throw updateError;

    // Try to delete from storage (best effort — file may not exist)
    const { data: files } = await supabaseAdmin.storage
      .from('store-images')
      .list(`${storeId}`, { search: imageType });

    if (files && files.length > 0) {
      const toDelete = files
        .filter(f => f.name.startsWith(imageType))
        .map(f => `${storeId}/${f.name}`);
      if (toDelete.length > 0) {
        await supabaseAdmin.storage.from('store-images').remove(toDelete);
      }
    }

    revalidatePath('/admin/stores/setup');
    return { success: true };
  } catch (error: any) {
    console.error('Error removing store image:', error);
    return { success: false, error: error.message };
  }
}

// ── Tenant Plan ─────────────────────────────────────────────────────

export async function getTenantPlan(): Promise<string> {
  const ctx = await getUserTenantContext();
  if (!ctx?.tenant) return 'free';
  return ctx.tenant.plan || 'free';
}

// ── Onboarding Completion ────────────────────────────────────────────

export async function completeOnboarding() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) throw new Error('Not authenticated');

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', ctx.tenant.id);

    if (error) throw error;
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
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
