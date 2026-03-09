import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_VERTICALS,
  VERTICAL_LABELS,
  ORDER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  PLATFORM_COMMISSION_RATE,
  calculateSpecialistScore,
  rankSpecialists,
  calculateOrderTotal,
  validateSpecialistProfile,
  validateOrderInput,
  calculateMarketplaceStats,
  suggestSpecialistsForReview,
  projectSpecialistEarnings,
  type Specialist,
  type MarketplaceOrder,
} from '../lib/marketplace';

// --------------- Helpers ---------------

function makeSpecialist(overrides: Partial<Specialist> = {}): Specialist {
  return {
    id: 'sp-001',
    user_id: 'user-001',
    display_name: 'Jane Review Pro',
    avatar_url: null,
    bio: 'Expert review writer',
    languages: ['en'],
    verticals: ['restaurant'],
    hourly_rate: null,
    per_review_rate: 3.00,
    rating_avg: 4.5,
    rating_count: 20,
    total_reviews_written: 200,
    total_earnings: 600,
    response_time_avg_hours: 4,
    is_verified: true,
    is_available: true,
    portfolio_samples: [],
    certifications: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeOrder(overrides: Partial<MarketplaceOrder> = {}): MarketplaceOrder {
  return {
    id: 'ord-001',
    tenant_id: 'tenant-abc',
    store_id: 1,
    specialist_id: 'sp-001',
    order_type: 'batch',
    status: 'completed',
    review_count: 10,
    price_per_review: 3.00,
    total_price: 34.50,
    currency: 'USD',
    instructions: null,
    deadline_at: null,
    accepted_at: null,
    completed_at: new Date().toISOString(),
    client_rating: 5,
    client_feedback: 'Great work!',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// --------------- Constants ---------------

describe('Marketplace Constants', () => {
  it('should define 10 supported verticals', () => {
    expect(SUPPORTED_VERTICALS).toHaveLength(10);
    expect(SUPPORTED_VERTICALS).toContain('restaurant');
    expect(SUPPORTED_VERTICALS).toContain('hotel');
    expect(SUPPORTED_VERTICALS).toContain('medical');
  });

  it('should have labels for all verticals', () => {
    for (const v of SUPPORTED_VERTICALS) {
      expect(VERTICAL_LABELS[v]).toBeTruthy();
    }
  });

  it('should define 3 order types', () => {
    expect(Object.keys(ORDER_TYPE_LABELS)).toHaveLength(3);
    expect(ORDER_TYPE_LABELS.one_time.label).toBe('One-Time');
    expect(ORDER_TYPE_LABELS.batch.label).toBe('Batch Package');
    expect(ORDER_TYPE_LABELS.ongoing.label).toBe('Ongoing');
  });

  it('should define 6 order statuses', () => {
    expect(Object.keys(ORDER_STATUS_LABELS)).toHaveLength(6);
  });

  it('should define 6 assignment statuses', () => {
    expect(Object.keys(ASSIGNMENT_STATUS_LABELS)).toHaveLength(6);
  });

  it('should have 15% platform commission', () => {
    expect(PLATFORM_COMMISSION_RATE).toBe(0.15);
  });
});

// --------------- calculateSpecialistScore ---------------

describe('calculateSpecialistScore', () => {
  it('should score higher for better-rated specialists', () => {
    const good = makeSpecialist({ rating_avg: 5.0 });
    const mid = makeSpecialist({ rating_avg: 3.0 });
    expect(calculateSpecialistScore(good)).toBeGreaterThan(calculateSpecialistScore(mid));
  });

  it('should score higher for verified specialists', () => {
    const verified = makeSpecialist({ is_verified: true });
    const unverified = makeSpecialist({ is_verified: false });
    expect(calculateSpecialistScore(verified)).toBeGreaterThan(calculateSpecialistScore(unverified));
  });

  it('should score higher for faster response times', () => {
    const fast = makeSpecialist({ response_time_avg_hours: 1 });
    const slow = makeSpecialist({ response_time_avg_hours: 48 });
    expect(calculateSpecialistScore(fast)).toBeGreaterThan(calculateSpecialistScore(slow));
  });

  it('should give language match bonus', () => {
    const s = makeSpecialist({ languages: ['en', 'zh'] });
    const withMatch = calculateSpecialistScore(s, { language: 'zh' });
    const noMatch = calculateSpecialistScore(s, { language: 'ja' });
    expect(withMatch).toBeGreaterThan(noMatch);
  });

  it('should give vertical match bonus', () => {
    const s = makeSpecialist({ verticals: ['restaurant', 'hotel'] });
    const withMatch = calculateSpecialistScore(s, { vertical: 'hotel' });
    const noMatch = calculateSpecialistScore(s, { vertical: 'dental' });
    expect(withMatch).toBeGreaterThan(noMatch);
  });

  it('should penalize exceeding max price', () => {
    const s = makeSpecialist({ per_review_rate: 10 });
    const withinBudget = calculateSpecialistScore(s, { maxPrice: 15 });
    const overBudget = calculateSpecialistScore(s, { maxPrice: 5 });
    expect(withinBudget).toBeGreaterThan(overBudget);
  });
});

// --------------- rankSpecialists ---------------

describe('rankSpecialists', () => {
  it('should rank specialists by score descending', () => {
    const specialists = [
      makeSpecialist({ id: 's1', rating_avg: 3.0, is_verified: false }),
      makeSpecialist({ id: 's2', rating_avg: 5.0, is_verified: true }),
      makeSpecialist({ id: 's3', rating_avg: 4.0, is_verified: true }),
    ];
    const ranked = rankSpecialists(specialists);
    expect(ranked[0].id).toBe('s2');
    expect(ranked[ranked.length - 1].id).toBe('s1');
  });

  it('should include score in result', () => {
    const ranked = rankSpecialists([makeSpecialist()]);
    expect(ranked[0].score).toBeGreaterThan(0);
  });
});

// --------------- calculateOrderTotal ---------------

describe('calculateOrderTotal', () => {
  it('should calculate correct totals', () => {
    const result = calculateOrderTotal(3.00, 10);
    expect(result.subtotal).toBe(30);
    expect(result.commission).toBe(4.50); // 30 * 0.15
    expect(result.total).toBe(34.50);     // 30 + 4.50
    expect(result.specialistPayout).toBe(25.50); // 30 - 4.50
  });

  it('should handle single review', () => {
    const result = calculateOrderTotal(5.00, 1);
    expect(result.subtotal).toBe(5);
    expect(result.total).toBe(5.75); // 5 + 0.75
  });

  it('should handle large batch', () => {
    const result = calculateOrderTotal(2.00, 100);
    expect(result.subtotal).toBe(200);
    expect(result.commission).toBe(30); // 200 * 0.15
    expect(result.total).toBe(230);
    expect(result.specialistPayout).toBe(170);
  });
});

// --------------- validateSpecialistProfile ---------------

describe('validateSpecialistProfile', () => {
  it('should pass for valid profile', () => {
    const errors = validateSpecialistProfile({
      display_name: 'Jane Pro',
      languages: ['en'],
      verticals: ['restaurant'],
      per_review_rate: 3.00,
    });
    expect(errors).toHaveLength(0);
  });

  it('should reject short display name', () => {
    const errors = validateSpecialistProfile({ display_name: 'J' });
    expect(errors.some(e => e.includes('Display name'))).toBe(true);
  });

  it('should reject long display name', () => {
    const errors = validateSpecialistProfile({ display_name: 'x'.repeat(51) });
    expect(errors.some(e => e.includes('50 characters'))).toBe(true);
  });

  it('should reject long bio', () => {
    const errors = validateSpecialistProfile({ bio: 'x'.repeat(501) });
    expect(errors.some(e => e.includes('Bio'))).toBe(true);
  });

  it('should reject out-of-range rate', () => {
    expect(validateSpecialistProfile({ per_review_rate: 0.10 }).length).toBeGreaterThan(0);
    expect(validateSpecialistProfile({ per_review_rate: 150 }).length).toBeGreaterThan(0);
  });

  it('should reject empty languages', () => {
    const errors = validateSpecialistProfile({ languages: [] });
    expect(errors.some(e => e.includes('language'))).toBe(true);
  });

  it('should reject empty verticals', () => {
    const errors = validateSpecialistProfile({ verticals: [] });
    expect(errors.some(e => e.includes('vertical'))).toBe(true);
  });
});

// --------------- validateOrderInput ---------------

describe('validateOrderInput', () => {
  it('should pass for valid input', () => {
    const errors = validateOrderInput({
      review_count: 10,
      price_per_review: 3.00,
      order_type: 'batch',
    });
    expect(errors).toHaveLength(0);
  });

  it('should reject zero review count', () => {
    const errors = validateOrderInput({ review_count: 0, price_per_review: 3 });
    expect(errors.some(e => e.includes('Review count'))).toBe(true);
  });

  it('should reject review count over 1000', () => {
    const errors = validateOrderInput({ review_count: 1001, price_per_review: 3 });
    expect(errors.some(e => e.includes('1000'))).toBe(true);
  });

  it('should reject zero price', () => {
    const errors = validateOrderInput({ review_count: 10, price_per_review: 0 });
    expect(errors.some(e => e.includes('Price'))).toBe(true);
  });

  it('should reject invalid order type', () => {
    const errors = validateOrderInput({ review_count: 10, price_per_review: 3, order_type: 'invalid' });
    expect(errors.some(e => e.includes('order type'))).toBe(true);
  });

  it('should reject past deadline', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const errors = validateOrderInput({ review_count: 10, price_per_review: 3, deadline_at: past });
    expect(errors.some(e => e.includes('future'))).toBe(true);
  });
});

// --------------- calculateMarketplaceStats ---------------

describe('calculateMarketplaceStats', () => {
  it('should calculate stats correctly', () => {
    const specialists = [
      makeSpecialist({ is_available: true, is_verified: true, rating_avg: 4.5, rating_count: 10, verticals: ['restaurant', 'hotel'], languages: ['en', 'zh'] }),
      makeSpecialist({ id: 's2', is_available: false, is_verified: false, rating_avg: 3.0, rating_count: 5, verticals: ['restaurant'], languages: ['en'] }),
    ];
    const orders = [
      makeOrder({ status: 'completed', total_price: 30 }),
      makeOrder({ id: 'o2', status: 'completed', total_price: 50 }),
      makeOrder({ id: 'o3', status: 'in_progress', total_price: 20 }),
    ];

    const stats = calculateMarketplaceStats(specialists, orders);

    expect(stats.totalSpecialists).toBe(2);
    expect(stats.availableSpecialists).toBe(1);
    expect(stats.verifiedSpecialists).toBe(1);
    expect(stats.totalOrders).toBe(3);
    expect(stats.completedOrders).toBe(2);
    expect(stats.activeOrders).toBe(1);
    expect(stats.totalRevenue).toBe(80);
    expect(stats.avgOrderValue).toBe(40);
    expect(stats.completionRate).toBe('67%');
    expect(stats.topVerticals[0].vertical).toBe('restaurant');
    expect(stats.topLanguages[0].language).toBe('en');
  });

  it('should handle empty data', () => {
    const stats = calculateMarketplaceStats([], []);
    expect(stats.totalSpecialists).toBe(0);
    expect(stats.totalOrders).toBe(0);
    expect(stats.completionRate).toBe('0%');
    expect(stats.avgSpecialistRating).toBe(0);
  });
});

// --------------- suggestSpecialistsForReview ---------------

describe('suggestSpecialistsForReview', () => {
  const specialists = [
    makeSpecialist({ id: 's1', languages: ['en'], verticals: ['restaurant'], rating_avg: 4.0, is_available: true }),
    makeSpecialist({ id: 's2', languages: ['zh', 'en'], verticals: ['hotel'], rating_avg: 4.8, is_available: true }),
    makeSpecialist({ id: 's3', languages: ['en'], verticals: ['restaurant'], rating_avg: 3.5, is_available: false }),
    makeSpecialist({ id: 's4', languages: ['zh'], verticals: ['restaurant'], rating_avg: 4.5, is_available: true, total_reviews_written: 100, is_verified: true }),
  ];

  it('should only suggest available specialists', () => {
    const result = suggestSpecialistsForReview(specialists, {});
    expect(result.find(s => s.id === 's3')).toBeUndefined();
  });

  it('should prefer language-matching specialists', () => {
    const result = suggestSpecialistsForReview(specialists, { language: 'zh' });
    // s2 and s4 both know Chinese, should be ranked higher
    const zhIds = result.slice(0, 2).map(s => s.id);
    expect(zhIds).toContain('s2');
    expect(zhIds).toContain('s4');
  });

  it('should prefer vertical-matching specialists', () => {
    const result = suggestSpecialistsForReview(specialists, { vertical: 'restaurant' });
    expect(result[0].verticals).toContain('restaurant');
  });

  it('should prefer experienced specialists for negative reviews', () => {
    const result = suggestSpecialistsForReview(specialists, { rating: 1, vertical: 'restaurant' });
    // s4 has 100 reviews, should get bonus for negative reviews
    expect(result[0].id).toBe('s4');
  });

  it('should respect limit', () => {
    const result = suggestSpecialistsForReview(specialists, {}, 2);
    expect(result).toHaveLength(2);
  });
});

// --------------- projectSpecialistEarnings ---------------

describe('projectSpecialistEarnings', () => {
  it('should project earnings correctly', () => {
    const s = makeSpecialist({ per_review_rate: 3.00 });
    const proj = projectSpecialistEarnings(s, 100);

    expect(proj.monthlyGross).toContain('300');
    expect(proj.monthlyNet).toContain('255');    // 300 - 45
    expect(proj.reviewsPerDay).toBe(3);          // 100/30 rounded
  });

  it('should format as dollar amounts', () => {
    const proj = projectSpecialistEarnings(makeSpecialist());
    expect(proj.monthlyGross).toMatch(/^\$/);
    expect(proj.annualNet).toMatch(/^\$/);
  });

  it('should calculate annual correctly', () => {
    const s = makeSpecialist({ per_review_rate: 5.00 });
    const proj = projectSpecialistEarnings(s, 200);
    // 200 * 5 = 1000/mo gross, 850/mo net, 10200/yr net
    expect(proj.annualNet).toContain('10,200');
  });
});
