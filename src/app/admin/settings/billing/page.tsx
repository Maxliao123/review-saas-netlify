import { getUserTenantContext, createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPlanLimits, PRICING_DISPLAY } from '@/lib/plan-limits';
import {
  CreditCard,
  ArrowUpRight,
  Check,
  Zap,
  Store,
  Plus,
} from 'lucide-react';
import { ManageSubscriptionButton, CheckoutButton } from './BillingActions';

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

  const supabase = await createSupabaseServerClient();
  const currentPlan = ctx.tenant.plan || 'free';
  const limits = getPlanLimits(currentPlan);
  const planDisplay = PRICING_DISPLAY.find(p => p.id === currentPlan) || PRICING_DISPLAY[0];

  // Fetch usage for current month
  const yearMonth = new Date().toISOString().slice(0, 7);
  const { data: usageRows } = await supabase
    .from('usage_monthly')
    .select('reviews_generated')
    .eq('tenant_id', ctx.tenant.id)
    .eq('year_month', yearMonth);

  const totalUsage = (usageRows || []).reduce((sum: number, r: any) => sum + (r.reviews_generated || 0), 0);

  // Check Stripe customer status
  const { data: tenantBilling } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', ctx.tenant.id)
    .single();

  const hasStripeCustomer = !!tenantBilling?.stripe_customer_id;

  // Determine next upgrade tier
  const nextPlanId = currentPlan === 'free' ? 'starter' : currentPlan === 'starter' ? 'pro' : null;

  // Usage percentage
  const maxReviews = limits.maxReviewsPerMonth === Infinity ? 0 : limits.maxReviewsPerMonth;
  const usagePct = maxReviews > 0 ? Math.min(Math.round((totalUsage / maxReviews) * 100), 100) : 0;

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
            <div className="text-sm text-gray-500">AI Reviews This Month</div>
            <div className="text-lg font-semibold text-gray-900">
              {totalUsage.toLocaleString()} / {maxReviews > 0 ? maxReviews.toLocaleString() : '∞'}
            </div>
            {maxReviews > 0 && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Manage Subscription */}
        {hasStripeCustomer && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <ManageSubscriptionButton />
          </div>
        )}
      </div>

      {/* Add Store CTA — show when plan allows more stores */}
      {ctx.stores.length < limits.maxStores && limits.maxStores > 1 && (
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-blue-100 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  You can add {limits.maxStores - ctx.stores.length} more store{limits.maxStores - ctx.stores.length > 1 ? 's' : ''}!
                </h3>
                <p className="text-sm text-gray-500">
                  Your {limits.name} plan supports up to {limits.maxStores} stores. Set up another location to start collecting reviews.
                </p>
              </div>
            </div>
            <Link
              href="/admin/stores/setup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add Store
            </Link>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {nextPlanId && (
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Upgrade Your Plan</h3>
          </div>
          <p className="text-blue-100 text-sm mb-4">
            Get more stores, unlimited reviews, and advanced features.
          </p>
          <div className="flex items-center gap-3">
            <CheckoutButton planId={nextPlanId} label={`Upgrade to ${nextPlanId.charAt(0).toUpperCase() + nextPlanId.slice(1)}`} />
            <Link
              href="/pricing"
              className="text-sm font-medium text-blue-200 hover:text-white flex items-center gap-1"
            >
              Compare plans <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Plan Features */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Plan Includes</h3>
        <ul className="space-y-2">
          {(planDisplay.highlights || []).map((feature: string) => (
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
