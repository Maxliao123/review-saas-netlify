import { describe, it, expect } from 'vitest';
import {
  DEVICE_TYPES,
  ALL_DEVICE_TYPES,
  validateDeviceInput,
  generateDeviceUrl,
  generateDeviceTrackingCode,
  calculateDeviceStats,
  getDeviceHealthStatus,
  getHealthLabel,
  groupDevicesByStore,
  filterDevices,
  getPlacementSuggestions,
  estimateHardwareROI,
  type HardwareDevice,
  type DeviceCreateInput,
} from '../lib/hardware';

// --------------- Test Helpers ---------------

function makeDevice(overrides: Partial<HardwareDevice> = {}): HardwareDevice {
  return {
    id: 'dev-001',
    tenant_id: 'tenant-abc',
    store_id: 1,
    device_type: 'qr_stand',
    name: 'Table 1 QR',
    serial_number: null,
    nfc_tag_id: null,
    location_description: 'Near entrance',
    scan_count: 50,
    last_scan_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    ...overrides,
  };
}

// --------------- DEVICE_TYPES ---------------

describe('DEVICE_TYPES', () => {
  it('should define all 5 device types', () => {
    expect(Object.keys(DEVICE_TYPES)).toHaveLength(5);
    expect(DEVICE_TYPES.nfc_stand).toBeDefined();
    expect(DEVICE_TYPES.nfc_card).toBeDefined();
    expect(DEVICE_TYPES.qr_stand).toBeDefined();
    expect(DEVICE_TYPES.table_talker).toBeDefined();
    expect(DEVICE_TYPES.counter_display).toBeDefined();
  });

  it('should have label, icon, and description for each type', () => {
    for (const type of ALL_DEVICE_TYPES) {
      expect(DEVICE_TYPES[type].label).toBeTruthy();
      expect(DEVICE_TYPES[type].icon).toBeTruthy();
      expect(DEVICE_TYPES[type].description).toBeTruthy();
    }
  });
});

// --------------- validateDeviceInput ---------------

describe('validateDeviceInput', () => {
  it('should pass for valid input', () => {
    const input: DeviceCreateInput = {
      store_id: 1,
      device_type: 'qr_stand',
      name: 'Table 1 QR',
    };
    expect(validateDeviceInput(input)).toHaveLength(0);
  });

  it('should reject missing store_id', () => {
    const errors = validateDeviceInput({ device_type: 'qr_stand', name: 'Test' });
    expect(errors.some(e => e.includes('store_id'))).toBe(true);
  });

  it('should reject invalid device_type', () => {
    const errors = validateDeviceInput({ store_id: 1, device_type: 'hologram' as any, name: 'Test' });
    expect(errors.some(e => e.includes('device_type'))).toBe(true);
  });

  it('should reject empty name', () => {
    const errors = validateDeviceInput({ store_id: 1, device_type: 'qr_stand', name: '' });
    expect(errors.some(e => e.includes('name'))).toBe(true);
  });

  it('should reject name over 100 characters', () => {
    const errors = validateDeviceInput({
      store_id: 1,
      device_type: 'qr_stand',
      name: 'x'.repeat(101),
    });
    expect(errors.some(e => e.includes('100 characters'))).toBe(true);
  });

  it('should reject serial_number over 50 characters', () => {
    const errors = validateDeviceInput({
      store_id: 1,
      device_type: 'qr_stand',
      name: 'Test',
      serial_number: 'x'.repeat(51),
    });
    expect(errors.some(e => e.includes('serial_number'))).toBe(true);
  });

  it('should reject location_description over 200 characters', () => {
    const errors = validateDeviceInput({
      store_id: 1,
      device_type: 'qr_stand',
      name: 'Test',
      location_description: 'x'.repeat(201),
    });
    expect(errors.some(e => e.includes('location_description'))).toBe(true);
  });

  it('should accept valid input with all optional fields', () => {
    const errors = validateDeviceInput({
      store_id: 1,
      device_type: 'nfc_stand',
      name: 'Counter NFC',
      serial_number: 'SN-12345',
      nfc_tag_id: 'NFC-001',
      location_description: 'Front counter',
    });
    expect(errors).toHaveLength(0);
  });
});

// --------------- generateDeviceUrl ---------------

describe('generateDeviceUrl', () => {
  it('should generate correct URL with store slug and device ID', () => {
    const url = generateDeviceUrl('https://myapp.com', 'bobs-diner', 'dev-123');
    expect(url).toBe('https://myapp.com?store=bobs-diner&device=dev-123');
  });

  it('should work with different base URLs', () => {
    const url = generateDeviceUrl('https://reviews.example.com', 'cafe-luna', 'dev-456');
    expect(url).toContain('store=cafe-luna');
    expect(url).toContain('device=dev-456');
  });
});

