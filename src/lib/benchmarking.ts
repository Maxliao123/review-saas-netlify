/**
 * Industry Benchmarking Engine
 *
 * Computes percentile rankings for stores against
 * anonymized aggregate data from the same vertical.
 */

export interface BenchmarkMetrics {
  avgRating: number;
  totalReviews: number;
  responseRate: number;       // 0-100
  avgResponseTime: number;    // hours
  positiveRatio: number;      // 0-100 (% of 4-5 star reviews)
}

export interface BenchmarkResult {
  metrics: BenchmarkMetrics;
  percentiles: {
    avgRating: number;        // 0-100 percentile
    totalReviews: number;
    responseRate: number;
    positiveRatio: number;
  };
  tier: 'top10' | 'top25' | 'top50' | 'bottom50';
  summary: string;
}

/**
 * Compute percentile ranking.
 * Returns 0-100 where 100 = best in the dataset.
 */
export function computePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

/**
 * Compute benchmark result for a store against its vertical peers.
 */
export function computeBenchmark(
  storeMetrics: BenchmarkMetrics,
  peerMetrics: BenchmarkMetrics[]
): BenchmarkResult {
  const percentiles = {
    avgRating: computePercentile(storeMetrics.avgRating, peerMetrics.map(p => p.avgRating)),
    totalReviews: computePercentile(storeMetrics.totalReviews, peerMetrics.map(p => p.totalReviews)),
    responseRate: computePercentile(storeMetrics.responseRate, peerMetrics.map(p => p.responseRate)),
    positiveRatio: computePercentile(storeMetrics.positiveRatio, peerMetrics.map(p => p.positiveRatio)),
  };

  // Overall tier based on average of key percentiles
  const avgPercentile = (percentiles.avgRating + percentiles.responseRate + percentiles.positiveRatio) / 3;

  let tier: BenchmarkResult['tier'];
  if (avgPercentile >= 90) tier = 'top10';
  else if (avgPercentile >= 75) tier = 'top25';
  else if (avgPercentile >= 50) tier = 'top50';
  else tier = 'bottom50';

  // Generate summary
  const tierLabels = {
    top10: 'Top 10%',
    top25: 'Top 25%',
    top50: 'Top 50%',
    bottom50: 'Below Average',
  };

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (percentiles.avgRating >= 75) strengths.push('strong rating');
  else if (percentiles.avgRating < 50) improvements.push('improve rating');

  if (percentiles.responseRate >= 75) strengths.push('fast response rate');
  else if (percentiles.responseRate < 50) improvements.push('respond to more reviews');

  if (percentiles.positiveRatio >= 75) strengths.push('high positive ratio');
  else if (percentiles.positiveRatio < 50) improvements.push('increase positive reviews');

  if (percentiles.totalReviews >= 75) strengths.push('high review volume');
  else if (percentiles.totalReviews < 50) improvements.push('collect more reviews');

  let summary = `You rank in the ${tierLabels[tier]} of your industry.`;
  if (strengths.length > 0) summary += ` Strengths: ${strengths.join(', ')}.`;
  if (improvements.length > 0) summary += ` Improve: ${improvements.join(', ')}.`;

  return { metrics: storeMetrics, percentiles, tier, summary };
}

/**
 * Tier display configuration.
 */
export const TIER_CONFIG = {
  top10: { label: 'Top 10%', color: 'green', emoji: '🏆', description: 'Industry leader' },
  top25: { label: 'Top 25%', color: 'blue', emoji: '⭐', description: 'Above average' },
  top50: { label: 'Top 50%', color: 'yellow', emoji: '📈', description: 'Average performance' },
  bottom50: { label: 'Below Average', color: 'red', emoji: '⚠️', description: 'Room for improvement' },
};
