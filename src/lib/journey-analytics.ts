/**
 * Customer Journey Analytics Engine
 *
 * Tracks and analyzes the complete customer funnel:
 *   QR/NFC Scan → Rating → Tag Selection → Review Generation → Google Click → Published
 *
 * Also tracks the invite channel:
 *   Email/SMS Invite → Opened → Completed
 */

export interface JourneyStage {
  name: string;
  count: number;
  conversionRate: number;     // 0-100, from previous stage
  avgTimeFromPrev?: number;   // seconds from previous stage (if available)
}

export interface JourneyFunnel {
  stages: JourneyStage[];
  totalScans: number;
  totalGenerated: number;
  totalClicked: number;
  overallConversion: number;  // 0-100, scan → click
}

export interface ChannelBreakdown {
  channel: string;            // 'qr' | 'nfc' | 'link' | 'email' | 'sms'
  scans: number;
  generated: number;
  clicked: number;
  conversionRate: number;     // 0-100
}

export interface DeviceBreakdown {
  deviceType: string;
  count: number;
  conversionRate: number;
}

export interface JourneyAnalytics {
  funnel: JourneyFunnel;
  channels: ChannelBreakdown[];
  devices: DeviceBreakdown[];
  peakHours: Array<{ hour: number; count: number }>;
  inviteFunnel: {
    sent: number;
    delivered: number;
    opened: number;
    completed: number;
    deliveryRate: number;
    openRate: number;
    completionRate: number;
  };
}

/**
 * Compute journey funnel from raw event data.
 */
export function computeFunnel(
  scans: number,
  generated: number,
  clicked: number,
  published: number
): JourneyFunnel {
  const stages: JourneyStage[] = [
    {
      name: 'QR/NFC Scan',
      count: scans,
      conversionRate: 100,
    },
    {
      name: 'Review Generated',
      count: generated,
      conversionRate: scans > 0 ? Math.round((generated / scans) * 100) : 0,
    },
    {
      name: 'Clicked to Google',
      count: clicked,
      conversionRate: generated > 0 ? Math.round((clicked / generated) * 100) : 0,
    },
    {
      name: 'Published on Google',
      count: published,
      conversionRate: clicked > 0 ? Math.round((published / clicked) * 100) : 0,
    },
  ];

  return {
    stages,
    totalScans: scans,
    totalGenerated: generated,
    totalClicked: clicked,
    overallConversion: scans > 0 ? Math.round((clicked / scans) * 100) : 0,
  };
}

/**
 * Compute channel breakdown from scan events and conversions.
 */
export function computeChannelBreakdown(
  scansByChannel: Record<string, number>,
  generatedByChannel: Record<string, number>,
  clickedByChannel: Record<string, number>
): ChannelBreakdown[] {
  const channels = new Set([
    ...Object.keys(scansByChannel),
    ...Object.keys(generatedByChannel),
    ...Object.keys(clickedByChannel),
  ]);

  return Array.from(channels).map(channel => {
    const scans = scansByChannel[channel] || 0;
    const generated = generatedByChannel[channel] || 0;
    const clicked = clickedByChannel[channel] || 0;

    return {
      channel,
      scans,
      generated,
      clicked,
      conversionRate: scans > 0 ? Math.round((clicked / scans) * 100) : 0,
    };
  }).sort((a, b) => b.scans - a.scans);
}

/**
 * Compute invite funnel metrics.
 */
export function computeInviteFunnel(
  sent: number,
  delivered: number,
  opened: number,
  completed: number
): JourneyAnalytics['inviteFunnel'] {
  return {
    sent,
    delivered,
    opened,
    completed,
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    completionRate: opened > 0 ? Math.round((completed / opened) * 100) : 0,
  };
}

/**
 * Compute peak activity hours from timestamps.
 */
export function computePeakHours(timestamps: string[]): Array<{ hour: number; count: number }> {
  const hourCounts = new Array(24).fill(0);

  for (const ts of timestamps) {
    const hour = new Date(ts).getHours();
    hourCounts[hour]++;
  }

  return hourCounts.map((count, hour) => ({ hour, count }));
}

/**
 * Format hour for display.
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Compute device breakdown from scan events.
 */
export function computeDeviceBreakdown(
  scansByDevice: Record<string, number>,
  clicksByDevice: Record<string, number>
): DeviceBreakdown[] {
  const devices = new Set([
    ...Object.keys(scansByDevice),
    ...Object.keys(clicksByDevice),
  ]);

  return Array.from(devices).map(deviceType => ({
    deviceType,
    count: scansByDevice[deviceType] || 0,
    conversionRate: (scansByDevice[deviceType] || 0) > 0
      ? Math.round(((clicksByDevice[deviceType] || 0) / (scansByDevice[deviceType] || 0)) * 100)
      : 0,
  })).sort((a, b) => b.count - a.count);
}
