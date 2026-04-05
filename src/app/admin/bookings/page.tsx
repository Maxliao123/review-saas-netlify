import { getUserTenantContext } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import BookingsClient from './BookingsClient';

export const metadata = {
  title: 'Bookings — ReplyWise AI',
};

export default async function BookingsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/admin/onboarding');

  const storeIds = (ctx.stores || []).map((s) => s.id);
  if (storeIds.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">No stores configured. Set up a store first.</p>
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdmin();

  // Fetch today's bookings with member, service, staff info
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, start_time, end_time, status, verification_code, verified_at, notes,
      members!inner(id, name, phone),
      services!inner(id, name, duration_minutes),
      staff(id, name)
    `)
    .in('store_id', storeIds)
    .gte('start_time', todayStart.toISOString())
    .lte('start_time', todayEnd.toISOString())
    .order('start_time', { ascending: true });

  // Serialize for client
  const serialized = (bookings || []).map((b: any) => ({
    id: b.id,
    start_time: b.start_time,
    end_time: b.end_time,
    status: b.status,
    verification_code: b.verification_code,
    verified_at: b.verified_at,
    notes: b.notes,
    member_name: b.members?.name || 'Unknown',
    member_phone: b.members?.phone || '',
    service_name: b.services?.name || 'Unknown',
    service_duration: b.services?.duration_minutes || 0,
    staff_name: b.staff?.name || 'Unassigned',
  }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <BookingsClient bookings={serialized} storeCount={ctx.stores.length} />
    </div>
  );
}
