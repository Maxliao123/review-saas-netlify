import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { computeVerticalMetrics, assessFineTuningReadiness, computeTrainingSummary, type TrainingExample } from '@/lib/training-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ai-training — Training data metrics per vertical
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    const { data: examples } = await supabase
      .from('ai_training_data')
      .select('review_rating, review_text, reply_text, outcome, edited_text, vertical, confidence_score')
      .eq('tenant_id', ctx.tenant.id);

    const trainingExamples: TrainingExample[] = (examples || []).map(e => ({
      reviewRating: e.review_rating,
      reviewText: e.review_text || '',
      replyText: e.reply_text,
      outcome: e.outcome as 'approved' | 'rejected' | 'edited',
      editedText: e.edited_text || undefined,
      vertical: e.vertical || 'restaurant',
      confidenceScore: e.confidence_score || undefined,
    }));

    const metrics = computeVerticalMetrics(trainingExamples);
    const readiness = assessFineTuningReadiness(metrics);
    const summary = computeTrainingSummary(trainingExamples);

    return NextResponse.json({ metrics, readiness, summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
