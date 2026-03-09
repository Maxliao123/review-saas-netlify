/**
 * Hardware Device Management — NFC stands, QR stands, table talkers, counter displays
 *
 * Manages physical review collection devices deployed at store locations.
 * Tracks scans, generates QR codes, and provides analytics per device.
 */

import { createHmac } from 'crypto';

// --------------- Types ---------------

export type DeviceType = 'nfc_stand' | 'nfc_card' | 'qr_stand' | 'table_talker' | 'counter_display';

export interface HardwareDevice {
  id: string;
  tenant_id: string;
  store_id: number;
  device_type: DeviceType;
  name: string;
  serial_number?: string | null;
  nfc_tag_id?: string | null;
  location_description?: string | null;
  scan_count: number;
  last_scan_at?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DeviceCreateInput {
  store_id: number;
  device_type: DeviceType;
  name: string;
  serial_number?: string;
  nfc_tag_id?: string;
  location_description?: string;
}

export interface DeviceStats {
  total_devices: number;
  active_devices: number;
  inactive_devices: number;
  total_scans: number;
  by_type: Record<DeviceType, number>;
  top_performers: Array<{
    id: string;
    name: string;
    device_type: DeviceType;
    scan_count: number;
    store_name?: string;
  }>;
  recently_active: Array<{
    id: string;
    name: string;
    last_scan_at: string;
    scan_count: number;
  }>;
}

// --------------- Constants ---------------

export const DEVICE_TYPES: Record<DeviceType, { label: string; icon: string; description: string }> = {
  nfc_stand: {
    label: 'NFC Stand',
    icon: '📱',
    description: 'Countertop NFC stand — customers tap phone to leave a review',
  },
  nfc_card: {
    label: 'NFC Card',
    icon: '💳',
    description: 'Portable NFC card — hand to customers or leave on table',
  },
  qr_stand: {
    label: 'QR Stand',
    icon: '📐',
    description: 'Acrylic QR code stand — placed on counter or table',
  },
  table_talker: {
    label: 'Table Talker',
    icon: '🪧',
    description: 'Tent-style table card — placed on each table with QR code',
  },
  counter_display: {
    label: 'Counter Display',
    icon: '🖥️',
    description: 'Digital display at checkout — shows QR code or NFC tap prompt',
  },
};

export const ALL_DEVICE_TYPES: DeviceType[] = [
  'nfc_stand',
  'nfc_card',
  'qr_stand',
  'table_talker',
  'counter_display',
];

// --------------- Validation ---------------

/**
 * Validates a device creation input.
 * Returns an array of error messages (empty = valid).
 */
export function validateDeviceInput(input: Partial<DeviceCreateInput>): string[] {
  const errors: string[] = [];

  if (!input.store_id || typeof input.store_id !== 'number' || input.store_id <= 0) {
    errors.push('store_id is required and must be a positive number');
  }

  if (!input.device_type || !ALL_DEVICE_TYPES.includes(input.device_type)) {
    errors.push(`device_type must be one of: ${ALL_DEVICE_TYPES.join(', ')}`);
  }

  if (!input.name || input.name.trim().length === 0) {
    errors.push('name is required');
  }

  if (input.name && input.name.length > 100) {
    errors.push('name must be 100 characters or less');
  }

  if (input.serial_number && input.serial_number.length > 50) {
    errors.push('serial_number must be 50 characters or less');
  }

  if (input.nfc_tag_id && input.nfc_tag_id.length > 50) {
    errors.push('nfc_tag_id must be 50 characters or less');
  }

  if (input.location_description && input.location_description.length > 200) {
    errors.push('location_description must be 200 characters or less');
  }

  // NFC devices should have NFC tag ID
  if (input.device_type && (input.device_type === 'nfc_stand' || input.device_type === 'nfc_card')) {
    if (!input.nfc_tag_id || input.nfc_tag_id.trim().length === 0) {
      // Warning, not error — NFC tag can be added later
    }
  }

  return errors;
}

// --------------- QR Code URL Generation ---------------

/**
 * Generates the review page URL for a device.
 * This URL is what gets encoded in QR codes or NFC tags.
 */
export function generateDeviceUrl(
  baseUrl: string,
  storeSlug: string,
  deviceId: string
): string {
  return `${baseUrl}?store=${storeSlug}&device=${deviceId}`;
}

/**
 * Generates a unique device tracking code from tenant + device info.
 * Used to link scans back to specific hardware.
 */
export function generateDeviceTrackingCode(
  tenantId: string,
  storeId: number,
  deviceType: DeviceType,
  secret: string
): string {
  const input = `${tenantId}:${storeId}:${deviceType}:${Date.now()}`;
  return createHmac('sha256', secret).update(input).digest('hex').slice(0, 12).toUpperCase();
}

// --------------- Stats Calculation ---------------

/**
 * Calculates summary statistics from a list of devices.
 */
export function calculateDeviceStats(
  devices: HardwareDevice[],
  storeMap?: Map<number, string>
): DeviceStats {
  const byType: Record<DeviceType, number> = {
    nfc_stand: 0,
    nfc_card: 0,
    qr_stand: 0,
    table_talker: 0,
    counter_display: 0,
  };

  let totalScans = 0;
  let activeCount = 0;
  let inactiveCount = 0;

  for (const device of devices) {
    byType[device.device_type] = (byType[device.device_type] || 0) + 1;
    totalScans += device.scan_count;
    if (device.is_active) activeCount++;
    else inactiveCount++;
  }

  // Top performers by scan count
  const topPerformers = [...devices]
    .sort((a, b) => b.scan_count - a.scan_count)
    .slice(0, 5)
    .map(d => ({
      id: d.id,
      name: d.name,
      device_type: d.device_type,
      scan_count: d.scan_count,
      store_name: storeMap?.get(d.store_id),
    }));

  // Recently active (have last_scan_at, sorted by recency)
  const recentlyActive = devices
    .filter(d => d.last_scan_at)
    .sort((a, b) => new Date(b.last_scan_at!).getTime() - new Date(a.last_scan_at!).getTime())
    .slice(0, 5)
    .map(d => ({
      id: d.id,
      name: d.name,
      last_scan_at: d.last_scan_at!,
      scan_count: d.scan_count,
    }));

  return {
    total_devices: devices.length,
    active_devices: activeCount,
    inactive_devices: inactiveCount,
    total_scans: totalScans,
    by_type: byType,
    top_performers: topPerformers,
    recently_active: recentlyActive,
  };
}

// --------------- Device Health ---------------

/**
 * Checks if a device might need attention (no scans in X days).
 */
export function getDeviceHealthStatus(
  device: HardwareDevice,
  daysThreshold: number = 7
): 'healthy' | 'idle' | 'inactive' | 'never_used' {
  if (!device.is_active) return 'inactive';
  if (!device.last_scan_at) return 'never_used';

  const daysSinceScan = (Date.now() - new Date(device.last_scan_at).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceScan <= daysThreshold) return 'healthy';
  return 'idle';
}

/**
 * Returns a human-readable label + color for device health.
 */
export function getHealthLabel(status: ReturnType<typeof getDeviceHealthStatus>): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'healthy':
      return { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100' };
    case 'idle':
      return { label: 'Idle (7+ days)', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
    case 'inactive':
      return { label: 'Disabled', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    case 'never_used':
      return { label: 'Never Used', color: 'text-blue-700', bgColor: 'bg-blue-100' };
  }
}

// --------------- Batch Operations ---------------

/**
 * Groups devices by store for display.
 */
export function groupDevicesByStore(
  devices: HardwareDevice[]
): Map<number, HardwareDevice[]> {
  const map = new Map<number, HardwareDevice[]>();
  for (const device of devices) {
    const list = map.get(device.store_id) || [];
    list.push(device);
    map.set(device.store_id, list);
  }
  return map;
}

/**
 * Filters devices by various criteria.
 */
export function filterDevices(
  devices: HardwareDevice[],
  filters: {
    store_id?: number;
    device_type?: DeviceType;
    is_active?: boolean;
    has_scans?: boolean;
    search?: string;
  }
): HardwareDevice[] {
  return devices.filter(d => {
    if (filters.store_id !== undefined && d.store_id !== filters.store_id) return false;
    if (filters.device_type && d.device_type !== filters.device_type) return false;
    if (filters.is_active !== undefined && d.is_active !== filters.is_active) return false;
    if (filters.has_scans === true && d.scan_count === 0) return false;
    if (filters.has_scans === false && d.scan_count > 0) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        (d.serial_number || '').toLowerCase().includes(q) ||
        (d.nfc_tag_id || '').toLowerCase().includes(q) ||
        (d.location_description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });
}

// --------------- Placement Suggestions ---------------

/**
 * Suggests optimal device placement based on device type and store vertical.
 */
export function getPlacementSuggestions(
  deviceType: DeviceType,
  vertical: string = 'restaurant'
): string[] {
  const suggestions: Record<DeviceType, Record<string, string[]>> = {
    nfc_stand: {
      restaurant: [
        'Front counter — near the register for checkout tap',
        'Host stand — customers tap while waiting',
        'Bar area — casual environment encourages reviews',
      ],
      hotel: [
        'Front desk — checkout experience review',
        'Concierge station — after service interaction',
        'Lobby lounge — relaxed environment for review',
      ],
      default: [
        'Reception/checkout counter — high traffic point',
        'Waiting area — customers have time to review',
        'Service desk — after interaction completion',
      ],
    },
    nfc_card: {
      restaurant: [
        'Given by server with the check',
        'Included with takeout bags',
        'Handed out at catering events',
      ],
      hotel: [
        'Placed in room welcome packet',
        'Given at checkout with folio',
        'Handed out at special events',
      ],
      default: [
        'Given at point of service completion',
        'Included with receipts or bags',
        'Distributed at events or pop-ups',
      ],
    },
    qr_stand: {
      restaurant: [
        'Each dining table — visible but not intrusive',
        'Restroom area — captive audience',
        'Entrance/exit — catch them coming or going',
      ],
      hotel: [
        'In-room bedside table',
        'Restaurant/bar tables',
        'Elevator lobby — high dwell time',
      ],
      default: [
        'Service area tables or counters',
        'Waiting room — captive audience',
        'Near exits — final impression point',
      ],
    },
    table_talker: {
      restaurant: [
        'Center of each table — maximum visibility',
        'Bar top — near drink napkins',
        'Patio tables — outdoor dining',
      ],
      hotel: [
        'In-room desk area',
        'Restaurant tables',
        'Pool/spa area loungers',
      ],
      default: [
        'On every service table',
        'Waiting area side tables',
        'Common area coffee tables',
      ],
    },
    counter_display: {
      restaurant: [
        'Above POS terminal — visible during payment',
        'Drive-through window — QR code on screen',
        'Self-service kiosk area',
      ],
      hotel: [
        'Front desk digital signage',
        'Elevator digital display',
        'Business center screens',
      ],
      default: [
        'Next to the register or checkout point',
        'Digital signage in waiting areas',
        'Self-service terminal screens',
      ],
    },
  };

  const typeSuggestions = suggestions[deviceType];
  return typeSuggestions[vertical] || typeSuggestions['default'] || [];
}

// --------------- ROI Estimation ---------------

/**
 * Estimates the ROI impact of hardware devices based on scan data.
 */
export function estimateHardwareROI(devices: HardwareDevice[]): {
  totalScans: number;
  estimatedReviews: number;
  estimatedConversionRate: string;
  monthlyProjection: number;
  annualValue: string;
} {
  const totalScans = devices.reduce((sum, d) => sum + d.scan_count, 0);

  // Industry average: ~15% of scans convert to posted reviews
  const conversionRate = 0.15;
  const estimatedReviews = Math.round(totalScans * conversionRate);

  // Average Google review value to a local business: ~$20-50
  const avgReviewValue = 35;

  // Project monthly based on data age (rough estimate)
  const oldestDevice = devices.reduce((oldest, d) => {
    const created = new Date(d.created_at).getTime();
    return created < oldest ? created : oldest;
  }, Date.now());

  const monthsActive = Math.max(1, (Date.now() - oldestDevice) / (1000 * 60 * 60 * 24 * 30));
  const monthlyScans = Math.round(totalScans / monthsActive);
  const monthlyReviews = Math.round(monthlyScans * conversionRate);
  const annualValue = monthlyReviews * 12 * avgReviewValue;

  return {
    totalScans,
    estimatedReviews,
    estimatedConversionRate: `${(conversionRate * 100).toFixed(0)}%`,
    monthlyProjection: monthlyReviews,
    annualValue: `$${annualValue.toLocaleString()}`,
  };
}
