import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Per-user server client — respects RLS, for admin pages and authenticated API routes
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from Server Components where cookies are read-only.
            // This can be safely ignored if middleware refreshes sessions.
          }
        },
      },
    }
  );
}

// Helper: get authenticated user or null
export async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// Helper: get user's tenant membership
export async function getUserTenantContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: memberships } = await supabase
    .from('tenant_members')
    .select(`
      tenant_id,
      role,
      store_ids,
      tenants (id, name, slug, plan, owner_id)
    `)
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    // User exists but has no tenant — needs onboarding
    return { user, tenant: null, role: null, stores: [] as any[], memberships: [] };
  }

  // Use first tenant (multi-tenant switching can be added later)
  const primary = memberships[0];

  // Fetch accessible stores
  const storeQuery = supabase
    .from('stores')
    .select('id, name, slug, place_id')
    .eq('tenant_id', primary.tenant_id);

  // If staff with specific store_ids, filter further
  if (primary.role === 'staff' && primary.store_ids && primary.store_ids.length > 0) {
    storeQuery.in('id', primary.store_ids);
  }

  const { data: stores } = await storeQuery;

  return {
    user,
    tenant: primary.tenants as any,
    role: primary.role as 'owner' | 'manager' | 'staff',
    stores: stores || [],
    memberships,
  };
}
