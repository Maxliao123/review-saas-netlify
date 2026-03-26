'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MapPin, Scan, MessageSquare, QrCode,
  ArrowRight, ArrowLeft, Check, Loader2, Star,
  Pencil, ChevronDown, ChevronUp,
} from 'lucide-react';
import { generateReferralCode } from '@/lib/referral';

const STEPS = [
  { icon: MapPin, title: 'Connect & Select', desc: 'Link Google and choose your stores', est: '~1 min' },
  { icon: Scan, title: 'Scan Reviews', desc: 'Import reviews & generate AI drafts', est: '~2 min' },
  { icon: MessageSquare, title: 'Review & Publish', desc: 'Check AI drafts and publish replies', est: '~1 min' },
  { icon: QrCode, title: 'QR Setup', desc: 'Set up customer review collection', est: '~1 min' },
];

interface GoogleLocation {
  name: string;
  title: string;
  placeId: string;
  address: string;
}

interface ReviewDraft {
  id: string;
  author_name: string;
  rating: number;
  content: string;
  reply_draft: string;
  reply_status: string;
  created_at: string;
}

export default function OnboardingWizard({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  // Step 0: Org + Google + Locations
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [language, setLanguage] = useState('zh');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [fetchingLocations, setFetchingLocations] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [createdStores, setCreatedStores] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [orgCreated, setOrgCreated] = useState(false);

  // Step 1: Scan + Draft
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ imported: 0, pending: 0, total: 0 });
  const [scanDone, setScanDone] = useState(false);
  const [tone, setTone] = useState<'professional' | 'friendly' | 'enthusiastic'>('friendly');
  const [handbookText, setHandbookText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftProgress, setDraftProgress] = useState({ drafted: 0, remaining: 0 });
  const [draftDone, setDraftDone] = useState(false);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 2: Review drafts
  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState({ published: 0, failed: 0 });
  const [publishDone, setPublishDone] = useState(false);
  const [expandedRating, setExpandedRating] = useState<number | null>(null);

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (draftIntervalRef.current) clearInterval(draftIntervalRef.current);
    };
  }, []);

  // On mount: check existing state
  useEffect(() => {
    async function init() {
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('tenant_id, role, tenants(id, name, slug)')
        .eq('user_id', userId)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle();

      if (membership?.tenant_id) {
        setTenantId(membership.tenant_id);
        const tenant = membership.tenants as any;
        if (tenant) {
          setBusinessName(tenant.name || '');
          setSlug(tenant.slug || '');
          setOrgCreated(true);
        }
      }

      // Check if returning from Google OAuth
      if (searchParams.get('google_connected') === 'true') {
        setGoogleConnected(true);
        setGoogleEmail(searchParams.get('email') || '');

        const savedTenantId = localStorage.getItem('onboarding_tenant_id');
        if (savedTenantId && !membership?.tenant_id) {
          setTenantId(savedTenantId);
        }

        fetchLocations();
      } else if (searchParams.get('error')) {
        // OAuth error — stay on step 0
      } else if (membership?.tenant_id) {
        // Check existing Google connection
        const { data: creds } = await supabase
          .from('google_credentials')
          .select('google_email')
          .eq('tenant_id', membership.tenant_id)
          .limit(1)
          .maybeSingle();

        if (creds) {
          setGoogleConnected(true);
          setGoogleEmail(creds.google_email || '');

          // Check if stores exist
          const { data: existingStores } = await supabase
            .from('stores')
            .select('id, name, slug')
            .eq('tenant_id', membership.tenant_id);

          if (existingStores && existingStores.length > 0) {
            setCreatedStores(existingStores);
            setStep(1); // Go to scan step
          } else {
            fetchLocations();
          }
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
      const allIds = new Set<string>((data.locations || []).map((l: GoogleLocation) => l.placeId));
      setSelectedPlaceIds(allIds);
    } catch (err: any) {
      setLocationError(err.message);
    }
    setFetchingLocations(false);
  }

  // ── Step 0 handlers ──

  async function handleCreateOrg() {
    setLoading(true);
    try {
      const newReferralCode = generateReferralCode();
      const { data: tenant, error: tErr } = await supabase
        .from('tenants')
        .insert({
          name: businessName,
          slug: slug || generateSlug(businessName),
          owner_id: userId,
          preferred_language: language,
          referral_code: newReferralCode,
        })
        .select()
        .single();

      if (tErr) throw tErr;
      setTenantId(tenant.id);

      const { error: mErr } = await supabase.from('tenant_members').insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      });

      if (mErr) throw mErr;

      // Handle referral tracking if this user was referred
      const storedRefCode = localStorage.getItem('referral_code');
      if (storedRefCode) {
        try {
          // Look up the referrer's tenant by their referral code
          const { data: referrer } = await supabase
            .from('tenants')
            .select('id')
            .eq('referral_code', storedRefCode)
            .maybeSingle();

          if (referrer) {
            // Link this tenant to the referrer
            await supabase
              .from('tenants')
              .update({ referred_by_tenant_id: referrer.id })
              .eq('id', tenant.id);

            // Insert referral record
            await supabase.from('referrals').insert({
              referrer_tenant_id: referrer.id,
              referred_tenant_id: tenant.id,
              referral_code: storedRefCode,
              status: 'signed_up',
            });
          }
        } catch (refErr) {
          // Non-blocking: don't fail onboarding if referral tracking fails
          console.error('Referral tracking error:', refErr);
        }
        localStorage.removeItem('referral_code');
      }

      setOrgCreated(true);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  function handleConnectGoogle() {
    if (tenantId) {
      localStorage.setItem('onboarding_tenant_id', String(tenantId));
    }
    window.location.href = '/api/auth/google-business?redirect=/admin/onboarding';
  }

  function toggleLocation(placeId: string) {
    setSelectedPlaceIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  async function handleCreateStoresAndProceed() {
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
      setStep(1);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  }

  // ── Step 1 handlers: Scan + Draft ──

  const scanReviews = useCallback(async () => {
    if (createdStores.length === 0) return;
    setScanning(true);
    setScanDone(false);

    const storeIds = createdStores.map(s => s.id);
    let cursor: string | undefined;

    const poll = async () => {
      try {
        const res = await fetch('/api/admin/onboarding/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeIds, cursor }),
        });
        const data = await res.json();

        setScanProgress({
          imported: data.imported || 0,
          pending: data.pending || 0,
          total: data.total || 0,
        });

        if (data.status === 'done') {
          setScanning(false);
          setScanDone(true);
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
        } else {
          cursor = data.cursor;
        }
      } catch (err) {
        console.error('Scan poll error:', err);
      }
    };

    await poll();
    if (!scanDone) {
      scanIntervalRef.current = setInterval(poll, 2000);
    }
  }, [createdStores, scanDone]);

  const generateDrafts = useCallback(async () => {
    if (createdStores.length === 0) return;
    setDrafting(true);
    setDraftDone(false);

    const storeIds = createdStores.map(s => s.id);

    // Save handbook overrides to stores before generating
    if (handbookText.trim()) {
      for (const sid of storeIds) {
        await supabase
          .from('stores')
          .update({ custom_handbook_overrides: handbookText.trim() })
          .eq('id', sid);
      }
    }

    const poll = async () => {
      try {
        const res = await fetch('/api/admin/onboarding/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeIds, tone }),
        });
        const data = await res.json();

        setDraftProgress({
          drafted: data.drafted || 0,
          remaining: data.remaining || 0,
        });

        if (data.status === 'done') {
          setDrafting(false);
          setDraftDone(true);
          if (draftIntervalRef.current) {
            clearInterval(draftIntervalRef.current);
            draftIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error('Draft poll error:', err);
      }
    };

    await poll();
    draftIntervalRef.current = setInterval(poll, 3000);
  }, [createdStores, tone, handbookText, supabase]);

  // ── Step 2 handlers: Review & Publish ──

  async function loadDrafts() {
    const storeIds = createdStores.map(s => s.id);
    const { data } = await supabase
      .from('reviews_raw')
      .select('id, author_name, rating, content, reply_draft, reply_status, created_at')
      .in('store_id', storeIds)
      .eq('reply_status', 'drafted')
      .order('rating', { ascending: true });

    if (data) {
      setDrafts(data);
      setSelectedDraftIds(new Set(data.map(d => d.id)));
    }
  }

  function parseDraft(draftStr: string): string {
    try {
      const parsed = JSON.parse(draftStr);
      return parsed.draft || draftStr;
    } catch {
      return draftStr;
    }
  }

  async function handleSaveDraftEdit(reviewId: string) {
    const payload = JSON.stringify({ category: 'Edited', draft: editText });
    await supabase
      .from('reviews_raw')
      .update({ reply_draft: payload })
      .eq('id', reviewId);

    setDrafts(prev => prev.map(d =>
      d.id === reviewId ? { ...d, reply_draft: payload } : d
    ));
    setEditingId(null);
    setEditText('');
  }

  function toggleDraftSelection(id: string) {
    setSelectedDraftIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePublishAll() {
    const ids = [...selectedDraftIds];
    if (ids.length === 0) return;
    setPublishing(true);
    setPublishResult({ published: 0, failed: 0 });

    let totalPublished = 0;
    let totalFailed = 0;

    // Publish in batches of 5
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      try {
        const res = await fetch('/api/admin/onboarding/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewIds: batch }),
        });
        const data = await res.json();
        totalPublished += data.published || 0;
        totalFailed += data.failed || 0;
        setPublishResult({ published: totalPublished, failed: totalFailed });
      } catch (err) {
        console.error('Publish error:', err);
        totalFailed += batch.length;
      }
    }

    setPublishing(false);
    setPublishDone(true);
  }

  // ── Step 3 handler: Complete ──

  async function handleComplete() {
    setLoading(true);
    try {
      if (tenantId) {
        await supabase
          .from('tenants')
          .update({ onboarding_completed_at: new Date().toISOString() })
          .eq('id', tenantId);
      }
      localStorage.removeItem('onboarding_tenant_id');
      router.push('/admin');
    } catch (err: any) {
      console.error('Complete error:', err);
      router.push('/admin');
    }
    setLoading(false);
  }

  const oauthError = searchParams.get('error');
  const domain = typeof window !== 'undefined' ? window.location.origin : '';

  // Group drafts by rating for step 2
  const draftsByRating = drafts.reduce((acc, d) => {
    if (!acc[d.rating]) acc[d.rating] = [];
    acc[d.rating].push(d);
    return acc;
  }, {} as Record<number, ReviewDraft[]>);

  return (
    <div className="w-full max-w-2xl">
      {/* Progress Bar */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex-1 flex items-center gap-1">
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>

      {/* Step Header */}
      <div className="text-center mb-6">
        {(() => { const Icon = STEPS[step].icon; return <Icon className="w-10 h-10 mx-auto text-blue-600 mb-3" />; })()}
        <h2 className="text-xl font-bold text-gray-900">{STEPS[step].title}</h2>
        <p className="text-gray-500 text-sm mt-1">{STEPS[step].desc}</p>
        <p className="text-xs text-blue-500 mt-1">{STEPS[step].est}</p>
        {step === 0 && (
          <button
            onClick={() => setStep(3)}
            className="mt-2 text-xs text-gray-400 hover:text-blue-600 underline transition-colors"
          >
            Skip to QR Setup →
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* ════════ STEP 0: Connect Google & Select Stores ════════ */}
        {step === 0 && (
          <div className="space-y-5">
            {/* Part A: Create Organization */}
            {!orgCreated ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    value={businessName}
                    onChange={(e) => { setBusinessName(e.target.value); setSlug(generateSlug(e.target.value)); }}
                    placeholder="Your Restaurant / Business"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl placeholder:text-gray-400 text-gray-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                    <input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900"
                    >
                      <option value="zh">繁體中文</option>
                      <option value="en">English</option>
                      <option value="ko">한국어</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreateOrg}
                  disabled={!businessName || loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <>Create Organization <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            ) : !googleConnected ? (
              /* Part B: Connect Google */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">Organization &quot;{businessName}&quot; created</span>
                </div>
                <p className="text-sm text-gray-600">
                  Connect your Google Business Profile to import store locations and reviews.
                </p>
                {oauthError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-sm text-red-700">Connection failed: {oauthError}</p>
                  </div>
                )}
                <button
                  onClick={handleConnectGoogle}
                  className="w-full py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-3 text-gray-700 font-medium"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Connect Google Business Profile
                </button>
              </div>
            ) : locations.length === 0 && !fetchingLocations && createdStores.length === 0 ? (
              /* No locations found */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">Google connected: {googleEmail}</span>
                </div>
                {locationError ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-600 mb-3">{locationError}</p>
                    <button onClick={fetchLocations} className="text-sm text-blue-600 underline">Try again</button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">No Google Business locations found.</p>
                    <button onClick={fetchLocations} className="text-sm text-blue-600 underline">Retry</button>
                  </div>
                )}
              </div>
            ) : fetchingLocations ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Loading Google Business locations...</p>
              </div>
            ) : createdStores.length > 0 ? (
              /* Stores already created */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" /> {createdStores.length} store(s) connected
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  Next: Scan Reviews <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Part C: Select Locations */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">Google connected: {googleEmail}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Found {locations.length} location{locations.length > 1 ? 's' : ''}. Select stores to manage:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
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
                        {loc.address && <p className="text-xs text-gray-500 truncate">{loc.address}</p>}
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleCreateStoresAndProceed}
                  disabled={selectedPlaceIds.size === 0 || loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating stores...</>
                  ) : (
                    <>Add {selectedPlaceIds.size} store{selectedPlaceIds.size > 1 ? 's' : ''} & Continue <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════ STEP 1: Scan Reviews & Generate AI Drafts ════════ */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Scan Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">1. Scan Google Reviews</h3>
              {!scanDone && !scanning ? (
                <button
                  onClick={scanReviews}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Scan className="w-4 h-4" /> Start Scanning Reviews
                </button>
              ) : scanning ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Scanning reviews...</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Imported: {scanProgress.imported} | Unreplied: {scanProgress.pending}
                  </div>
                  <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '70%' }} />
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Scan complete!</span>
                  </div>
                  <div className="text-sm text-green-700">
                    {scanProgress.total} reviews found, <strong>{scanProgress.pending} need replies</strong>
                  </div>
                </div>
              )}
            </div>

            {/* AI Tone + Draft Section */}
            {scanDone && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">2. AI Reply Settings</h3>
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-2">Reply Tone</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['professional', 'friendly', 'enthusiastic'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          tone === t
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {t === 'professional' ? 'Professional' : t === 'friendly' ? 'Friendly' : 'Enthusiastic'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Handbook (Optional) */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1">
                    Custom Reply Handbook <span className="text-xs text-gray-400">(Optional)</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Paste your company&apos;s apology guidelines or compensation policies. The AI will follow these when generating replies.
                  </p>
                  <textarea
                    className="w-full border rounded-lg p-3 text-xs font-mono h-32 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="Example: Hygiene issues → $5-$10 compensation, apologize and mention cleaning checklist..."
                    value={handbookText}
                    onChange={(e) => setHandbookText(e.target.value)}
                  />
                </div>

                {scanProgress.pending === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-600">All reviews already have replies! You can skip to QR setup.</p>
                  </div>
                ) : !draftDone && !drafting ? (
                  <button
                    onClick={generateDrafts}
                    className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Generate AI Drafts ({scanProgress.pending} reviews)
                  </button>
                ) : drafting ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                      <span className="text-sm font-medium text-green-800">Generating AI drafts...</span>
                    </div>
                    <div className="text-sm text-green-700">
                      Drafted: {draftProgress.drafted} | Remaining: {draftProgress.remaining}
                    </div>
                    <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full transition-all"
                        style={{
                          width: draftProgress.drafted + draftProgress.remaining > 0
                            ? `${(draftProgress.drafted / (draftProgress.drafted + draftProgress.remaining)) * 100}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {draftProgress.drafted} AI drafts generated!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(0)}
                className="px-4 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              {(draftDone || (scanDone && scanProgress.pending === 0)) && (
                <button
                  onClick={() => { setStep(2); loadDrafts(); }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  {scanProgress.pending === 0 ? 'Next: QR Setup' : 'Next: Review Drafts'} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════════ STEP 2: Review Drafts & Publish ════════ */}
        {step === 2 && (
          <div className="space-y-5">
            {drafts.length === 0 && !publishDone ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-600">No drafts to review. All reviews are handled!</p>
              </div>
            ) : publishDone ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-green-800 mb-1">Published!</h3>
                <p className="text-sm text-green-700">
                  {publishResult.published} replies published to Google.
                  {publishResult.failed > 0 && ` (${publishResult.failed} failed)`}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{drafts.length} drafts ready</p>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={selectedDraftIds.size === drafts.length}
                      onChange={() => {
                        if (selectedDraftIds.size === drafts.length) {
                          setSelectedDraftIds(new Set());
                        } else {
                          setSelectedDraftIds(new Set(drafts.map(d => d.id)));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    Select All
                  </label>
                </div>

                {/* Group by rating */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const group = draftsByRating[rating];
                    if (!group || group.length === 0) return null;

                    return (
                      <div key={rating} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedRating(expandedRating === rating ? null : rating)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {Array.from({ length: rating }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">({group.length})</span>
                          </div>
                          {expandedRating === rating
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                          }
                        </button>

                        {expandedRating === rating && (
                          <div className="divide-y divide-gray-100">
                            {group.map(draft => (
                              <div key={draft.id} className="p-4">
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedDraftIds.has(draft.id)}
                                    onChange={() => toggleDraftSelection(draft.id)}
                                    className="w-4 h-4 mt-1 rounded border-gray-300"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-gray-900">{draft.author_name}</span>
                                    </div>
                                    {draft.content && (
                                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">&quot;{draft.content}&quot;</p>
                                    )}

                                    {editingId === draft.id ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-900"
                                          rows={4}
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleSaveDraftEdit(draft.id)}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => { setEditingId(null); setEditText(''); }}
                                            className="px-3 py-1 border border-gray-300 text-xs rounded-lg text-gray-600"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
                                        <p>{parseDraft(draft.reply_draft)}</p>
                                        <button
                                          onClick={() => { setEditingId(draft.id); setEditText(parseDraft(draft.reply_draft)); }}
                                          className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                        >
                                          <Pencil className="w-3 h-3" /> Edit
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handlePublishAll}
                  disabled={selectedDraftIds.size === 0 || publishing}
                  className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {publishing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Publishing {publishResult.published}...</>
                  ) : (
                    <>Publish {selectedDraftIds.size} Replies to Google <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              {(publishDone || drafts.length === 0) && (
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  Next: QR Setup <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════════ STEP 3: QR Setup & Complete ════════ */}
        {step === 3 && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Place QR codes at your stores so customers can leave reviews. Print these URLs as QR codes:
            </p>
            {createdStores.map((store) => (
              <div key={store.id} className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{store.name}</p>
                <code className="text-xs bg-white px-3 py-2 rounded-lg border block break-all text-gray-800">
                  {domain}/?store={store.slug}&src=qr
                </code>
              </div>
            ))}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                You can customize survey tags and generate QR codes later in Store Setup.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Finishing...</>
                ) : (
                  <>Go to Dashboard <Check className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i <= step ? 'w-8 bg-blue-600' : 'w-4 bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-2">
        Step {step + 1} of {STEPS.length} — {STEPS[step].est}
      </p>
    </div>
  );
}
