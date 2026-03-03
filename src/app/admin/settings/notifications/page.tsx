import { getUserTenantContext, createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NotificationSettings from './NotificationSettings';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  const supabase = await createSupabaseServerClient();

  // Fetch notification channels for all stores
  const storeIds = ctx.stores.map(s => s.id);
  const { data: channels } = storeIds.length > 0
    ? await supabase
        .from('notification_channels')
        .select('*')
        .in('store_id', storeIds)
    : { data: [] };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h1>
      <p className="text-gray-500 mb-8">
        Get notified instantly when customers leave reviews. Configure channels per store.
      </p>

      <NotificationSettings
        stores={ctx.stores}
        channels={channels || []}
        role={ctx.role!}
      />
    </div>
  );
}
