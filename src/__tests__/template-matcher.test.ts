import { describe, it, expect } from 'vitest';
import {
  findBestTemplate,
  hydrateTemplate,
  inferCategoryFromRating,
  type ReplyTemplate,
  type MatchContext,
} from '@/lib/template-matcher';

// Helper to create a minimal template
function tpl(overrides: Partial<ReplyTemplate> = {}): ReplyTemplate {
  return {
    id: 'tpl-1',
    tenant_id: 'tenant-1',
    name: 'Test Template',
    category: 'general',
    min_rating: 1,
    max_rating: 5,
    vertical: null,
    language: 'en',
    body: 'Thank you for your review, {{author_name}}!',
    variables: [],
    is_active: true,
    use_count: 0,
    ...overrides,
  };
}

// Helper for match context
function ctx(overrides: Partial<MatchContext> = {}): MatchContext {
  return {
    rating: 5,
    language: 'en',
    vertical: 'restaurant',
    storeName: 'Pizza Place',
    authorName: 'John',
    reviewText: 'Great food!',
    ...overrides,
  };
}

describe('findBestTemplate', () => {
  it('returns null when no templates exist', () => {
    expect(findBestTemplate([], ctx())).toBeNull();
  });

  it('returns null when no templates match rating', () => {
    const templates = [tpl({ min_rating: 4, max_rating: 5 })];
    expect(findBestTemplate(templates, ctx({ rating: 2 }))).toBeNull();
  });

  it('returns null when language does not match', () => {
    const templates = [tpl({ language: 'zh' })];
    expect(findBestTemplate(templates, ctx({ language: 'en' }))).toBeNull();
  });

  it('returns null when vertical does not match (specific vertical set)', () => {
    const templates = [tpl({ vertical: 'hotel' })];
    expect(findBestTemplate(templates, ctx({ vertical: 'restaurant' }))).toBeNull();
  });

  it('matches a universal template (vertical null) for any vertical', () => {
    const templates = [tpl({ vertical: null })];
    const result = findBestTemplate(templates, ctx({ vertical: 'hotel' }));
    expect(result).not.toBeNull();
    expect(result!.id).toBe('tpl-1');
  });

  it('prefers vertical-specific over universal', () => {
    const templates = [
      tpl({ id: 'universal', vertical: null, name: 'Universal' }),
      tpl({ id: 'restaurant', vertical: 'restaurant', name: 'Restaurant' }),
    ];
    const result = findBestTemplate(templates, ctx({ vertical: 'restaurant' }));
    expect(result!.id).toBe('restaurant');
  });

  it('prefers category-matching template', () => {
    const templates = [
      tpl({ id: 'general', category: 'general', name: 'General' }),
      tpl({ id: 'positive', category: 'positive', name: 'Positive' }),
    ];
    const result = findBestTemplate(templates, ctx(), 'positive');
    expect(result!.id).toBe('positive');
  });

  it('matches 5-star to template with min=4, max=5', () => {
    const templates = [tpl({ min_rating: 4, max_rating: 5 })];
    expect(findBestTemplate(templates, ctx({ rating: 5 }))).not.toBeNull();
    expect(findBestTemplate(templates, ctx({ rating: 4 }))).not.toBeNull();
    expect(findBestTemplate(templates, ctx({ rating: 3 }))).toBeNull();
  });

  it('respects language filtering strictly', () => {
    const templates = [
      tpl({ id: 'en', language: 'en' }),
      tpl({ id: 'zh', language: 'zh' }),
    ];
    const enResult = findBestTemplate(templates, ctx({ language: 'en' }));
    expect(enResult!.id).toBe('en');

    const zhResult = findBestTemplate(templates, ctx({ language: 'zh' }));
    expect(zhResult!.id).toBe('zh');
  });

  it('uses use_count as tiebreaker (proven templates preferred)', () => {
    const templates = [
      tpl({ id: 'new', use_count: 0, category: 'general' }),
      tpl({ id: 'proven', use_count: 500, category: 'general' }),
    ];
    // Both have same score otherwise; proven should win via tiebreaker
    const result = findBestTemplate(templates, ctx());
    expect(result!.id).toBe('proven');
  });
});

describe('hydrateTemplate', () => {
  it('replaces {{store_name}} placeholder', () => {
    const t = tpl({ body: 'Welcome to {{store_name}}!' });
    expect(hydrateTemplate(t, ctx({ storeName: 'Sushi Bar' }))).toBe('Welcome to Sushi Bar!');
  });

  it('replaces {{author_name}} placeholder', () => {
    const t = tpl({ body: 'Thanks {{author_name}}!' });
    expect(hydrateTemplate(t, ctx({ authorName: 'Jane' }))).toBe('Thanks Jane!');
  });

  it('replaces {{rating}} placeholder', () => {
    const t = tpl({ body: 'Your {{rating}}-star review' });
    expect(hydrateTemplate(t, ctx({ rating: 5 }))).toBe('Your 5-star review');
  });

  it('replaces multiple placeholders in same body', () => {
    const t = tpl({ body: 'Thank you {{author_name}} for the {{rating}}★ review of {{store_name}}!' });
    const result = hydrateTemplate(t, ctx({ authorName: 'Mike', rating: 4, storeName: 'Pizza World' }));
    expect(result).toBe('Thank you Mike for the 4★ review of Pizza World!');
  });

  it('replaces custom variables with defaults', () => {
    const t = tpl({
      body: 'Thank you! {{custom_msg}}',
      variables: [{ key: 'custom_msg', label: 'Custom Message', default: 'Hope to see you again!' }],
    });
    expect(hydrateTemplate(t, ctx())).toBe('Thank you! Hope to see you again!');
  });

  it('handles missing custom variable default gracefully', () => {
    const t = tpl({
      body: 'Hello {{unknown_var}}!',
      variables: [{ key: 'unknown_var', label: 'Unknown' }],
    });
    expect(hydrateTemplate(t, ctx())).toBe('Hello !');
  });
});

describe('inferCategoryFromRating', () => {
  it('returns "positive" for 4-5 stars', () => {
    expect(inferCategoryFromRating(5)).toBe('positive');
    expect(inferCategoryFromRating(4)).toBe('positive');
  });

  it('returns "neutral" for 3 stars', () => {
    expect(inferCategoryFromRating(3)).toBe('neutral');
  });

  it('returns "negative" for 1-2 stars', () => {
    expect(inferCategoryFromRating(2)).toBe('negative');
    expect(inferCategoryFromRating(1)).toBe('negative');
  });
});

describe('plan gating for templates', () => {
  // Import directly to test feature flags
  it('free and starter plans do not have replyTemplates', async () => {
    const { hasFeature } = await import('@/lib/plan-limits');
    expect(hasFeature('free', 'replyTemplates')).toBe(false);
    expect(hasFeature('starter', 'replyTemplates')).toBe(false);
  });

  it('pro and enterprise plans have replyTemplates', async () => {
    const { hasFeature } = await import('@/lib/plan-limits');
    expect(hasFeature('pro', 'replyTemplates')).toBe(true);
    expect(hasFeature('enterprise', 'replyTemplates')).toBe(true);
  });
});
