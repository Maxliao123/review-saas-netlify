/**
 * Predictive Analytics Engine
 *
 * Analyzes review trends over time windows and generates
 * actionable alerts and predictions.
 */

export interface TrendDataPoint {
  period: string;   // e.g. "2026-W10", "2026-03"
  avgRating: number;
  count: number;
  positiveRatio: number;  // 0-1
  responseRate: number;   // 0-1
}

export interface PredictiveAlert {
  type: 'rating_decline' | 'rating_improvement' | 'volume_drop' | 'volume_surge'
    | 'response_rate_drop' | 'negative_spike' | 'positive_streak';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  suggestion: string;
  metric: string;
  change: number;      // percentage change
}

/**
 * Compute linear trend (slope) from data points.
 * Returns the slope per period.
 */
export function computeTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Compute percentage change between two periods.
 */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Generate predictive alerts from trend data.
 */
export function generateAlerts(
  recentPeriods: TrendDataPoint[],   // Last 4 weeks/months
  previousPeriods: TrendDataPoint[]  // Prior 4 weeks/months for comparison
): PredictiveAlert[] {
  const alerts: PredictiveAlert[] = [];

  if (recentPeriods.length === 0) return alerts;

  // Current vs previous averages
  const recentAvgRating = recentPeriods.reduce((s, p) => s + p.avgRating, 0) / recentPeriods.length;
  const recentAvgCount = recentPeriods.reduce((s, p) => s + p.count, 0) / recentPeriods.length;
  const recentAvgResponseRate = recentPeriods.reduce((s, p) => s + p.responseRate, 0) / recentPeriods.length;
  const recentPositiveRatio = recentPeriods.reduce((s, p) => s + p.positiveRatio, 0) / recentPeriods.length;

  let prevAvgRating = recentAvgRating;
  let prevAvgCount = recentAvgCount;
  let prevAvgResponseRate = recentAvgResponseRate;
  let prevPositiveRatio = recentPositiveRatio;

  if (previousPeriods.length > 0) {
    prevAvgRating = previousPeriods.reduce((s, p) => s + p.avgRating, 0) / previousPeriods.length;
    prevAvgCount = previousPeriods.reduce((s, p) => s + p.count, 0) / previousPeriods.length;
    prevAvgResponseRate = previousPeriods.reduce((s, p) => s + p.responseRate, 0) / previousPeriods.length;
    prevPositiveRatio = previousPeriods.reduce((s, p) => s + p.positiveRatio, 0) / previousPeriods.length;
  }

  // 1. Rating Trend
  const ratingChange = percentChange(recentAvgRating, prevAvgRating);
  const ratingTrend = computeTrend(recentPeriods.map(p => p.avgRating));

  if (ratingChange <= -10 || ratingTrend < -0.1) {
    alerts.push({
      type: 'rating_decline',
      severity: ratingChange <= -15 ? 'critical' : 'warning',
      title: 'Rating Declining',
      description: `Average rating dropped ${Math.abs(ratingChange)}% (${prevAvgRating.toFixed(1)} → ${recentAvgRating.toFixed(1)}).`,
      suggestion: 'Review recent negative feedback for common themes. Consider adjusting service areas flagged by customers.',
      metric: 'avgRating',
      change: ratingChange,
    });
  } else if (ratingChange >= 10) {
    alerts.push({
      type: 'rating_improvement',
      severity: 'positive',
      title: 'Rating Improving',
      description: `Average rating improved ${ratingChange}% (${prevAvgRating.toFixed(1)} → ${recentAvgRating.toFixed(1)}).`,
      suggestion: 'Keep up the great work! Consider sharing this milestone with your team.',
      metric: 'avgRating',
      change: ratingChange,
    });
  }

  // 2. Volume Trend
  const volumeChange = percentChange(recentAvgCount, prevAvgCount);

  if (volumeChange <= -30) {
    alerts.push({
      type: 'volume_drop',
      severity: 'warning',
      title: 'Review Volume Dropping',
      description: `Review volume dropped ${Math.abs(volumeChange)}% compared to prior period.`,
      suggestion: 'Send more review invites to customers. Check if QR codes are still displayed prominently.',
      metric: 'volume',
      change: volumeChange,
    });
  } else if (volumeChange >= 50) {
    alerts.push({
      type: 'volume_surge',
      severity: 'info',
      title: 'Review Volume Surging',
      description: `Review volume increased ${volumeChange}% compared to prior period.`,
      suggestion: 'Great momentum! Make sure your team can keep up with response times.',
      metric: 'volume',
      change: volumeChange,
    });
  }

  // 3. Response Rate
  const responseRateChange = percentChange(recentAvgResponseRate * 100, prevAvgResponseRate * 100);

  if (recentAvgResponseRate < 0.5 && previousPeriods.length > 0) {
    alerts.push({
      type: 'response_rate_drop',
      severity: 'warning',
      title: 'Low Response Rate',
      description: `Only responding to ${Math.round(recentAvgResponseRate * 100)}% of reviews.`,
      suggestion: 'Enable auto-reply for positive reviews. Assign team members in the Team Inbox.',
      metric: 'responseRate',
      change: responseRateChange,
    });
  }

  // 4. Negative Spike
  const negativeRatio = 1 - recentPositiveRatio;
  const prevNegativeRatio = 1 - prevPositiveRatio;

  if (negativeRatio > 0.4 && negativeRatio > prevNegativeRatio + 0.1) {
    alerts.push({
      type: 'negative_spike',
      severity: 'critical',
      title: 'Negative Review Spike',
      description: `${Math.round(negativeRatio * 100)}% of recent reviews are negative (up from ${Math.round(prevNegativeRatio * 100)}%).`,
      suggestion: 'Investigate common complaints immediately. Check for recent operational changes.',
      metric: 'negativeRatio',
      change: Math.round((negativeRatio - prevNegativeRatio) * 100),
    });
  }

  // 5. Positive Streak
  const allPositive = recentPeriods.every(p => p.positiveRatio >= 0.8);
  if (allPositive && recentPeriods.length >= 3) {
    alerts.push({
      type: 'positive_streak',
      severity: 'positive',
      title: 'Positive Review Streak',
      description: `80%+ positive reviews for ${recentPeriods.length} consecutive periods.`,
      suggestion: 'Celebrate with your team! Consider asking loyal customers for Google reviews.',
      metric: 'positiveRatio',
      change: 0,
    });
  }

  return alerts;
}

/**
 * Severity configuration for display.
 */
export const SEVERITY_CONFIG = {
  critical: { color: 'red', icon: '🚨', bgClass: 'bg-red-50 border-red-200' },
  warning: { color: 'yellow', icon: '⚠️', bgClass: 'bg-yellow-50 border-yellow-200' },
  info: { color: 'blue', icon: 'ℹ️', bgClass: 'bg-blue-50 border-blue-200' },
  positive: { color: 'green', icon: '✅', bgClass: 'bg-green-50 border-green-200' },
};
