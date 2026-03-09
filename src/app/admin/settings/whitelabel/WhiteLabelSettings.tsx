'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_CONFIG, type WhiteLabelConfig } from '@/lib/whitelabel';

export default function WhiteLabelSettings() {
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/whitelabel')
      .then(r => r.json())
      .then(data => {
        if (data.config) {
          setConfig({
            brandName: data.config.brand_name || DEFAULT_CONFIG.brandName,
            logoUrl: data.config.logo_url,
            faviconUrl: data.config.favicon_url,
            primaryColor: data.config.primary_color || DEFAULT_CONFIG.primaryColor,
            secondaryColor: data.config.secondary_color || DEFAULT_CONFIG.secondaryColor,
            accentColor: data.config.accent_color || DEFAULT_CONFIG.accentColor,
            customDomain: data.config.custom_domain,
            customDomainVerified: data.config.custom_domain_verified || false,
            hidePoweredBy: data.config.hide_powered_by || false,
            customEmailFrom: data.config.custom_email_from,
            customEmailName: data.config.custom_email_name,
            cssOverrides: data.config.css_overrides,
            isActive: data.config.is_active || false,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/admin/whitelabel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-gray-400">Loading white-label settings...</div>;

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">Enable White Label</h3>
            <p className="text-xs text-gray-400 mt-1">Apply custom branding across all customer-facing pages</p>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, isActive: !prev.isActive }))}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${
              config.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {config.isActive ? '✓ Active' : 'Inactive'}
          </button>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-bold text-gray-800">Brand Identity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
            <input
              type="text"
              value={config.brandName}
              onChange={e => setConfig(prev => ({ ...prev, brandName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
            <input
              type="url"
              value={config.logoUrl || ''}
              onChange={e => setConfig(prev => ({ ...prev, logoUrl: e.target.value || null }))}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.hidePoweredBy}
            onChange={e => setConfig(prev => ({ ...prev, hidePoweredBy: e.target.checked }))}
          />
          <span className="text-sm text-gray-600">Hide &quot;Powered by Reputation Monitor&quot; badge</span>
        </div>
      </div>

      {/* Colors */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-bold text-gray-800">Colors</h3>
        <div className="grid grid-cols-3 gap-4">
          {(['primaryColor', 'secondaryColor', 'accentColor'] as const).map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                {field.replace('Color', '')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config[field]}
                  onChange={e => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={config[field]}
                  onChange={e => setConfig(prev => ({ ...prev, [field]: e.target.value }))}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          ))}
        </div>
        {/* Preview */}
        <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: config.primaryColor }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: config.primaryColor }} />
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: config.secondaryColor }} />
            <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: config.accentColor }} />
          </div>
          <button className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: config.primaryColor }}>
            Preview Button
          </button>
        </div>
      </div>

      {/* Custom Domain */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-bold text-gray-800">Custom Domain</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
          <input
            type="text"
            value={config.customDomain || ''}
            onChange={e => setConfig(prev => ({ ...prev, customDomain: e.target.value || null }))}
            placeholder="reviews.yourbrand.com"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        {config.customDomain && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-medium mb-1">DNS Setup Required:</p>
            <p className="font-mono">CNAME {config.customDomain} → tenant-*.reputation-monitor.app</p>
          </div>
        )}
      </div>

      {/* Email Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-bold text-gray-800">Email Identity</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input
              type="email"
              value={config.customEmailFrom || ''}
              onChange={e => setConfig(prev => ({ ...prev, customEmailFrom: e.target.value || null }))}
              placeholder="noreply@yourbrand.com"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input
              type="text"
              value={config.customEmailName || ''}
              onChange={e => setConfig(prev => ({ ...prev, customEmailName: e.target.value || null }))}
              placeholder="Your Brand"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
