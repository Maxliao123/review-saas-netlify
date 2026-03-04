'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2, MapPin, Store, Settings, Bell, QrCode, Rocket,
  ArrowRight, ArrowLeft, Check, Loader2,
} from 'lucide-react';

const STEPS = [
  { icon: Building2, title: 'Organization', desc: 'Name your business' },
  { icon: MapPin, title: 'Connect Google', desc: 'Link your Google Business Profile' },
  { icon: Store, title: 'Select Locations', desc: 'Choose stores to manage' },
  { icon: Settings, title: 'Store Settings', desc: 'Configure your stores' },
  { icon: Bell, title: 'Notifications', desc: 'Set up alert channels' },
  { icon: QrCode, title: 'QR & NFC', desc: 'Generate your codes' },
  { icon: Rocket, title: 'Launch', desc: 'Go live' },
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

interface GoogleLocation {
  name: string;
  title: string;
  placeId: string;
  address: string;
}

export default function OnboardingWizard({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  // State
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [language, setLanguage] = useState('en');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  // Locations
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [fetchingLocations, setFetchingLocations] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Stores created
  const [createdStores, setCreatedStores] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [selectedStoreIndex, setSelectedStoreIndex] = useState(0);

  // Store settings
  const [facilities, setFacilities] = useState<Record<string, boolean>>({});
  const [supportEmail, setSupportEmail] = useState(userEmail);
  const [notifEmail, setNotifEmail] = useState(userEmail);

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // On mount: check if returning from OAuth or if user already has a tenant
  useEffect(() => {
    async function init() {
      // Check if user already has a tenant (page refresh / returning user)
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('tenant_id, role, tenants(id, name, slug)')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .single();

      if (membership?.tenant_id) {
        setTenantId(membership.tenant_id);
        const tenant = membership.tenants as any;
        if (tenant) {
          setBusinessName(tenant.name || '');
          setSlug(tenant.slug || '');
        }
      }

      // Check if returning from Google OAuth
      if (searchParams.get('google_connected') === 'true') {
        setGoogleConnected(true);
        setGoogleEmail(searchParams.get('email') || '');

        // Restore tenant from localStorage if needed
        const savedTenantId = localStorage.getItem('onboarding_tenant_id');
        if (savedTenantId && !membership?.tenant_id) {
          setTenantId(savedTenantId);
        }

        // Auto-advance to location selection
        setStep(2);
        fetchLocations();
      } else if (searchParams.get('error')) {
        // OAuth error — stay on step 1
        if (membership?.tenant_id) {
          setStep(1);
        }
      } else if (membership?.tenant_id) {
        // User has tenant but hasn't connected Google yet
        // Check if Google is already connected
        const { data: creds } = await supabase
          .from('google_credentials')
          .select('google_email')
          .eq('tenant_id', membership.tenant_id)
          .single();

        if (creds) {
          setGoogleConnected(true);
          setGoogleEmail(creds.google_email || '');
          // Check if stores already exist
          const { data: existingStores } = await supabase
            .from('stores')
            .select('id, name, slug')
            .eq('tenant_id', membership.tenant_id);

          if (existingStores && existingStores.length > 0) {
            setCreatedStores(existingStores);
            setStep(3); // Go to store settings
          } else {
            setStep(2); // Go to location selection
            fetchLocations();
          }
        } else {
          setStep(1); // Go to Google connection
        }
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLocations() {
    setFetchingLocations(true);
    setLocationError('');
    try {
      const res = await fetch('/api/admin/google-locations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch locations');
      setLocations(data.locations || []);
      // Auto-select all locations
      const allIds = new Set<string>((data.locations || []).map((l: GoogleLocation) => l.placeId));
      setSelectedPlaceIds(allIds);
    } catch (err: any) {
      setLocationError(err.message);
    }
    setFetchingLocations(false);
  }

  // Step 0: Create tenant
  async function handleCreateTenant() {
    setLoading(true);
    try {
      const { data: tenant, error: tErr } = await supabase
        .from('tenants')
        .insert({
          name: businessName,
          slug: slug || generateSlug(businessName),
          owner_id: userId,
          preferred_language: language,
        })
        .select()
        .single();

      if (tErr) throw tErr;
      setTenantId(tenant.id);

      // Create tenant_member (owner)
      const { error: mErr } = await supabase.from('tenant_members').insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      });

      if (mErr) throw mErr;

      setStep(1);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  // Step 1: Connect Google
  function handleConnectGoogle() {
    if (tenantId) {
      localStorage.setItem('onboarding_tenant_id', String(tenantId));
    }
    window.location.href = '/api/auth/google-business?redirect=/admin/onboarding';
  }

  // Step 2: Toggle location selection
  function toggleLocation(placeId: string) {
    setSelectedPlaceIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  }

  // Step 2: Create stores from selected locations
  async function handleCreateStores() {
    setLoading(true);
    try {
      const selected = locations.filter(l => selectedPlaceIds.has(l.placeId));
      const stores: { id: number; name: string; slug: string }[] = [];

      for (const loc of selected) {
        const storeSlug = generateSlug(loc.title);
        const { data: store, error } = await supabase
          .from('stores')
          .insert({
            name: loc.title,
            slug: storeSlug,
            tenant_id: tenantId,
            place_id: loc.placeId,
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create store:', error);
          continue;
        }
        stores.push({ id: store.id, name: store.name, slug: store.slug });
      }

      if (stores.length === 0) {
        alert('Failed to create stores. Please try again.');
        setLoading(false);
        return;
      }

      setCreatedStores(stores);
      setStep(3);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  // Step 3: Save store settings
  async function handleSaveSettings() {
    if (createdStores.length === 0) return;
    setLoading(true);
    try {
      // Apply settings to all stores
      for (const store of createdStores) {
        await supabase.from('stores').update({
          support_email: supportEmail,
          ...facilities,
        }).eq('id', store.id);
      }
      setStep(4);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  // Step 4: Save notifications
  async function handleSaveNotifications() {
    if (createdStores.length === 0) return;
    setLoading(true);
    try {
      if (notifEmail) {
        for (const store of createdStores) {
          await supabase.from('notification_channels').upsert({
            store_id: store.id,
            channel_type: 'email',
            is_active: true,
            config: { recipients: [notifEmail] },
          }, { onConflict: 'store_id,channel_type' });
        }
      }
      setStep(5);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  function handleComplete() {
    localStorage.removeItem('onboarding_tenant_id');
    router.push('/admin/reviews');
  }

  const domain = typeof window !== 'undefined' ? window.location.origin : '';
  const oauthError = searchParams.get('error');

  return (
    <div className="w-full max-w-lg">
      {/* Progress Bar */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((_, i) => (
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
        {/* Step 0: Organization */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business / Organization Name</label>
              <input
                value={businessName}
                onChange={(e) => { setBusinessName(e.target.value); setSlug(generateSlug(e.target.value)); }}
                placeholder="Your Business Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder:text-gray-400 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900"
              >
                <option value="en">English</option>
                <option value="zh">繁體中文</option>
                <option value="ko">한국어</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <button
              onClick={handleCreateTenant}
              disabled={!businessName || loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <>Next <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* Step 1: Connect Google Business */}
        {step === 1 && (
          <div className="space-y-4">
            {googleConnected ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">Google Business connected!</p>
                {googleEmail && <p className="text-sm text-green-600 mt-1">{googleEmail}</p>}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Connect your Google Business Profile to automatically import your store locations and manage reviews.
                </p>
                {oauthError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-sm text-red-700">Connection failed: {oauthError}. Please try again.</p>
                  </div>
                )}
                <button
                  onClick={handleConnectGoogle}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Connect Google Business Profile
                </button>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-4 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {googleConnected && (
                <button
                  onClick={() => { setStep(2); fetchLocations(); }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Locations */}
        {step === 2 && (
          <div className="space-y-4">
            {fetchingLocations ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Loading your Google Business locations...</p>
              </div>
            ) : locationError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-600 mb-3">{locationError}</p>
                <button
                  onClick={fetchLocations}
                  className="text-sm text-blue-600 underline"
                >
                  Try again
                </button>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-gray-600">No locations found in your Google Business account.</p>
                <p className="text-xs text-gray-400">Make sure your Google account has business locations set up.</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={fetchLocations} className="text-sm text-blue-600 underline">
                    Retry
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => { router.push('/admin/reviews'); }} className="text-sm text-gray-500 underline">
                    Skip &amp; go to dashboard
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Found {locations.length} location{locations.length > 1 ? 's' : ''}. Select the stores you want to manage:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {locations.map((loc) => (
                    <label
                      key={loc.placeId}
                      className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                        selectedPlaceIds.has(loc.placeId) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlaceIds.has(loc.placeId)}
                        onChange={() => toggleLocation(loc.placeId)}
                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{loc.title}</p>
                        {loc.address && (
                          <p className="text-xs text-gray-500 truncate">{loc.address}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleCreateStores}
                disabled={selectedPlaceIds.size === 0 || loading || fetchingLocations}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating stores...</>
                ) : (
                  <>Add {selectedPlaceIds.size} store{selectedPlaceIds.size > 1 ? 's' : ''} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Store Settings */}
        {step === 3 && (
          <div className="space-y-4">
            {createdStores.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {createdStores.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStoreIndex(i)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedStoreIndex === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder:text-gray-400 text-gray-900"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Next <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* Step 4: Notifications */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Set up email notifications for new reviews. You can add LINE, Slack, and WhatsApp later in Settings.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notification Email</label>
              <input
                value={notifEmail}
                onChange={(e) => setNotifEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder:text-gray-400 text-gray-900"
              />
            </div>
            <button
              onClick={handleSaveNotifications}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Next <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* Step 5: QR & NFC */}
        {step === 5 && (
          <div className="space-y-4">
            {createdStores.map((store) => (
              <div key={store.id} className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{store.name}</p>
                <code className="text-xs bg-white px-3 py-2 rounded-lg border block break-all">
                  {domain}/?store={store.slug}&src=qr
                </code>
              </div>
            ))}
            <p className="text-xs text-gray-400">
              Print QR codes with these URLs and place them at your stores. For NFC tags, use <code>?src=nfc</code>.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                QR code generation will be available in the store dashboard. For now, use any QR generator with the URLs above.
              </p>
            </div>
            <button
              onClick={() => setStep(6)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 6: Launch */}
        {step === 6 && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">You are all set!</h3>
            <p className="text-sm text-gray-600">
              Your reputation monitoring system is ready. {createdStores.length} store{createdStores.length > 1 ? 's' : ''} connected.
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
