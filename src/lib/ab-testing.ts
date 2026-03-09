/**
 * A/B Testing Engine for Reply Styles
 *
 * Supports weighted random variant selection, tone override injection,
 * and result tracking for data-driven tone optimization.
 */

export interface ABVariant {
  id: string;           // e.g. "formal", "casual", "empathetic"
  label: string;        // Display name
  toneOverride: string; // Tone setting override for the AI prompt
  weight: number;       // Selection weight (relative, e.g. 50/50 = equal)
}

export interface ABExperiment {
  id: string;
  tenant_id: string;
  store_id: number | null;
  name: string;
  status: 'active' | 'paused' | 'completed';
  variants: ABVariant[];
  created_at: string;
}

/**
 * Select a variant using weighted random selection.
 * Returns the chosen variant or null if no experiment is active.
 */
export function selectVariant(experiment: ABExperiment): ABVariant | null {
  if (experiment.status !== 'active') return null;
  if (!experiment.variants || experiment.variants.length === 0) return null;

  const totalWeight = experiment.variants.reduce((sum, v) => sum + (v.weight || 1), 0);
  if (totalWeight <= 0) return experiment.variants[0];

  let random = Math.random() * totalWeight;

  for (const variant of experiment.variants) {
    random -= (variant.weight || 1);
    if (random <= 0) return variant;
  }

  // Fallback (shouldn't reach here)
  return experiment.variants[experiment.variants.length - 1];
}

/**
 * Find the active experiment for a given store.
 * Store-specific experiments take priority over tenant-wide ones.
 */
export function findActiveExperiment(
  experiments: ABExperiment[],
  storeId: number
): ABExperiment | null {
  // Prefer store-specific experiment
  const storeExperiment = experiments.find(
    e => e.status === 'active' && e.store_id === storeId
  );
  if (storeExperiment) return storeExperiment;

  // Fall back to tenant-wide experiment (store_id = null)
  const tenantExperiment = experiments.find(
    e => e.status === 'active' && e.store_id === null
  );
  return tenantExperiment || null;
}

/**
 * Built-in preset experiments for quick setup.
 */
export const PRESET_EXPERIMENTS: Array<{ name: string; variants: ABVariant[] }> = [
  {
    name: 'Formal vs Casual',
    variants: [
      { id: 'formal', label: 'Formal', toneOverride: 'Professional and Formal — use complete sentences, proper grammar, no contractions', weight: 50 },
      { id: 'casual', label: 'Casual', toneOverride: 'Friendly and Casual — use contractions, conversational tone, emoji allowed', weight: 50 },
    ],
  },
  {
    name: 'Short vs Detailed',
    variants: [
      { id: 'short', label: 'Short (2-3 sentences)', toneOverride: 'Concise — reply in 2-3 sentences maximum. Be brief and warm.', weight: 50 },
      { id: 'detailed', label: 'Detailed (4-6 sentences)', toneOverride: 'Detailed — reply in 4-6 sentences. Address specific points from the review and add a personal touch.', weight: 50 },
    ],
  },
  {
    name: 'Empathetic vs Action-Oriented',
    variants: [
      { id: 'empathetic', label: 'Empathetic', toneOverride: 'Empathetic and Understanding — focus on acknowledging the customer\'s feelings and experience', weight: 50 },
      { id: 'action', label: 'Action-Oriented', toneOverride: 'Action-Oriented — focus on concrete steps being taken to improve, invite the customer back with a specific offer', weight: 50 },
    ],
  },
];

/**
 * Compute A/B test results from review data.
 */
export interface ABResult {
  variantId: string;
  label: string;
  totalReplies: number;
  avgRating: number;
  approvedCount: number;
  publishedCount: number;
  approvalRate: number;   // % of auto-approved that stayed approved (not manually overridden)
}

export function computeABResults(
  variants: ABVariant[],
  reviews: Array<{
    ab_variant_id: string | null;
    rating: number;
    reply_status: string;
  }>
): ABResult[] {
  return variants.map(v => {
    const variantReviews = reviews.filter(r => r.ab_variant_id === v.id);
    const totalReplies = variantReviews.length;
    const avgRating = totalReplies > 0
      ? variantReviews.reduce((s, r) => s + r.rating, 0) / totalReplies
      : 0;
    const approvedCount = variantReviews.filter(r => r.reply_status === 'approved' || r.reply_status === 'published').length;
    const publishedCount = variantReviews.filter(r => r.reply_status === 'published').length;

    return {
      variantId: v.id,
      label: v.label,
      totalReplies,
      avgRating: Math.round(avgRating * 100) / 100,
      approvedCount,
      publishedCount,
      approvalRate: totalReplies > 0 ? Math.round((approvedCount / totalReplies) * 100) : 0,
    };
  });
}
