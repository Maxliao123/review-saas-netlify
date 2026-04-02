'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  planId: string;
  label: string;
  highlighted: boolean;
  isAuthenticated: boolean;
  currentPlan: string | null;
}

export default function UpgradeButton({ planId, label, highlighted, isAuthenticated, currentPlan }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isCurrentPlan = currentPlan === planId;

  async function handleClick() {
    if (planId === 'free') {
      router.push('/auth/signup');
      return;
    }
    if (planId === 'enterprise' && !isAuthenticated) {
      router.push('/auth/signup?plan=enterprise');
      return;
    }
    if (!isAuthenticated) {
      router.push(`/auth/signup?plan=${planId}`);
      return;
    }
    if (isCurrentPlan) return;

    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch {
      alert('Checkout failed. Please try again.');
    }
    setLoading(false);
  }

  const buttonLabel = isCurrentPlan ? 'Current Plan' : loading ? 'Redirecting...' : label;

  return (
    <button
      onClick={handleClick}
      disabled={loading || isCurrentPlan}
      className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-all ${
        isCurrentPlan
          ? 'bg-gray-200 text-gray-500 cursor-default'
          : highlighted
            ? 'bg-white text-[#E8654A] hover:bg-[#FFF7ED] shadow-lg'
            : 'bg-gray-900 text-white hover:bg-gray-800'
      } disabled:opacity-60`}
    >
      {buttonLabel}
    </button>
  );
}
