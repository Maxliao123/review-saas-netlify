import { describe, it, expect } from 'vitest';
import { getVerticalConfig, getVerticalOptions, VERTICALS, type BusinessVertical } from '@/lib/verticals';
import { buildReplyPrompt } from '@/lib/handbook';

describe('Verticals Config', () => {
  const allVerticals: BusinessVertical[] = [
    'restaurant', 'medical', 'hotel', 'auto_repair', 'salon', 'retail', 'fitness', 'other'
  ];

  it('has 8 verticals defined', () => {
    expect(Object.keys(VERTICALS)).toHaveLength(8);
  });

  it('each vertical has required fields', () => {
    for (const v of allVerticals) {
      const config = VERTICALS[v];
      expect(config.id).toBe(v);
      expect(config.label).toBeTruthy();
      expect(config.labelZh).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.replyScenarios).toBeTruthy();
      expect(config.factsTemplate.length).toBeGreaterThan(0);
      expect(config.defaultTagsEn.length).toBeGreaterThan(0);
      expect(config.defaultTagsZh.length).toBeGreaterThan(0);
    }
  });

  it('getVerticalConfig returns correct config for known vertical', () => {
    const config = getVerticalConfig('medical');
    expect(config.id).toBe('medical');
    expect(config.label).toContain('Medical');
  });

  it('getVerticalConfig falls back to restaurant for unknown vertical', () => {
    const config = getVerticalConfig('unknown_type');
    expect(config.id).toBe('restaurant');
  });

  it('getVerticalConfig falls back to restaurant for null', () => {
    const config = getVerticalConfig(null);
    expect(config.id).toBe('restaurant');
  });

  it('getVerticalOptions returns all 8 options for UI', () => {
    const options = getVerticalOptions();
    expect(options).toHaveLength(8);
    expect(options.every(o => o.id && o.label && o.icon)).toBe(true);
  });
});

describe('Vertical-Aware Handbook', () => {
  it('buildReplyPrompt includes restaurant scenarios by default', () => {
    const prompt = buildReplyPrompt('restaurant');
    expect(prompt).toContain('Hygiene & Cleanliness');
    expect(prompt).toContain('Wrong/Missing Item');
    expect(prompt).toContain('Food Safety');
  });

  it('buildReplyPrompt includes medical scenarios for medical vertical', () => {
    const prompt = buildReplyPrompt('medical');
    expect(prompt).toContain('Staff Bedside Manner');
    expect(prompt).toContain('Treatment Concerns');
    expect(prompt).toContain('HIPAA NOTE');
    // Should NOT contain restaurant-specific scenarios
    expect(prompt).not.toContain('Wrong/Missing Item');
    expect(prompt).not.toContain('Sauce Bar');
  });

  it('buildReplyPrompt includes hotel scenarios for hotel vertical', () => {
    const prompt = buildReplyPrompt('hotel');
    expect(prompt).toContain('Room Cleanliness');
    expect(prompt).toContain('Check-in/Check-out');
    expect(prompt).toContain('Amenities Not Working');
  });

  it('buildReplyPrompt includes auto_repair scenarios', () => {
    const prompt = buildReplyPrompt('auto_repair');
    expect(prompt).toContain('Repair Not Fixed');
    expect(prompt).toContain('Misdiagnosis');
    expect(prompt).toContain('Damage to Vehicle');
  });

  it('buildReplyPrompt includes salon scenarios', () => {
    const prompt = buildReplyPrompt('salon');
    expect(prompt).toContain('Bad Haircut');
    expect(prompt).toContain('Skin/Hair Damage');
  });

  it('buildReplyPrompt falls back to restaurant for null', () => {
    const prompt = buildReplyPrompt(null);
    expect(prompt).toContain('Hygiene & Cleanliness');
    expect(prompt).toContain('Foreign Objects');
  });

  it('buildReplyPrompt always includes base rules (Language Alignment, Fact-Check)', () => {
    for (const vertical of ['restaurant', 'medical', 'hotel', 'auto_repair', 'salon'] as const) {
      const prompt = buildReplyPrompt(vertical);
      expect(prompt).toContain('Fact-Check Gate');
      expect(prompt).toContain('Language Alignment');
      expect(prompt).toContain('detected_language');
      expect(prompt).toContain('POSITIVE REVIEWS');
    }
  });

  it('buildReplyPrompt supports multi-language detection (6 languages)', () => {
    const prompt = buildReplyPrompt('restaurant');
    expect(prompt).toContain('Korean');
    expect(prompt).toContain('Japanese');
    expect(prompt).toContain('French');
    expect(prompt).toContain('Spanish');
  });
});
