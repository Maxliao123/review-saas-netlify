'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowRight, Gift } from 'lucide-react';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FDF6EC]"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const [step, setStep] = useState<'account' | 'business'>('account');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  // Persist referral code in localStorage so it survives the signup flow
  useEffect(() => {
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
    }
  }, [refCode]);

  const supabase = createSupabaseBrowserClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Sign up with magic link — profile auto-created via DB trigger
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/admin/onboarding`,
        data: {
          business_name: businessName,
        },
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the signup link! You will be guided through setup after confirming.');
    }
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/admin/onboarding`,
      },
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF6EC]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-500 mt-2">Start managing your online reputation</p>
        </div>

        {refCode && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-[#FFF7ED] border border-emerald-200 px-4 py-3">
            <Gift className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">
              Your friend referred you! Get <strong>50% off</strong> your first month.
            </p>
          </div>
        )}

        {step === 'account' && (
          <>
            <button
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-4 text-sm text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#E8654A] focus:border-transparent outline-none"
                />
              </div>
              <button
                onClick={() => email && setStep('business')}
                disabled={!email}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#E8654A] text-white rounded-xl hover:bg-[#C94D35] transition-colors disabled:opacity-50"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === 'business' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="business" className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="business"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Restaurant / Shop Name"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#E8654A] focus:border-transparent outline-none"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Signing up as <strong>{email}</strong>.{' '}
              <button type="button" onClick={() => setStep('account')} className="text-[#E8654A] hover:underline">
                Change
              </button>
            </p>

            <button
              type="submit"
              disabled={loading || !businessName}
              className="w-full px-4 py-3 bg-[#E8654A] text-white rounded-xl hover:bg-[#C94D35] transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes('Check') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#E8654A] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
