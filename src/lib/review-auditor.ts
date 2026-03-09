/**
 * AI Review Auditor
 *
 * Detects competitor manipulation patterns across stores.
 * Extends anomaly detection with cross-store and temporal analysis.
 *
 * Detection capabilities:
 *   - Coordinated negative attacks (multiple 1-star in short window)
 *   - Review bombing from new/suspicious accounts
 *   - Cross-store same-author attacks
 *   - Unusual geographic patterns
 *   - Competitor keyword detection
 */

export interface AuditAlert {
  type: 'coordinated_attack' | 'review_bomb' | 'cross_store' | 'competitor_mention' | 'geographic_anomaly';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  evidence: string[];
  affectedReviews: string[];   // Review IDs
  recommendedAction: string;
}

export interface ReviewForAudit {
  id: string;
  storeId: number;
  authorName: string;
  rating: number;
  content: string;
  createdAt: string;
  ipCity?: string;
  ipCountry?: string;
}

// Competitor-related keywords
const COMPETITOR_KEYWORDS = [
  /go to (\w+) instead/i,
  /try (\w+) down the street/i,
  /(\w+) is (much )?(so much )?better/i,
  /should have gone to (\w+)/i,
  /(\w+) across the street/i,
  /switch(ed)? to (\w+)/i,
  /recommend (\w+) instead/i,
  /prefer (\w+)/i,
];

/**
 * Run full audit analysis on a set of reviews.
 */
