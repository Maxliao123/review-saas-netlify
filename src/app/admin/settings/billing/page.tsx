import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPlanLimits, PRICING_DISPLAY } from '@/lib/plan-limits';
import {
  CreditCard,
  ArrowUpRight,
  Check,
  Zap,
} from 'lucide-react';

export const metadata = {
  title: 'Billing — Reputation Monitor',
};

export default async function BillingPage() {
  const ctx = await getUserTenantContext();
  if (!ctx?.tenant) redirect('/admin/onboarding');
  if (ctx.role !== 'owner') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-4 text-gray-600">Only the account owner can manage billing settings.</p>
      </div>
    );
  }

  const currentPlan = ctx.tenant.plan || 'free';
  const limits = getPlanLimits(currentPlan);
  const planDisplay = PRICING_DISPLAY.find(p => p.id === currentPlan) || PRICING_DISPLAY[0];

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your plan and payment method
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              You are on the <span className="font-semibold text-gray-900">{limits.name}</span> plan
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {planDisplay.price !== null ? `$${planDisplay.price}` : 'Custom'}
            </div>
            <div className="text-sm text-gray-500">{planDisplay.period}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-500">Stores</div>
            <div className="text-lg font-semibold text-gray-900">
              {ctx.stores.length} / {limits.maxStores === Infinity ? '∞' : limits.maxStores}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-500">AI Reviews / month</div>
            <div className="text-lg font-semibold text-gray-900">
              {limits.maxReviewsPerMonth === Infinity ? 'Unlimited' : limits.maxReviewsPerMonth}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA (if not on highest plan) */}
      {currentPlan !== 'enterprise' && currentPlan !== 'pro' && (
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Upgrade Your Plan</h3>
          </div>
          <p className="text-blue-100 text-sm mb-4">
            Get more stores, unlimited reviews, and advanced features.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-all"
          >
            View Plans <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Plan Features */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Plan Includes</h3>
        <ul className="space-y-2">
          {(planDisplay.highlights || []).map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
