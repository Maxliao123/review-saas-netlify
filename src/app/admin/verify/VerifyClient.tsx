'use client';

import { useState, useRef, useEffect } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Scissors,
  Package,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface VerifyResult {
  success: boolean;
  booking?: {
    id: string;
    member_name: string;
    service_name: string;
    staff_name: string;
    package_name: string;
    remaining_units: number;
    total_units: number;
  };
  error?: string;
}

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'preview' | 'success' | 'error'>('input');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'input' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode);
      handleLookup(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLookup(lookupCode?: string) {
    const codeToUse = lookupCode || code;
    if (!codeToUse || codeToUse.length < 4) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/admin/verify/lookup?code=${encodeURIComponent(codeToUse)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Invalid verification code');
        setStep('error');
      } else {
        setResult({ success: true, booking: data.booking });
        setStep('preview');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!result?.booking) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: result.booking.id, code }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Failed to confirm check-in.');
        setStep('error');
      } else {
        setResult({
          success: true,
          booking: {
            ...result.booking,
            remaining_units: data.remaining_units ?? result.booking.remaining_units,
          },
        });
        setStep('success');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setCode('');
    setStep('input');
    setResult(null);
    setErrorMessage('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleCodeChange(value: string) {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    setCode(cleaned);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleLookup();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookings
        </Link>

        {/* Input Step */}
        {step === 'input' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF7ED] mx-auto mb-6">
              <BadgeCheck className="h-8 w-8 text-[#E8654A]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check-in</h1>
            <p className="text-sm text-gray-500 mb-8">
              Enter the verification code to check in a member
            </p>

            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter code"
              className="w-full text-center text-4xl font-mono font-bold tracking-[0.3em] py-4 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#E8654A] focus:ring-4 focus:ring-[#E8654A]/10 placeholder:text-gray-300 placeholder:tracking-normal placeholder:text-2xl"
              autoComplete="off"
            />

            <button
              onClick={() => handleLookup()}
              disabled={code.length < 4 || loading}
              className="w-full mt-6 py-4 bg-[#E8654A] text-white rounded-xl text-lg font-semibold hover:bg-[#D55A40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Looking up...
                </>
              ) : (
                'Verify Code'
              )}
            </button>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && result?.booking && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Confirm Check-in</h2>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User className="h-5 w-5 text-[#E8654A]" />
                <div>
                  <div className="text-xs text-gray-500">Member</div>
                  <div className="font-semibold text-gray-900">{result.booking.member_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Scissors className="h-5 w-5 text-[#E8654A]" />
                <div>
                  <div className="text-xs text-gray-500">Service</div>
                  <div className="font-semibold text-gray-900">{result.booking.service_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Package className="h-5 w-5 text-[#E8654A]" />
                <div>
                  <div className="text-xs text-gray-500">Package</div>
                  <div className="font-semibold text-gray-900">
                    {result.booking.package_name}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      {result.booking.remaining_units}/{result.booking.total_units} remaining
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3 bg-[#E8654A] text-white rounded-xl text-sm font-semibold hover:bg-[#D55A40] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}
                Confirm Check-in
              </button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && result?.booking && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto mb-6 animate-[scale-in_0.3s_ease-out]">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Done!</h2>
            <p className="text-lg text-gray-600 mb-1">{result.booking.member_name} checked in</p>
            <p className="text-sm text-gray-500 mb-8">
              <span className="font-semibold text-gray-700">{result.booking.remaining_units}</span> sessions remaining
            </p>

            <button
              onClick={handleReset}
              className="w-full py-4 bg-[#E8654A] text-white rounded-xl text-lg font-semibold hover:bg-[#D55A40] transition-colors"
            >
              Next Check-in
            </button>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mx-auto mb-6">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Invalid Code</h2>
            <p className="text-sm text-gray-500 mb-8">{errorMessage}</p>

            <button
              onClick={handleReset}
              className="w-full py-4 bg-[#E8654A] text-white rounded-xl text-lg font-semibold hover:bg-[#D55A40] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