// --------------- generateDeviceTrackingCode ---------------

describe('generateDeviceTrackingCode', () => {
  it('should generate a 12-character uppercase hex code', () => {
    const code = generateDeviceTrackingCode('tenant-1', 1, 'nfc_stand', 'secret');
    expect(code).toHaveLength(12);
    expect(code).toMatch(/^[0-9A-F]{12}$/);
  });

  it('should generate different codes for different tenants', () => {
    const code1 = generateDeviceTrackingCode('tenant-1', 1, 'nfc_stand', 'secret');
    const code2 = generateDeviceTrackingCode('tenant-2', 1, 'nfc_stand', 'secret');
    expect(code1).not.toBe(code2);
  });
});

// --------------- calculateDeviceStats ---------------

describe('calculateDeviceStats', () => {
  it('should calculate stats for empty device list', () => {
    const stats = calculateDeviceStats([]);
    expect(stats.total_devices).toBe(0);
    expect(stats.active_devices).toBe(0);
    expect(stats.total_scans).toBe(0);
    expect(stats.top_performers).toHaveLength(0);
  });

  it('should calculate stats correctly', () => {
    const devices = [
      makeDevice({ id: 'd1', device_type: 'nfc_stand', scan_count: 100, is_active: true }),
      makeDevice({ id: 'd2', device_type: 'qr_stand', scan_count: 50, is_active: true }),
      makeDevice({ id: 'd3', device_type: 'nfc_stand', scan_count: 0, is_active: false }),
    ];
    const stats = calculateDeviceStats(devices);

    expect(stats.total_devices).toBe(3);
    expect(stats.active_devices).toBe(2);
    expect(stats.inactive_devices).toBe(1);
    expect(stats.total_scans).toBe(150);
    expect(stats.by_type.nfc_stand).toBe(2);
    expect(stats.by_type.qr_stand).toBe(1);
  });

  it('should sort top performers by scan count descending', () => {
    const devices = [
      makeDevice({ id: 'd1', scan_count: 10 }),
      makeDevice({ id: 'd2', scan_count: 100 }),
      makeDevice({ id: 'd3', scan_count: 50 }),
    ];
    const stats = calculateDeviceStats(devices);
    expect(stats.top_performers[0].id).toBe('d2');
    expect(stats.top_performers[1].id).toBe('d3');
    expect(stats.top_performers[2].id).toBe('d1');
  });

  it('should limit top performers to 5', () => {
    const devices = Array.from({ length: 10 }, (_, i) =>
      makeDevice({ id: `d${i}`, scan_count: i * 10 })
    );
    const stats = calculateDeviceStats(devices);
    expect(stats.top_performers).toHaveLength(5);
  });

  it('should include store names from storeMap', () => {
    const devices = [makeDevice({ id: 'd1', store_id: 1 })];
    const storeMap = new Map([[1, 'Bob\'s Diner']]);
    const stats = calculateDeviceStats(devices, storeMap);
    expect(stats.top_performers[0].store_name).toBe('Bob\'s Diner');
  });

  it('should sort recently active by recency', () => {
    const now = Date.now();
    const devices = [
      makeDevice({ id: 'd1', last_scan_at: new Date(now - 3600000).toISOString() }),
      makeDevice({ id: 'd2', last_scan_at: new Date(now - 60000).toISOString() }),
      makeDevice({ id: 'd3', last_scan_at: null }),
    ];
    const stats = calculateDeviceStats(devices);
    expect(stats.recently_active).toHaveLength(2);
    expect(stats.recently_active[0].id).toBe('d2'); // most recent first
  });
});

// --------------- getDeviceHealthStatus ---------------

describe('getDeviceHealthStatus', () => {
  it('should return inactive for disabled devices', () => {
    expect(getDeviceHealthStatus(makeDevice({ is_active: false }))).toBe('inactive');
  });

  it('should return never_used for devices with no scans', () => {
    expect(getDeviceHealthStatus(makeDevice({ last_scan_at: null }))).toBe('never_used');
  });

  it('should return healthy for recently scanned devices', () => {
    const device = makeDevice({ last_scan_at: new Date().toISOString() });
    expect(getDeviceHealthStatus(device)).toBe('healthy');
  });

  it('should return idle for devices not scanned in 7+ days', () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDeviceHealthStatus(makeDevice({ last_scan_at: old }))).toBe('idle');
  });

  it('should respect custom threshold', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDeviceHealthStatus(makeDevice({ last_scan_at: threeDaysAgo }), 2)).toBe('idle');
    expect(getDeviceHealthStatus(makeDevice({ last_scan_at: threeDaysAgo }), 5)).toBe('healthy');
  });
});

// --------------- getHealthLabel ---------------

