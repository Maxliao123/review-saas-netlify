import { describe, it, expect } from 'vitest';
import {
  computeFunnel,
  computeChannelBreakdown,
  computeInviteFunnel,
  computePeakHours,
  computeDeviceBreakdown,
  formatHour,
} from '@/lib/journey-analytics';

describe('computeFunnel', () => {
  it('computes conversion rates correctly', () => {
    const funnel = computeFunnel(100, 60, 30, 20);
    expect(funnel.stages).toHaveLength(4);
    expect(funnel.stages[0].count).toBe(100);
    expect(funnel.stages[1].conversionRate).toBe(60);  // 60/100
    expect(funnel.stages[2].conversionRate).toBe(50);   // 30/60
    expect(funnel.stages[3].conversionRate).toBe(67);   // 20/30
    expect(funnel.overallConversion).toBe(30);           // 30/100
  });

  it('handles zero scans', () => {
    const funnel = computeFunnel(0, 0, 0, 0);
    expect(funnel.stages[1].conversionRate).toBe(0);
    expect(funnel.overallConversion).toBe(0);
  });

  it('first stage always has 100% conversion', () => {
    const funnel = computeFunnel(50, 25, 10, 5);
    expect(funnel.stages[0].conversionRate).toBe(100);
  });
});

describe('computeChannelBreakdown', () => {
  it('returns channels sorted by scan count', () => {
    const channels = computeChannelBreakdown(
      { qr: 50, nfc: 10, link: 30 },
      { qr: 40, nfc: 8, link: 25 },
      { qr: 20, nfc: 5, link: 15 }
    );
    expect(channels[0].channel).toBe('qr');
    expect(channels[1].channel).toBe('link');
    expect(channels[2].channel).toBe('nfc');
  });

  it('computes conversion rates per channel', () => {
    const channels = computeChannelBreakdown(
      { qr: 100 },
      { qr: 60 },
      { qr: 30 }
    );
    expect(channels[0].conversionRate).toBe(30);  // 30/100
  });

  it('handles empty data', () => {
    const channels = computeChannelBreakdown({}, {}, {});
    expect(channels).toHaveLength(0);
  });
});

describe('computeInviteFunnel', () => {
  it('computes rates correctly', () => {
    const funnel = computeInviteFunnel(100, 90, 45, 20);
    expect(funnel.deliveryRate).toBe(90);   // 90/100
    expect(funnel.openRate).toBe(50);        // 45/90
    expect(funnel.completionRate).toBe(44);  // 20/45
  });

  it('handles zero sent', () => {
    const funnel = computeInviteFunnel(0, 0, 0, 0);
    expect(funnel.deliveryRate).toBe(0);
    expect(funnel.openRate).toBe(0);
    expect(funnel.completionRate).toBe(0);
  });
});

describe('computePeakHours', () => {
  it('returns 24 hours', () => {
    const hours = computePeakHours(['2026-03-08T14:00:00Z']);
    expect(hours).toHaveLength(24);
  });

  it('counts timestamps into correct hours', () => {
    const timestamps = [
      '2026-03-08T14:00:00Z',
      '2026-03-08T14:30:00Z',
      '2026-03-08T14:45:00Z',
      '2026-03-08T09:00:00Z',
    ];
    const hours = computePeakHours(timestamps);
    // Note: exact hour depends on timezone, but we can check total
    const total = hours.reduce((s, h) => s + h.count, 0);
    expect(total).toBe(4);
  });

  it('handles empty timestamps', () => {
    const hours = computePeakHours([]);
    expect(hours).toHaveLength(24);
    expect(hours.every(h => h.count === 0)).toBe(true);
  });
});

describe('computeDeviceBreakdown', () => {
  it('returns devices sorted by count', () => {
    const devices = computeDeviceBreakdown(
      { mobile: 80, desktop: 15, tablet: 5 },
      { mobile: 40, desktop: 10, tablet: 2 }
    );
    expect(devices[0].deviceType).toBe('mobile');
    expect(devices[0].conversionRate).toBe(50);  // 40/80
    expect(devices).toHaveLength(3);
  });

  it('handles zero scans for device', () => {
    const devices = computeDeviceBreakdown(
      { mobile: 0 },
      { mobile: 0 }
    );
    expect(devices[0].conversionRate).toBe(0);
  });
});

describe('formatHour', () => {
  it('formats midnight', () => {
    expect(formatHour(0)).toBe('12 AM');
  });

  it('formats noon', () => {
    expect(formatHour(12)).toBe('12 PM');
  });

  it('formats morning hours', () => {
    expect(formatHour(9)).toBe('9 AM');
  });

  it('formats afternoon hours', () => {
    expect(formatHour(15)).toBe('3 PM');
  });
});
