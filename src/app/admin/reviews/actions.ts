'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateReviewStatus(id: number, status: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // RLS ensures the user can only update reviews they have access to
    const { error } = await supabase
      .from('reviews_raw')
      .update({ reply_status: status })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating status:', error);
    return { success: false, error: error.message };
  }
}

export async function updateReviewDraft(id: number, draft: string) {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('reviews_raw')
      .update({ reply_draft: draft })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating draft:', error);
    return { success: false, error: error.message };
  }
}

export async function approveReviews(ids: number[]) {
  try {
    if (!ids || ids.length === 0) return { success: true, count: 0 };

    const supabase = await createSupabaseServerClient();

    const { error, count } = await supabase
      .from('reviews_raw')
      .update({ reply_status: 'approved' })
      .in('id', ids);

    if (error) throw error;

    revalidatePath('/admin/reviews');
    return { success: true, count };
  } catch (error: any) {
    console.error('Error batch approving reviews:', error);
    return { success: false, error: error.message };
  }
}
