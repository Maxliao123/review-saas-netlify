'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Building2, MapPin, Settings, Bell, QrCode, Rocket,
  ArrowRight, ArrowLeft, Check, ExternalLink,
} from 'lucide-react';

const STEPS = [
  { icon: Building2, title: 'Business Info', desc: 'Tell us about your business' },
  { icon: MapPin, title: 'Google Business', desc: 'Connect your Google profile' },
  { icon: Settings, title: 'Store Settings', desc: 'Configure your store' },
  { icon: Bell, title: 'Notifications', desc: 'Set up alert channels' },
  { icon: QrCode, title: 'QR & NFC', desc: 'Generate your codes' },
  { icon: Rocket, title: 'Launch', desc: 'Test and go live' },
];

const FACILITIES = [
  { key: 'can_dine_in', label: 'Dine-in' },
  { key: 'can_takeout', label: 'Takeout' },
  { key: 'has_restroom', label: 'Restroom' },
  { key: 'has_sauce_bar', label: 'Sauce Bar' },
  { key: 'has_parking', label: 'Parking' },
  { key: 'has_free_dessert', label: 'Free Dessert' },
  { key: 'has_happy_hour', label: 'Happy Hour' },
];

export default function OnboardingWizard({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [language, setLanguage] = useState('en');
  const [placeId, setPlaceId] = useState('');
  const [facilities, setFacilities] = useState<Record<string, boolean>>({});
  const [supportEmail, setSupportEmail] = useState(userEmail);
  const [notifEmail, setNotifEmail] = useState(userEmail);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async function handleCreateBusiness() {
    setLoading(true);
    try {
      // Create tenant
      const { data: tenant, error: tErr } = await supabase
        .from('tenants')
        .insert({
          name: businessName,
          slug: slug || generateSlug(businessName),
          owner_id: userId,
        })
        .select()
        .single();

      if (tErr) throw tErr;
      setTenantId(tenant.id);

      // Create tenant_member (owner)
      await supabase.from('tenant_members').insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      });

      // Create store
      const { data: store, error: sErr } = await supabase
        .from('stores')
        .insert({
          name: businessName,
          slug: slug || generateSlug(businessName),
          tenant_id: tenant.id,
          place_id: placeId || null,
        })
        .select()
        .single();

      if (sErr) throw sErr;
      setStoreId(store.id);

      setStep(2); // Skip Google step for now, go to settings
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  async function handleSaveSettings() {
    if (!storeId) return;
    setLoading(true);
    try {
      await supabase.from('stores').update({
        support_email: supportEmail,
        ...facilities,
      }).eq('id', storeId);

      setStep(3);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  async function handleSaveNotifications() {
    if (!storeId) return;
    setLoading(true);
    try {
      if (notifEmail) {
        await supabase.from('notification_channels').upsert({
          store_id: storeId,
          channel_type: 'email',
          is_active: true,
          config: { recipients: [notifEmail] },
        }, { onConflict: 'store_id,channel_type' });
      }
      setStep(4);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  function handleComplete() {
    router.push('/admin/reviews');
  }

  const domain = typeof window !== 'undefined' ? window.location.origin : '';
  const storeUrl = `${domain}/?store=${slug || generateSlug(businessName)}&src=qr`;

  return (
    <div className="w-full max-w-lg">
      {/* Progress Bar */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex-1 flex items-center">
            <div className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>

      {/* Step Header */}
      <div className="text-center mb-8">
        {(() => { const Icon = STEPS[step].icon; return <Icon className="w-10 h-10 mx-auto text-blue-600 mb-3" />; })()}
        <h2 className="text-xl font-bold text-gray-900">{STEPS[step].title}</h2>
        <p className="text-gray-500 text-sm mt-1">{STEPS[step].desc}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* Step 0: Business Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                value={businessName}
                onChange={(e) => { setBusinessName(e.target.value); setSlug(generateSlug(e.target.value)); }}
                placeholder="Your Restaurant Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              >
                <option value="en">English</option>
                <option value="zh">繁體中文</option>
                <option value="ko">한국어</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <button
              onClick={() => setStep(1)}
              disabled={!businessName}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Google Business Link */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Place ID (optional)</label>
              <input
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="ChIJ... (from Google Maps)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
              <p className="text-xs text-gray-400 mt-1">
                You can find your Place ID on Google Maps or connect Google Business later in Settings.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-4 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleCreateBusiness}
                disabled={loading || !businessName}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating...' : 'Create Business'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Store Settings */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Facilities</label>
              <div className="grid grid-cols-2 gap-2">
                {FACILITIES.map(f => (
                  <label key={f.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!facilities[f.key]}
                      onChange={(e) => setFacilities(prev => ({ ...prev, [f.key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Saving...' : 'Next'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Notifications */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              We will set up email notifications for now. You can add LINE, Slack, and WhatsApp later in Settings.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notification Email</label>
              <input
                value={notifEmail}
                onChange={(e) => setNotifEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              />
            </div>
            <button
              onClick={handleSaveNotifications}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Saving...' : 'Next'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 4: QR & NFC */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-3">Your store URL:</p>
              <code className="text-xs bg-white px-3 py-2 rounded-lg border block break-all">
                {storeUrl}
              </code>
              <p className="text-xs text-gray-400 mt-3">
                Print this QR code and place it at your store. For NFC tags, write this URL with <code>?src=nfc</code>.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                QR code generation will be available in the store dashboard. For now, use any QR generator with the URL above.
              </p>
            </div>
            <button
              onClick={() => setStep(5)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 5: Launch */}
        {step === 5 && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">You are all set!</h3>
            <p className="text-sm text-gray-600">
              Your reputation monitoring system is ready. You can now:
            </p>
            <ul className="text-sm text-left space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Manage and reply to Google reviews
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Receive instant notifications for new reviews
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Track QR/NFC scan analytics
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Get weekly operation reports
              </li>
            </ul>
            <button
              onClick={handleComplete}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              Go to Dashboard <Rocket className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <p className="text-center text-xs text-gray-400 mt-4">
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  );
}
