import { describe, it, expect } from 'vitest';
import {
  auditReviews,
  AUDIT_SEVERITY_CONFIG,
  type ReviewForAudit,
} from '../lib/review-auditor';

// Helper: create review with defaults
function makeReview(overrides: Partial<ReviewForAudit> = {}): ReviewForAudit {
  return {
    id: `review-${Math.random().toString(36).slice(2, 8)}`,
    storeId: 1,
    authorName: 'Test User',
    rating: 5,
    content: 'Great place! Love it.',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper: create a batch of negative reviews in a short window
function makeNegativeBurst(count: number, storeId: number, windowMinutes = 30): ReviewForAudit[] {
  const base = new Date('2026-03-01T12:00:00Z').getTime();
  return Array.from({ length: count }, (_, i) =>
    makeReview({
      id: `burst-${storeId}-${i}`,
      storeId,
      authorName: `Attacker ${i}`,
      rating: 1,
      content: 'Terrible service! Avoid!',
      createdAt: new Date(base + i * (windowMinutes / count) * 60000).toISOString(),
    })
  );
}

// --------------- AUDIT_SEVERITY_CONFIG ---------------

describe('AUDIT_SEVERITY_CONFIG', () => {
  it('should have critical, warning, and info levels', () => {
    expect(AUDIT_SEVERITY_CONFIG.critical).toBeDefined();
    expect(AUDIT_SEVERITY_CONFIG.warning).toBeDefined();
    expect(AUDIT_SEVERITY_CONFIG.info).toBeDefined();
  });

  it('should have icon and bgClass for each level', () => {
    for (const level of ['critical', 'warning', 'info'] as const) {
      expect(AUDIT_SEVERITY_CONFIG[level].icon).toBeTruthy();
      expect(AUDIT_SEVERITY_CONFIG[level].bgClass).toBeTruthy();
    }
  });
});

// --------------- auditReviews — empty input ---------------

describe('auditReviews — edge cases', () => {
  it('should return empty array for empty input', () => {
    const alerts = auditReviews([]);
    expect(alerts).toEqual([]);
  });

  it('should return empty for all positive reviews', () => {
    const reviews = Array.from({ length: 10 }, (_, i) =>
      makeReview({ id: `pos-${i}`, rating: 5, authorName: `Happy ${i}` })
    );
    const alerts = auditReviews(reviews);
    // No coordinated attacks (all positive), no competitor mentions
    expect(alerts.filter(a => a.type === 'coordinated_attack')).toHaveLength(0);
    expect(alerts.filter(a => a.type === 'review_bomb')).toHaveLength(0);
  });
});

// --------------- Coordinated Attack Detection ---------------

describe('auditReviews — coordinated attacks', () => {
  it('should detect coordinated negative attack when >= minBombCount in window', () => {
    const reviews = makeNegativeBurst(5, 1, 30); // 5 negatives in 30 min
    const alerts = auditReviews(reviews, { windowHours: 1, minBombCount: 5 });
    const coordinated = alerts.filter(a => a.type === 'coordinated_attack');
    expect(coordinated.length).toBeGreaterThanOrEqual(1);
    expect(coordinated[0].affectedReviews.length).toBe(5);
  });

  it('should not detect coordinated attack below threshold', () => {
    const reviews = makeNegativeBurst(3, 1, 30); // Only 3
    const alerts = auditReviews(reviews, { windowHours: 1, minBombCount: 5 });
    const coordinated = alerts.filter(a => a.type === 'coordinated_attack');
    expect(coordinated).toHaveLength(0);
  });

  it('should mark as critical when count >= 2x minBombCount', () => {
    const reviews = makeNegativeBurst(10, 1, 60); // 10 = 2x5
    const alerts = auditReviews(reviews, { windowHours: 2, minBombCount: 5 });
    const coordinated = alerts.filter(a => a.type === 'coordinated_attack');
    expect(coordinated.length).toBeGreaterThanOrEqual(1);
    expect(coordinated[0].severity).toBe('critical');
  });

  it('should mark as warning when count < 2x minBombCount', () => {
    const reviews = makeNegativeBurst(5, 1, 30);
    const alerts = auditReviews(reviews, { windowHours: 1, minBombCount: 5 });
    const coordinated = alerts.filter(a => a.type === 'coordinated_attack');
    if (coordinated.length > 0) {
      expect(coordinated[0].severity).toBe('warning');
    }
  });
});

// --------------- Review Bombing Detection ---------------

describe('auditReviews — review bombing', () => {
  it('should detect review bombing from same city', () => {
    const base = new Date('2026-03-01T12:00:00Z').getTime();
    const reviews = Array.from({ length: 6 }, (_, i) =>
      makeReview({
        id: `bomb-${i}`,
        rating: 1,
        authorName: `Bomber ${i}`,
        ipCity: 'Rival City',
        ipCountry: 'US',
        createdAt: new Date(base + i * 10 * 60000).toISOString(), // 10 min apart
      })
    );
    const alerts = auditReviews(reviews, { windowHours: 4, minBombCount: 5 });
    const bombs = alerts.filter(a => a.type === 'review_bomb');
    expect(bombs.length).toBeGreaterThanOrEqual(1);
    expect(bombs[0].title).toContain('Rival City');
  });

  it('should not detect bombing without city data', () => {
    const reviews = makeNegativeBurst(6, 1, 30); // No ipCity
    const alerts = auditReviews(reviews, { windowHours: 1, minBombCount: 5 });
    const bombs = alerts.filter(a => a.type === 'review_bomb');
    expect(bombs).toHaveLength(0);
  });
});

// --------------- Cross-Store Attack Detection ---------------

describe('auditReviews — cross-store attacks', () => {
  it('should detect same author attacking multiple stores', () => {
    const reviews = [
      makeReview({ id: 'cs-1', storeId: 1, authorName: 'Evil Bot', rating: 1, content: 'Bad' }),
      makeReview({ id: 'cs-2', storeId: 2, authorName: 'Evil Bot', rating: 1, content: 'Terrible' }),
      makeReview({ id: 'cs-3', storeId: 3, authorName: 'Evil Bot', rating: 1, content: 'Worst' }),
    ];
    const alerts = auditReviews(reviews);
    const crossStore = alerts.filter(a => a.type === 'cross_store');
    expect(crossStore.length).toBeGreaterThanOrEqual(1);
    expect(crossStore[0].evidence).toContainEqual(expect.stringContaining('Stores targeted: 3'));
  });

  it('should mark as critical when targeting 3+ stores', () => {
    const reviews = [
      makeReview({ id: 'cs-a', storeId: 1, authorName: 'Troll', rating: 1 }),
      makeReview({ id: 'cs-b', storeId: 2, authorName: 'Troll', rating: 1 }),
      makeReview({ id: 'cs-c', storeId: 3, authorName: 'Troll', rating: 1 }),
    ];
    const alerts = auditReviews(reviews);
    const crossStore = alerts.filter(a => a.type === 'cross_store');
    expect(crossStore[0].severity).toBe('critical');
  });

  it('should mark as warning when targeting exactly 2 stores', () => {
    const reviews = [
      makeReview({ id: 'cs-x', storeId: 1, authorName: 'Troll2', rating: 2 }),
      makeReview({ id: 'cs-y', storeId: 2, authorName: 'Troll2', rating: 1 }),
    ];
    const alerts = auditReviews(reviews);
    const crossStore = alerts.filter(a => a.type === 'cross_store');
    expect(crossStore[0].severity).toBe('warning');
  });

  it('should be case-insensitive for author names', () => {
    const reviews = [
      makeReview({ id: 'ci-1', storeId: 1, authorName: 'John Smith', rating: 1 }),
      makeReview({ id: 'ci-2', storeId: 2, authorName: 'john smith', rating: 1 }),
    ];
    const alerts = auditReviews(reviews);
    const crossStore = alerts.filter(a => a.type === 'cross_store');
    expect(crossStore.length).toBeGreaterThanOrEqual(1);
  });

  it('should not flag same author on same store only', () => {
    const reviews = [
      makeReview({ id: 'ss-1', storeId: 1, authorName: 'Repeat', rating: 1 }),
      makeReview({ id: 'ss-2', storeId: 1, authorName: 'Repeat', rating: 2 }),
    ];
    const alerts = auditReviews(reviews);
    const crossStore = alerts.filter(a => a.type === 'cross_store');
    expect(crossStore).toHaveLength(0);
  });
});

// --------------- Competitor Mention Detection ---------------

describe('auditReviews — competitor mentions', () => {
  it('should detect "go to X instead" pattern', () => {
    const reviews = [
      makeReview({ id: 'cm-1', rating: 1, content: 'Terrible food! Go to Chipotle instead.' }),
    ];
    const alerts = auditReviews(reviews);
    const mentions = alerts.filter(a => a.type === 'competitor_mention');
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(mentions[0].title).toContain('Chipotle');
  });

  it('should detect "X is better" pattern', () => {
    const reviews = [
      makeReview({ id: 'cm-2', rating: 2, content: 'McDonalds is much better than this place.' }),
    ];
    const alerts = auditReviews(reviews);
    const mentions = alerts.filter(a => a.type === 'competitor_mention');
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect "recommend X instead" pattern', () => {
    const reviews = [
      makeReview({ id: 'cm-3', rating: 1, content: 'I would recommend Panera instead of this.' }),
    ];
    const alerts = auditReviews(reviews);
    const mentions = alerts.filter(a => a.type === 'competitor_mention');
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it('should not flag competitor mentions in positive reviews', () => {
    const reviews = [
      makeReview({ id: 'cm-pos', rating: 5, content: 'Better than Chipotle! Go to this place instead.' }),
    ];
    const alerts = auditReviews(reviews);
    const mentions = alerts.filter(a => a.type === 'competitor_mention');
    expect(mentions).toHaveLength(0);
  });

  it('should not flag reviews without competitor keywords', () => {
    const reviews = [
      makeReview({ id: 'cm-none', rating: 1, content: 'Food was cold and service was slow.' }),
    ];
    const alerts = auditReviews(reviews);
    const mentions = alerts.filter(a => a.type === 'competitor_mention');
    expect(mentions).toHaveLength(0);
  });

  it('competitor mentions should have info severity', () => {
    const reviews = [
      makeReview({ id: 'cm-sev', rating: 1, content: 'Go to BurgerKing instead.' }),
    ];
    const alerts = auditReviews(reviews);
    const mentions = alerts.filter(a => a.type === 'competitor_mention');
    if (mentions.length > 0) {
      expect(mentions[0].severity).toBe('info');
    }
  });
});

// --------------- Sorting ---------------

describe('auditReviews — alert sorting', () => {
  it('should sort alerts by severity: critical > warning > info', () => {
    const reviews = [
      // Cross-store attack on 3 stores = critical
      makeReview({ id: 'sort-1', storeId: 1, authorName: 'Mega Troll', rating: 1 }),
      makeReview({ id: 'sort-2', storeId: 2, authorName: 'Mega Troll', rating: 1 }),
      makeReview({ id: 'sort-3', storeId: 3, authorName: 'Mega Troll', rating: 1 }),
      // Competitor mention = info
      makeReview({ id: 'sort-4', rating: 1, content: 'Go to Subway instead.' }),
    ];
    const alerts = auditReviews(reviews);
    if (alerts.length >= 2) {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      for (let i = 1; i < alerts.length; i++) {
        expect(severityOrder[alerts[i].severity]).toBeGreaterThanOrEqual(
          severityOrder[alerts[i - 1].severity]
        );
      }
    }
  });
});
