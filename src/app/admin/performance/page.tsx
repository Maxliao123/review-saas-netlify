import { getUserTenantContext } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Users,
  Package,
  BadgeCheck,
  DollarSign,
  Trophy,
  Star,
  AlertTriangle,
  Clock,
  Send,
  Activity,
} from 'lucide-react';
import PerformanceClient from './PerformanceClient';

export const metadata = {
  title: 'Performance — ReplyWise AI',
};

export default async function PerformancePage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/admin/onboarding');

  const storeIds = (ctx.stores || []).map((s) => s.id);
  if (storeIds.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">No stores configured. Set up a store first.</p>
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdmin();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel data fetches
  const [
    staffRes,
    verificationsRes,
    feedbackRes,
    totalMembersRes,
    activePackagesRes,
    todayCheckinsRes,
    dormantMembersRes,
    expiringCreditsRes,
    monthRevenueRes,
  ] = await Promise.all([
    // Staff list
    supabase
      .from('staff')
      .select('id, name, commission_rate, is_active')
      .in('store_id', storeIds)
      .eq('is_active', true),

    // Verifications this month (for staff ranking)
    supabase
      .from('verifications')
      .select('staff_id, credits_deducted')
      .in('store_id', storeIds)
      .gte('verified_at', monthStart),

    // Feedback (for avg rating per staff)
    supabase
      .from('member_feedback')
      .select('staff_id, overall_rating')
      .in('store_id', storeIds)
      .not('staff_id', 'is', null),

    // Total members count
    supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds),

    // Active packages count
    supabase
      .from('member_credits')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .eq('status', 'active'),

    // Today's check-ins
    supabase
      .from('verifications')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('verified_at', todayStart.toISOString()),

    // Dormant members (no visit in 30+ days, still active)
    supabase
      .from('members')
      .select('id, name, phone, last_visit_at, status')
      .in('store_id', storeIds)
      .eq('status', 'active')
      .lt('last_visit_at', thirtyDaysAgo)
      .order('last_visit_at', { ascending: true })
      .limit(20),

    // Expiring credits (next 30 days)
    supabase
      .from('member_credits')
      .select(`
        id, package_name, total_units, used_units, expires_at,
        members!inner(name, phone)
      `)
      .in('store_id', storeIds)
      .eq('status', 'active')
      .lte('expires_at', thirtyDaysFromNow)
      .gte('expires_at', now.toISOString())
      .order('expires_at', { ascending: true })
      .limit(20),

    // This month's revenue (from member_credits purchased_at)
    supabase
      .from('member_credits')
      .select('package_id, package_name')
      .in('store_id', storeIds)
      .gte('purchased_at', monthStart),
  ]);

  // Calculate revenue from package prices
  const packageIds = [...new Set((monthRevenueRes.data || []).map((r) => r.package_id).filter(Boolean))];
  let monthRevenue = 0;
  if (packageIds.length > 0) {
    const { data: pkgPrices } = await supabase
      .from('credit_packages')
      .select('id, price')
      .in('id', packageIds);

    const priceMap: Record<string, number> = {};
    for (const p of pkgPrices || []) {
      priceMap[p.id] = Number(p.price);
    }
    for (const r of monthRevenueRes.data || []) {
      if (r.package_id && priceMap[r.package_id]) {
        monthRevenue += priceMap[r.package_id];
      }
    }
  }

  // Build staff ranking
  const staffList = staffRes.data || [];
  const verifications = verificationsRes.data || [];
  const feedbacks = feedbackRes.data || [];

  const staffRanking = staffList.map((s) => {
    const staffVerifications = verifications.filter((v) => v.staff_id === s.id);
    const staffFeedback = feedbacks.filter((f) => f.staff_id === s.id);
    const totalCheckins = staffVerifications.length;
    const avgRating = staffFeedback.length > 0
      ? staffFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / staffFeedback.length
      : 0;
    const totalCredits = staffVerifications.reduce((sum, v) => sum + (v.credits_deducted || 0), 0);
    const commission = totalCredits * Number(s.commission_rate || 0);

    return {
      id: s.id,
      name: s.name,
      total_checkins: totalCheckins,
      avg_rating: Math.round(avgRating * 10) / 10,
      review_count: staffFeedback.length,
      commission: Math.round(commission * 100) / 100,
    };
  }).sort((a, b) => b.total_checkins - a.total_checkins);

  // Serialize dormant members
  const dormant = (dormantMembersRes.data || []).map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    last_visit_at: m.last_visit_at,
    days_since: Math.floor((now.getTime() - new Date(m.last_visit_at).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // Serialize expiring credits
  const expiring = (expiringCreditsRes.data || []).map((c: any) => ({
    id: c.id,
    package_name: c.package_name,
    remaining: c.total_units - c.used_units,
    total: c.total_units,
    expires_at: c.expires_at,
    days_until: Math.ceil((new Date(c.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    member_name: c.members?.name || 'Unknown',
    member_phone: c.members?.phone || '',
  }));

  const stats = {
    totalMembers: totalMembersRes.count || 0,
    activePackages: activePackagesRes.count || 0,
    todayCheckins: todayCheckinsRes.count || 0,
    monthRevenue,
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PerformanceClient
        stats={stats}
        staffRanking={staffRanking}
        dormantMembers={dormant}
        expiringCredits={expiring}
      />
    </div>
  );
}
