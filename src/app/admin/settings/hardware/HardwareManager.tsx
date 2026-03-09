'use client';

import { useState, useEffect } from 'react';
import {
  DEVICE_TYPES,
  ALL_DEVICE_TYPES,
  getDeviceHealthStatus,
  getHealthLabel,
  calculateDeviceStats,
  getPlacementSuggestions,
  estimateHardwareROI,
  type HardwareDevice,
  type DeviceType,
} from '@/lib/hardware';

type ViewMode = 'grid' | 'list';

export default function HardwareManager() {
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<DeviceType | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<HardwareDevice | null>(null);

  // New device form state
  const [newDevice, setNewDevice] = useState({
    store_id: 0,
    device_type: 'qr_stand' as DeviceType,
    name: '',
    serial_number: '',
    nfc_tag_id: '',
    location_description: '',
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    try {
      const res = await fetch('/api/admin/hardware');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch {
      console.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }

  const filteredDevices = filterType === 'all'
    ? devices
    : devices.filter(d => d.device_type === filterType);

  const stats = calculateDeviceStats(devices);
  const roi = devices.length > 0 ? estimateHardwareROI(devices) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading devices...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Devices" value={stats.total_devices} />
        <StatCard label="Active" value={stats.active_devices} color="green" />
        <StatCard label="Total Scans" value={stats.total_scans.toLocaleString()} color="blue" />
        <StatCard
          label="Est. Reviews Generated"
          value={roi ? roi.estimatedReviews.toString() : '0'}
          color="purple"
        />
      </div>

      {/* Device Type Breakdown */}
      {stats.total_devices > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Device Types Deployed</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ALL_DEVICE_TYPES.map(type => (
              <div
                key={type}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-xl">{DEVICE_TYPES[type].icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {stats.by_type[type]}
                  </div>
                  <div className="text-xs text-gray-500">{DEVICE_TYPES[type].label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROI Estimation */}
      {roi && roi.totalScans > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">Estimated Hardware ROI</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-900">{roi.totalScans}</div>
              <div className="text-xs text-blue-600">Total Scans</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">{roi.estimatedConversionRate}</div>
              <div className="text-xs text-blue-600">Scan → Review Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">{roi.monthlyProjection}</div>
              <div className="text-xs text-blue-600">Reviews / Month (est.)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{roi.annualValue}</div>
              <div className="text-xs text-green-600">Est. Annual Value</div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as DeviceType | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {ALL_DEVICE_TYPES.map(type => (
              <option key={type} value={type}>{DEVICE_TYPES[type].label}</option>
            ))}
          </select>

          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-xs ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
            >
              List
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Device
        </button>
      </div>

      {/* Add Device Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Register New Device</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
              <select
                value={newDevice.device_type}
                onChange={e => setNewDevice({ ...newDevice, device_type: e.target.value as DeviceType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {ALL_DEVICE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {DEVICE_TYPES[type].icon} {DEVICE_TYPES[type].label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {DEVICE_TYPES[newDevice.device_type].description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
              <input
                type="text"
                placeholder="e.g. Table 5 NFC, Front Counter QR"
                value={newDevice.name}
                onChange={e => setNewDevice({ ...newDevice, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SN-2024-001"
                value={newDevice.serial_number}
                onChange={e => setNewDevice({ ...newDevice, serial_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            {(newDevice.device_type === 'nfc_stand' || newDevice.device_type === 'nfc_card') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NFC Tag UID <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 04:A2:B3:C4:D5:E6:F7"
                  value={newDevice.nfc_tag_id}
                  onChange={e => setNewDevice({ ...newDevice, nfc_tag_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Description <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Near entrance, Table 5, Checkout counter"
                value={newDevice.location_description}
                onChange={e => setNewDevice({ ...newDevice, location_description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Placement Suggestions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">
              Placement Suggestions for {DEVICE_TYPES[newDevice.device_type].label}
            </h4>
            <ul className="space-y-1">
              {getPlacementSuggestions(newDevice.device_type).map((s, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">&#x2022;</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/hardware', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newDevice),
                  });
                  if (res.ok) {
                    setShowAddForm(false);
                    setNewDevice({ store_id: 0, device_type: 'qr_stand', name: '', serial_number: '', nfc_tag_id: '', location_description: '' });
                    fetchDevices();
                  }
                } catch {
                  console.error('Failed to add device');
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Register Device
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Device Grid / List */}
      {filteredDevices.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📱</div>
          <p className="text-lg">No devices registered yet</p>
          <p className="text-sm mt-1">
            Click &quot;Add Device&quot; to register your first NFC stand, QR display, or table talker.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onSelect={() => setSelectedDevice(device)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Device</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Scans</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDevices.map(device => {
                const health = getDeviceHealthStatus(device);
                const healthLabel = getHealthLabel(health);
                return (
                  <tr
                    key={device.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedDevice(device)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{device.name}</div>
                      {device.serial_number && (
                        <div className="text-xs text-gray-400">{device.serial_number}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="mr-1">{DEVICE_TYPES[device.device_type].icon}</span>
                      {DEVICE_TYPES[device.device_type].label}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {device.location_description || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-800">
                      {device.scan_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${healthLabel.bgColor} ${healthLabel.color}`}>
                        {healthLabel.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Performers */}
      {stats.top_performers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Performing Devices</h3>
          <div className="space-y-3">
            {stats.top_performers.map((perf, i) => (
              <div key={perf.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <span className="text-lg">{DEVICE_TYPES[perf.device_type].icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{perf.name}</div>
                  {perf.store_name && (
                    <div className="text-xs text-gray-400">{perf.store_name}</div>
                  )}
                </div>
                <div className="text-sm font-mono text-gray-700">
                  {perf.scan_count.toLocaleString()} scans
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Detail Modal */}
      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onRefresh={fetchDevices}
        />
      )}
    </div>
  );
}

// --------------- Sub-components ---------------

function StatCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: string | number;
  color?: 'gray' | 'green' | 'blue' | 'purple';
}) {
  const colorMap = {
    gray: 'text-gray-900',
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function DeviceCard({
  device,
  onSelect,
}: {
  device: HardwareDevice;
  onSelect: () => void;
}) {
  const health = getDeviceHealthStatus(device);
  const healthLabel = getHealthLabel(health);

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{DEVICE_TYPES[device.device_type].icon}</span>
          <div>
            <div className="font-semibold text-gray-800">{device.name}</div>
            <div className="text-xs text-gray-400">{DEVICE_TYPES[device.device_type].label}</div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${healthLabel.bgColor} ${healthLabel.color}`}>
          {healthLabel.label}
        </span>
      </div>

      {device.location_description && (
        <div className="text-sm text-gray-500 mb-3">{device.location_description}</div>
      )}

      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="font-mono font-bold text-gray-800">{device.scan_count.toLocaleString()}</span>
          <span className="text-gray-400 ml-1">scans</span>
        </div>
        {device.last_scan_at && (
          <div className="text-xs text-gray-400">
            Last: {new Date(device.last_scan_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

function DeviceDetailModal({
  device,
  onClose,
  onRefresh,
}: {
  device: HardwareDevice;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const health = getDeviceHealthStatus(device);
  const healthLabel = getHealthLabel(health);
  const suggestions = getPlacementSuggestions(device.device_type);

  async function toggleActive() {
    try {
      await fetch(`/api/admin/hardware/${device.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !device.is_active }),
      });
      onRefresh();
      onClose();
    } catch {
      console.error('Failed to update device');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{DEVICE_TYPES[device.device_type].icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{device.name}</h2>
              <p className="text-sm text-gray-500">{DEVICE_TYPES[device.device_type].label}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500 text-xs">Status</div>
            <span className={`font-medium ${healthLabel.color}`}>{healthLabel.label}</span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500 text-xs">Total Scans</div>
            <div className="font-bold text-gray-800">{device.scan_count.toLocaleString()}</div>
          </div>
          {device.serial_number && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Serial Number</div>
              <div className="font-mono text-gray-800">{device.serial_number}</div>
            </div>
          )}
          {device.nfc_tag_id && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">NFC Tag UID</div>
              <div className="font-mono text-gray-800">{device.nfc_tag_id}</div>
            </div>
          )}
          {device.location_description && (
            <div className="bg-gray-50 rounded-lg p-3 col-span-2">
              <div className="text-gray-500 text-xs">Location</div>
              <div className="text-gray-800">{device.location_description}</div>
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-500 text-xs">Registered</div>
            <div className="text-gray-800">{new Date(device.created_at).toLocaleDateString()}</div>
          </div>
          {device.last_scan_at && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Last Scan</div>
              <div className="text-gray-800">{new Date(device.last_scan_at).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        {/* Placement Tips */}
        {suggestions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">Placement Tips</h4>
            <ul className="space-y-1">
              {suggestions.map((s, i) => (
                <li key={i} className="text-sm text-amber-700">&#x2022; {s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={toggleActive}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              device.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {device.is_active ? 'Disable Device' : 'Enable Device'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
