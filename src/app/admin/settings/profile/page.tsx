import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileSettings from './ProfileSettings';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  const preferredLang = (ctx.user as any).user_metadata?.preferred_language || 'en';

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
      <p className="text-gray-500 mb-8">
        Manage your account preferences and language settings.
      </p>

      <ProfileSettings
        user={{ id: ctx.user.id, email: ctx.user.email }}
        initialLang={preferredLang}
      />
    </div>
  );
}
