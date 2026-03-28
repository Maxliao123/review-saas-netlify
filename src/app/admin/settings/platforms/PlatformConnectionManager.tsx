'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, ExternalLink, Star, Search, Loader2, X } from 'lucide-react';

interface PlatformCred {
  platform: string;
  account_identifier: string | null;
  meta: Record<string, unknown> | null;
  updated_at: string | null;
}

interface PlatformSummary {
  store_id: number;
  platform: string;
  overall_rating: number | null;
  review_count: number | null;
  fetched_at: string | null;
}

interface Store {
  id: number;
  name: string;
}

interface Props {
  platforms: PlatformCred[];
  summaries: PlatformSummary[];
  stores: Store[];
  isOwner: boolean;
}

const PLATFORM_CONFIG = [
  {
    key: 'facebook',
    name: 'Facebook',
    description: 'Fetch Page Recommendations (Recommend / Don\'t Recommend)',
    connectUrl: '/api/auth/facebook',
    color: 'bg-blue-600',
    type: 'oauth' as const,
  },
  {
    key: 'yelp',
    name: 'Yelp',
    description: 'View rating summary + 3 review excerpts (API key required)',
    connectUrl: null,
    color: 'bg-red-600',
    type: 'api_key' as const,
  },
  {
    key: 'tripadvisor',
    name: 'TripAdvisor',
    description: 'View rating summary and ranking from TripAdvisor Content API',
    connectUrl: null,
    color: 'bg-green-600',
    type: 'search' as const,
  },
];

export default function PlatformConnectionManager({ platforms, summaries, stores, isOwner }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fbConnected = searchParams.get('facebook_connected');
  const error = searchParams.get('error');

  // TripAdvisor search state
  const [taSearchName, setTaSearchName] = useState('');
  const [taSearchLocation, setTaSearchLocation] = useState('');
  const [taSearching, setTaSearching] = useState(false);
  const [taConnecting, setTaConnecting] = useState(false);
  const [taDisconnecting, setTaDisconnecting] = useState(false);
  const [taError, setTaError] = useState<string | null>(null);

  const getCredFor = (platform: string) => platforms.find(p => p.platform === platform);
  const getSummariesFor = (platform: string) => summaries.filter(s => s.platform === platform);

  const handleTripAdvisorSearch = async () => {
    if (!taSearchName.trim()) return;
    setTaSearching(true);
    setTaError(null);

    try {
      const resp = await fetch('/api/admin/platforms/tripadvisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: taSearchName.trim(), location: taSearchLocation.trim() }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setTaError(data.error || 'Search failed');
        return;
      }

      // Success — refresh the page to show updated summaries
      router.refresh();
      setTaSearchName('');
      setTaSearchLocation('');
    } catch (err: any) {
      setTaError(err.message || 'Network error');
    } finally {
      setTaSearching(false);
    }
  };

  const handleTripAdvisorDisconnect = async () => {
    setTaDisconnecting(true);
    setTaError(null);

    try {
      const resp = await fetch('/api/admin/platforms/tripadvisor', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setTaError(data.error || 'Disconnect failed');
        return;
      }

      router.refresh();
    } catch (err: any) {
      setTaError(err.message || 'Network error');
    } finally {
      setTaDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {fbConnected && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">
            Facebook connected successfully!
            {searchParams.get('page') && ` (${searchParams.get('page')})`}
          </p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">Connection failed: {decodeURIComponent(error)}</p>
        </div>
      )}

      {/* Platform Cards */}
      {PLATFORM_CONFIG.map(platform => {
        const cred = getCredFor(platform.key);
        const platSummaries = getSummariesFor(platform.key);
        const isConnected = !!cred || (platform.key === 'tripadvisor' && platSummaries.length > 0);

        return (
          <div key={platform.key} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className={`px-3 py-1.5 rounded-lg text-white text-xs font-bold ${platform.color}`}>
                {platform.name}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                  {isConnected && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{platform.description}</p>

                {/* Connected info */}
                {isConnected && cred?.meta && (
                  <div className="mt-2 text-xs text-gray-400">
                    {(cred.meta as Record<string, string>).page_name && (
                      <span>Page: <strong className="text-gray-600">{(cred.meta as Record<string, string>).page_name}</strong></span>
                    )}
                    {cred.updated_at && (
                      <span className="ml-3">Updated: {new Date(cred.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                )}

                {/* Platform summaries per store */}
                {platSummaries.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {platSummaries.map(s => {
                      const store = stores.find(st => st.id === s.store_id);
                      return (
                        <div key={`${s.store_id}-${s.platform}`} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600">{store?.name || `Store #${s.store_id}`}:</span>
                          {s.overall_rating && (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <Star className="w-3 h-3 fill-current" />
                              {s.overall_rating}
                            </span>
                          )}
                          <span className="text-gray-400">({s.review_count || 0} reviews)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Connect / action section */}
            <div className="mt-4">
              {platform.type === 'oauth' && isOwner ? (
                <a
                  href={platform.connectUrl!}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  {isConnected ? `Reconnect ${platform.name}` : `Connect ${platform.name}`}
                </a>
              ) : platform.type === 'api_key' ? (
                <p className="text-xs text-gray-400">
                  Configured via {platform.key === 'yelp' ? 'YELP_API_KEY' : ''} environment variable. Summary data syncs automatically.
                </p>
              ) : platform.type === 'search' && platform.key === 'tripadvisor' ? (
                <div className="space-y-3">
                  {/* TripAdvisor error */}
                  {taError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{taError}</span>
                      <button onClick={() => setTaError(null)} className="ml-auto">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {isOwner && !isConnected && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Restaurant name"
                        value={taSearchName}
                        onChange={(e) => setTaSearchName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="City or address"
                        value={taSearchLocation}
                        onChange={(e) => setTaSearchLocation(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleTripAdvisorSearch}
                        disabled={taSearching || !taSearchName.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {taSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        {taSearching ? 'Searching...' : 'Search & Connect'}
                      </button>
                    </div>
                  )}

                  {isOwner && isConnected && (
                    <button
                      onClick={handleTripAdvisorDisconnect}
                      disabled={taDisconnecting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {taDisconnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      {taDisconnecting ? 'Disconnecting...' : 'Disconnect TripAdvisor'}
                    </button>
                  )}

                  {!isOwner && (
                    <p className="text-sm text-gray-500 italic">
                      Only the account owner can connect platforms.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Only the account owner can connect platforms.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
