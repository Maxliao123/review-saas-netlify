'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  PartyPopper,
} from 'lucide-react';

interface SetupSteps {
  account_created: boolean;
  store_added: boolean;
  google_connected: boolean;
  tags_customized: boolean;
  qr_downloaded: boolean;
  notifications_configured: boolean;
}

interface StepConfig {
  key: keyof SetupSteps;
  label: string;
  href: string;
  actionLabel: string;
}

const STEPS: StepConfig[] = [
  {
    key: 'account_created',
    label: 'Create your account',
    href: '#',
    actionLabel: '',
  },
  {
    key: 'store_added',
    label: 'Add your first store',
    href: '/admin/stores/setup',
    actionLabel: 'Add store',
  },
  {
    key: 'google_connected',
    label: 'Connect Google Business Profile',
    href: '/admin/settings/google',
    actionLabel: 'Connect',
  },
  {
    key: 'tags_customized',
    label: 'Customize review tags',
    href: '/admin/stores/setup',
    actionLabel: 'Customize',
  },
  {
    key: 'qr_downloaded',
    label: 'Download QR codes',
    href: '/admin/qr-codes',
    actionLabel: 'Download',
  },
  {
    key: 'notifications_configured',
    label: 'Set up notifications',
    href: '/admin/settings/notifications',
    actionLabel: 'Set up',
  },
];

const DISMISS_KEY = 'replywiseai_setup_dismissed';

export default function SetupChecklist() {
  const [steps, setSteps] = useState<SetupSteps | null>(null);
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Check localStorage before fetching
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    if (wasDismissed) {
      setDismissed(true);
      setLoading(false);
      return;
    }
    setDismissed(false);

    fetch('/api/admin/setup-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.steps) {
          setSteps(data.steps);
          // Check if all complete
          const allDone = Object.values(data.steps as SetupSteps).every(Boolean);
          if (allDone) {
            setShowCelebration(true);
            // Auto-hide after 5 seconds
            setTimeout(() => {
              setDismissed(true);
            }, 5000);
          }
        }
      })
      .catch(() => {
        // Silently fail — don't block the dashboard
        setDismissed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  if (loading || dismissed || !steps) return null;

  const completedCount = Object.values(steps).filter(Boolean).length;
  const totalCount = STEPS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (showCelebration) {
    return (
      <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-6">
        <div className="flex items-center gap-3">
          <PartyPopper className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">
              All set! You&apos;re ready to collect reviews.
            </h3>
            <p className="mt-0.5 text-sm text-green-700">
              Your setup is complete. Start sharing your QR code with customers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Setup Progress: {completedCount}/{totalCount} complete
          </h3>
          {/* Progress bar */}
          <div className="mt-2 h-2 w-64 max-w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">{progressPercent}%</p>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Steps */}
      <ul className="mt-4 space-y-2">
        {STEPS.map((step) => {
          const done = steps[step.key];
          return (
            <li key={step.key} className="flex items-center gap-3">
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 shrink-0" />
              )}
              <span
                className={`text-sm ${
                  done ? 'text-gray-400 line-through' : 'text-gray-700'
                }`}
              >
                {step.label}
              </span>
              {!done && step.href !== '#' && (
                <Link
                  href={step.href}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {step.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {/* Dismiss link */}
      <div className="mt-4 border-t border-gray-50 pt-3">
        <button
          onClick={handleDismiss}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