describe('getHealthLabel', () => {
  it('should return green for healthy', () => {
    const label = getHealthLabel('healthy');
    expect(label.label).toBe('Active');
    expect(label.color).toContain('green');
  });

  it('should return yellow for idle', () => {
    const label = getHealthLabel('idle');
    expect(label.label).toContain('Idle');
    expect(label.color).toContain('yellow');
  });

  it('should return gray for inactive', () => {
    const label = getHealthLabel('inactive');
    expect(label.label).toBe('Disabled');
    expect(label.color).toContain('gray');
  });

  it('should return blue for never_used', () => {
    const label = getHealthLabel('never_used');
    expect(label.label).toBe('Never Used');
    expect(label.color).toContain('blue');
  });
});

// --------------- groupDevicesByStore ---------------

describe('groupDevicesByStore', () => {
  it('should group devices by store_id', () => {
    const devices = [
      makeDevice({ id: 'd1', store_id: 1 }),
      makeDevice({ id: 'd2', store_id: 2 }),
      makeDevice({ id: 'd3', store_id: 1 }),
    ];
    const grouped = groupDevicesByStore(devices);
    expect(grouped.get(1)).toHaveLength(2);
    expect(grouped.get(2)).toHaveLength(1);
  });

  it('should handle empty list', () => {
    const grouped = groupDevicesByStore([]);
    expect(grouped.size).toBe(0);
  });
});

// --------------- filterDevices ---------------

describe('filterDevices', () => {
  const devices = [
    makeDevice({ id: 'd1', store_id: 1, device_type: 'nfc_stand', is_active: true, scan_count: 10, name: 'Counter NFC' }),
    makeDevice({ id: 'd2', store_id: 1, device_type: 'qr_stand', is_active: false, scan_count: 0, name: 'Table QR' }),
    makeDevice({ id: 'd3', store_id: 2, device_type: 'table_talker', is_active: true, scan_count: 5, name: 'Patio Talker' }),
  ];

  it('should filter by store_id', () => {
    const result = filterDevices(devices, { store_id: 1 });
    expect(result).toHaveLength(2);
  });

  it('should filter by device_type', () => {
    const result = filterDevices(devices, { device_type: 'nfc_stand' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d1');
  });

  it('should filter by is_active', () => {
    const result = filterDevices(devices, { is_active: true });
    expect(result).toHaveLength(2);
  });

  it('should filter by has_scans true', () => {
    const result = filterDevices(devices, { has_scans: true });
    expect(result).toHaveLength(2);
  });

  it('should filter by has_scans false', () => {
    const result = filterDevices(devices, { has_scans: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d2');
  });

  it('should filter by search text', () => {
    const result = filterDevices(devices, { search: 'patio' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d3');
  });

  it('should combine multiple filters', () => {
    const result = filterDevices(devices, { store_id: 1, is_active: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d1');
  });

  it('should return all if no filters', () => {
    expect(filterDevices(devices, {})).toHaveLength(3);
  });
});

// --------------- getPlacementSuggestions ---------------

describe('getPlacementSuggestions', () => {
  it('should return suggestions for restaurant NFC stand', () => {
    const suggestions = getPlacementSuggestions('nfc_stand', 'restaurant');
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions.some(s => s.toLowerCase().includes('counter'))).toBe(true);
  });

  it('should return suggestions for hotel QR stand', () => {
    const suggestions = getPlacementSuggestions('qr_stand', 'hotel');
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('should fall back to default for unknown vertical', () => {
    const suggestions = getPlacementSuggestions('table_talker', 'car_wash');
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('should have suggestions for all device types', () => {
    for (const type of ALL_DEVICE_TYPES) {
      const suggestions = getPlacementSuggestions(type);
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// --------------- estimateHardwareROI ---------------

describe('estimateHardwareROI', () => {
  it('should calculate ROI from device scans', () => {
    const devices = [
      makeDevice({ scan_count: 100 }),
      makeDevice({ scan_count: 200 }),
    ];
    const roi = estimateHardwareROI(devices);
    expect(roi.totalScans).toBe(300);
    expect(roi.estimatedReviews).toBe(45); // 300 * 0.15
    expect(roi.estimatedConversionRate).toBe('15%');
    expect(roi.monthlyProjection).toBeGreaterThan(0);
  });

  it('should handle zero scans', () => {
    const devices = [makeDevice({ scan_count: 0 })];
    const roi = estimateHardwareROI(devices);
    expect(roi.totalScans).toBe(0);
    expect(roi.estimatedReviews).toBe(0);
  });

  it('should format annual value as dollar amount', () => {
    const devices = [makeDevice({ scan_count: 1000 })];
    const roi = estimateHardwareROI(devices);
    expect(roi.annualValue).toMatch(/^\$/);
  });
});
