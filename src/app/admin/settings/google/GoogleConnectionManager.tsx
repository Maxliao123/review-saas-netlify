'use client';

import { useSearchParams } from 'next/navigation';
import { Link as LinkIcon, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface Props {
  isConnected: boolean;
  googleEmail: string | null;
  lastUpdated: string | null;
  isOwner: boolean;
}

export default function GoogleConnectionManager({ isConnected, googleEmail, lastUpdated, isOwner }: Props) {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">
            Google Business connected successfully!
            {searchParams.get('email') && ` (${searchParams.get('email')})`}
          </p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">Connection failed: {error}</p>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
            <LinkIcon className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {isConnected ? 'Connected' : 'Not Connected'}
            </h3>
            {isConnected ? (
              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-600">
                  Signed in as <strong>{googleEmail}</strong>
                </p>
                {lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Last refreshed: {new Date(lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                Connect your Google Business Profile to enable automatic review fetching and reply publishing.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          {isOwner ? (
            <a
              href="/api/auth/google-business"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              {isConnected ? 'Reconnect Google Business' : 'Connect Google Business'}
            </a>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Only the account owner can connect or disconnect Google Business.
            </p>
          )}
        </div>
      </div>

      {/* What You Get */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h4 className="font-medium text-gray-900 mb-3">What this enables:</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Automatic review fetching every 15 minutes
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            AI-generated reply drafts for each review
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            One-click publish approved replies to Google
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Instant notifications for negative reviews
          </li>
        </ul>
      </div>
    </div>
  );
}
