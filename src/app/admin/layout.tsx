import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import AdminSidebar from './AdminSidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getUserTenantContext();

  if (!ctx) {
    redirect('/auth/login');
  }

  // Check current path to avoid circular redirect for onboarding
  const headersList = await headers();
  const pathname = headersList.get('x-next-pathname') || headersList.get('x-invoke-path') || '';
  const isOnboarding = pathname.startsWith('/admin/onboarding');

  // User exists but no tenant, or tenant hasn't completed onboarding
  const needsOnboarding = !ctx.tenant || !ctx.tenant.onboarding_completed_at;

  if (needsOnboarding) {
    if (isOnboarding) {
      return (
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      );
    }
    redirect('/admin/onboarding');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <AdminSidebar
        user={ctx.user}
        tenant={ctx.tenant}
        role={ctx.role!}
        stores={ctx.stores || []}
      />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
