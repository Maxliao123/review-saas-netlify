/**
 * AI Training Data Collection
 *
 * Collects approved/rejected/edited reply pairs for future
 * AI model fine-tuning per vertical. Tracks quality metrics
 * to measure AI improvement over time.
 */

export interface TrainingExample {
  reviewRating: number;
  reviewText: string;
  replyText: string;
  outcome: 'approved' | 'rejected' | 'edited';
  editedText?: string;
  vertical: string;
  confidenceScore?: number;
}

export interface VerticalQualityMetrics {
  vertical: string;
  totalExamples: number;
  approvedCount: number;
  rejectedCount: number;
  editedCount: number;
  approvalRate: number;      // 0-100
  editRate: number;          // 0-100 (of approved, how many were edited first)
  avgConfidence: number;     // Average confidence score at time of draft
}

export interface FineTuningReadiness {
  vertical: string;
  totalExamples: number;
  isReady: boolean;          // Minimum 100 examples
  quality: 'high' | 'medium' | 'low';
  recommendation: string;
}

/**
 * Compute quality metrics per vertical from training examples.
 */
export function computeVerticalMetrics(
  examples: TrainingExample[]
): VerticalQualityMetrics[] {
  const byVertical = new Map<string, TrainingExample[]>();

  for (const ex of examples) {
    const group = byVertical.get(ex.vertical) || [];
    group.push(ex);
    byVertical.set(ex.vertical, group);
  }

  return Array.from(byVertical.entries()).map(([vertical, exs]) => {
    const total = exs.length;
    const approved = exs.filter(e => e.outcome === 'approved').length;
    const rejected = exs.filter(e => e.outcome === 'rejected').length;
    const edited = exs.filter(e => e.outcome === 'edited').length;

    const acceptedTotal = approved + edited; // Both approved and edited count as "used"
    const confidenceScores = exs
      .filter(e => e.confidenceScore !== undefined)
      .map(e => e.confidenceScore!);

    return {
      vertical,
      totalExamples: total,
      approvedCount: approved,
      rejectedCount: rejected,
      editedCount: edited,
      approvalRate: total > 0 ? Math.round((acceptedTotal / total) * 100) : 0,
      editRate: acceptedTotal > 0 ? Math.round((edited / acceptedTotal) * 100) : 0,
      avgConfidence: confidenceScores.length > 0
        ? Math.round(confidenceScores.reduce((s, v) => s + v, 0) / confidenceScores.length)
        : 0,
    };
  }).sort((a, b) => b.totalExamples - a.totalExamples);
}

/**
 * Assess fine-tuning readiness for each vertical.
 */
export function assessFineTuningReadiness(
  metrics: VerticalQualityMetrics[]
): FineTuningReadiness[] {
  return metrics.map(m => {
    const isReady = m.totalExamples >= 100;
    let quality: FineTuningReadiness['quality'];
    let recommendation: string;

    if (m.approvalRate >= 85 && m.editRate <= 15) {
      quality = 'high';
      recommendation = isReady
        ? 'Ready for fine-tuning. High approval rate with minimal edits.'
        : `Need ${100 - m.totalExamples} more examples to begin fine-tuning.`;
    } else if (m.approvalRate >= 60) {
      quality = 'medium';
      recommendation = isReady
        ? 'Can fine-tune, but review rejected examples for patterns to avoid.'
        : `Need ${100 - m.totalExamples} more examples. Focus on improving approval rate.`;
    } else {
      quality = 'low';
      recommendation = 'Too many rejections. Review AI prompt templates and adjust tone before fine-tuning.';
    }

    return {
      vertical: m.vertical,
      totalExamples: m.totalExamples,
      isReady,
      quality,
      recommendation,
    };
  });
}

/**
 * Convert training examples to JSONL format for fine-tuning.
 * Uses the OpenAI chat format.
 */
export function toFineTuningJSONL(
  examples: TrainingExample[],
  vertical?: string
): string {
  const filtered = vertical
    ? examples.filter(e => e.vertical === vertical)
    : examples;

  // Only use approved or edited examples (not rejected)
  const usable = filtered.filter(e => e.outcome !== 'rejected');

  return usable.map(ex => {
    const finalReply = ex.outcome === 'edited' && ex.editedText
      ? ex.editedText
      : ex.replyText;

    const entry = {
      messages: [
        {
          role: 'system',
          content: `You are a professional review response assistant for ${ex.vertical} businesses. Write a warm, professional reply to the customer review.`,
        },
        {
          role: 'user',
          content: `Rating: ${ex.reviewRating}/5\nReview: ${ex.reviewText || '(no text)'}`,
        },
        {
          role: 'assistant',
          content: finalReply,
        },
      ],
    };

    return JSON.stringify(entry);
  }).join('\n');
}

/**
 * Compute training data summary stats.
 */
export function computeTrainingSummary(examples: TrainingExample[]): {
  total: number;
  verticals: number;
  readyForFineTuning: number;
  topVertical: string | null;
} {
  const metrics = computeVerticalMetrics(examples);
  const readiness = assessFineTuningReadiness(metrics);

  return {
    total: examples.length,
    verticals: metrics.length,
    readyForFineTuning: readiness.filter(r => r.isReady).length,
    topVertical: metrics.length > 0 ? metrics[0].vertical : null,
  };
}