export function auditReviews(
  reviews: ReviewForAudit[],
  options: { windowHours?: number; minBombCount?: number } = {}
): AuditAlert[] {
  const { windowHours = 4, minBombCount = 5 } = options;
  const alerts: AuditAlert[] = [];

  if (reviews.length === 0) return alerts;

  // 1. Detect coordinated negative attacks
  const negativeReviews = reviews.filter(r => r.rating <= 2);
  const coordinatedAttacks = detectCoordinatedAttack(negativeReviews, windowHours, minBombCount);
  alerts.push(...coordinatedAttacks);

  // 2. Detect review bombing (many reviews from same IP/city in short window)
  const bombAlerts = detectReviewBombing(reviews, windowHours, minBombCount);
  alerts.push(...bombAlerts);

  // 3. Detect cross-store attacks (same author leaving negative reviews on multiple stores)
  const crossStoreAlerts = detectCrossStoreAttacks(negativeReviews);
  alerts.push(...crossStoreAlerts);

  // 4. Detect competitor mentions
  const competitorAlerts = detectCompetitorMentions(reviews);
  alerts.push(...competitorAlerts);

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Detect coordinated negative review attacks.
 */
function detectCoordinatedAttack(
  negativeReviews: ReviewForAudit[],
  windowHours: number,
  minCount: number
): AuditAlert[] {
  const alerts: AuditAlert[] = [];
  const windowMs = windowHours * 60 * 60 * 1000;

  // Group by store
  const byStore = groupBy(negativeReviews, r => r.storeId);

  for (const [storeId, storeReviews] of byStore) {
    if (storeReviews.length < minCount) continue;

    // Sort by time
    const sorted = [...storeReviews].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Sliding window detection
    for (let i = 0; i < sorted.length; i++) {
      const windowStart = new Date(sorted[i].createdAt).getTime();
      const inWindow = sorted.filter(r => {
        const t = new Date(r.createdAt).getTime();
        return t >= windowStart && t <= windowStart + windowMs;
      });

      if (inWindow.length >= minCount) {
        const uniqueAuthors = new Set(inWindow.map(r => r.authorName)).size;
        alerts.push({
          type: 'coordinated_attack',
          severity: inWindow.length >= minCount * 2 ? 'critical' : 'warning',
          title: `Coordinated Negative Attack Detected`,
          description: `${inWindow.length} negative reviews on store #${storeId} within ${windowHours} hours from ${uniqueAuthors} unique authors.`,
          evidence: [
            `${inWindow.length} reviews in ${windowHours}-hour window`,
            `${uniqueAuthors} unique authors`,
            `Average rating: ${(inWindow.reduce((s, r) => s + r.rating, 0) / inWindow.length).toFixed(1)}`,
          ],
          affectedReviews: inWindow.map(r => r.id),
          recommendedAction: 'Report to Google as suspected review manipulation. Document the pattern for appeal.',
        });
        break; // One alert per store
      }
    }
  }

  return alerts;
}

/**
 * Detect review bombing (same location burst).
 */
function detectReviewBombing(
  reviews: ReviewForAudit[],
  windowHours: number,
  minCount: number
): AuditAlert[] {
  const alerts: AuditAlert[] = [];

  // Group by city if available
  const reviewsWithCity = reviews.filter(r => r.ipCity);
  if (reviewsWithCity.length === 0) return alerts;

  const byCity = groupBy(reviewsWithCity, r => `${r.ipCity}-${r.ipCountry}`);

  for (const [location, cityReviews] of byCity) {
    const negatives = cityReviews.filter(r => r.rating <= 2);
    if (negatives.length < minCount) continue;

    // Check for time clustering
    const windowMs = windowHours * 60 * 60 * 1000;
    const sorted = [...negatives].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (let i = 0; i <= sorted.length - minCount; i++) {
      const start = new Date(sorted[i].createdAt).getTime();
      const end = new Date(sorted[i + minCount - 1].createdAt).getTime();

      if (end - start <= windowMs) {
        alerts.push({
          type: 'review_bomb',
          severity: 'warning',
          title: `Review Bombing from ${String(location).split('-')[0]}`,
          description: `${minCount}+ negative reviews from same city within ${windowHours} hours.`,
          evidence: [
            `Location: ${location}`,
            `${negatives.length} negative reviews total from this area`,
          ],
          affectedReviews: negatives.map(r => r.id),
          recommendedAction: 'Investigate if reviews are from legitimate customers in this area.',
        });
        break;
      }
    }
  }

  return alerts;
}

/**
 * Detect cross-store attacks (same author targeting multiple stores).
 */
function detectCrossStoreAttacks(negativeReviews: ReviewForAudit[]): AuditAlert[] {
  const alerts: AuditAlert[] = [];

  const byAuthor = groupBy(negativeReviews, r => r.authorName.toLowerCase());

  for (const [author, authorReviews] of byAuthor) {
    const uniqueStores = new Set(authorReviews.map(r => r.storeId));
    if (uniqueStores.size >= 2) {
      alerts.push({
        type: 'cross_store',
        severity: uniqueStores.size >= 3 ? 'critical' : 'warning',
        title: `Cross-Store Attack by "${authorReviews[0].authorName}"`,
        description: `Same author left negative reviews on ${uniqueStores.size} different stores.`,
        evidence: [
          `Author: ${authorReviews[0].authorName}`,
          `Stores targeted: ${uniqueStores.size}`,
          `Total negative reviews: ${authorReviews.length}`,
        ],
        affectedReviews: authorReviews.map(r => r.id),
        recommendedAction: 'Report this user to Google for targeted harassment.',
      });
    }
  }

  return alerts;
}

/**
 * Detect competitor mentions in reviews.
 */
function detectCompetitorMentions(reviews: ReviewForAudit[]): AuditAlert[] {
  const alerts: AuditAlert[] = [];

  for (const review of reviews) {
    if (!review.content || review.rating > 2) continue;

    for (const pattern of COMPETITOR_KEYWORDS) {
      const match = review.content.match(pattern);
      if (match) {
        const competitor = match[match.length - 1] || match[1];
        alerts.push({
          type: 'competitor_mention',
          severity: 'info',
          title: `Competitor Mentioned: "${competitor}"`,
          description: `Negative review explicitly mentions competitor "${competitor}".`,
          evidence: [
            `Review by: ${review.authorName}`,
            `Rating: ${review.rating}★`,
            `Competitor: ${competitor}`,
          ],
          affectedReviews: [review.id],
          recommendedAction: 'Could be a planted review by competitor. Monitor for patterns.',
        });
        break; // One alert per review
      }
    }
  }

  return alerts;
}

/**
 * Helper: Group array by key function.
 */
function groupBy<T>(arr: T[], keyFn: (item: T) => string | number): Map<string | number, T[]> {
  const map = new Map<string | number, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    const group = map.get(key) || [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

/**
 * Audit severity display config.
 */
export const AUDIT_SEVERITY_CONFIG = {
  critical: { color: 'red', icon: '🚨', bgClass: 'bg-red-50 border-red-300' },
  warning: { color: 'yellow', icon: '⚠️', bgClass: 'bg-yellow-50 border-yellow-300' },
  info: { color: 'blue', icon: 'ℹ️', bgClass: 'bg-blue-50 border-blue-300' },
};
