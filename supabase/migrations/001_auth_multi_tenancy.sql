-- ============================================
-- Migration 001: Auth & Multi-Tenancy Foundation
-- ============================================

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en'
    CHECK (preferred_language IN ('en','zh','ko','ja','fr','es')),
  timezone TEXT DEFAULT 'America/Vancouver',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tenants (business entity / organization)
CREATE TABLE IF NOT EXISTS public.tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','pro')),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read tenant"
  ON public.tenants FOR SELECT
  USING (
    id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Owner can update tenant"
  ON public.tenants FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create tenant"
  ON public.tenants FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 3. Tenant Members (role-based access)
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('owner','manager','staff')),
  store_ids INTEGER[] DEFAULT '{}',
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own memberships"
  ON public.tenant_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner/manager can manage members"
  ON public.tenant_members FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner','manager')
    )
  );

-- 4. Google Credentials (per-tenant OAuth tokens)
CREATE TABLE IF NOT EXISTS public.google_credentials (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  google_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.google_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage google credentials"
  ON public.google_credentials FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 5. Add tenant_id FK to stores if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stores_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
  END IF;
END $$;

-- 6. RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Public can read stores by slug (for customer-facing pages)
CREATE POLICY "Public read stores by slug"
  ON public.stores FOR SELECT
  USING (true);

-- Only tenant owner/manager can modify stores
CREATE POLICY "Tenant managers can modify stores"
  ON public.stores FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner','manager')
    )
  );

CREATE POLICY "Tenant owner can insert stores"
  ON public.stores FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid() AND role IN ('owner','manager')
    )
  );

-- 7. RLS on reviews_raw
ALTER TABLE public.reviews_raw ENABLE ROW LEVEL SECURITY;

-- Members can read reviews for their stores
CREATE POLICY "Tenant members can read reviews"
  ON public.reviews_raw FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Owner/manager can update reviews (approve, edit drafts)
CREATE POLICY "Tenant managers can update reviews"
  ON public.reviews_raw FOR UPDATE
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner','manager')
    )
  );

-- Service role inserts reviews (from cron), so no INSERT policy needed for users

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON public.tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stores_tenant ON public.stores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_google_credentials_tenant ON public.google_credentials(tenant_id);
