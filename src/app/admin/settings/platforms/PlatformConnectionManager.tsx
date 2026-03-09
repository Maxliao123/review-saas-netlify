'use client';

import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, ExternalLink, Star } from 'lucide-react';

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
    description: 'View rating summary (API access restricted)',
    connectUrl: null,
    color: 'bg-green-600',
    type: 'api_key' as const,
  },
];

export default function PlatformConnectionManager({ platforms, summaries, stores, isOwner }: Props) {
  const searchParams = useSearchParams();
  const fbConnected = searchParams.get('facebook_connected');
  const error = searchParams.get('error');

  const getCredFor = (platform: string) => platforms.find(p => p.platform === platform);
  const getSummariesFor = (platform: string) => summaries.filter(s => s.platform === platform);

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
        const isConnected = !!cred;

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
                {isConnected && cred.meta && (
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

            {/* Connect button */}
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
                  {platform.key === 'yelp'
                    ? 'Configured via YELP_API_KEY environment variable. Summary data syncs automatically.'
                    : 'TripAdvisor Content API requires a partnership agreement. Contact TripAdvisor for access.'}
                </p>
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
