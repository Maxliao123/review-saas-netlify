-- Migration 007: Add Stripe billing columns to tenants table
-- Supports subscription management via Stripe

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for looking up tenants by Stripe customer ID (webhook handling)
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id
  ON tenants (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Usage tracking table for plan limit enforcement
CREATE TABLE IF NOT EXISTS usage_monthly (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id     INTEGER REFERENCES stores(id) ON DELETE SET NULL,
  year_month   TEXT NOT NULL, -- format: '2026-03'
  reviews_generated INTEGER NOT NULL DEFAULT 0,
  scans_tracked    INTEGER NOT NULL DEFAULT 0,
  replies_drafted  INTEGER NOT NULL DEFAULT 0,
  replies_published INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, store_id, year_month)
);

-- RLS for usage tracking
ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own usage
CREATE POLICY "Tenant members can view usage"
  ON usage_monthly
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Only service role can insert/update usage (via API routes)
-- No INSERT/UPDATE policies for authenticated users — handled by admin client

-- RPC to atomically increment a usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  p_tenant_id INTEGER,
  p_store_id INTEGER,
  p_year_month TEXT,
  p_field TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO usage_monthly (tenant_id, store_id, year_month, reviews_generated, scans_tracked, replies_drafted, replies_published)
  VALUES (p_tenant_id, p_store_id, p_year_month, 0, 0, 0, 0)
  ON CONFLICT (tenant_id, store_id, year_month) DO NOTHING;

  IF p_field = 'reviews_generated' THEN
    UPDATE usage_monthly SET reviews_generated = reviews_generated + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  ELSIF p_field = 'scans_tracked' THEN
    UPDATE usage_monthly SET scans_tracked = scans_tracked + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  ELSIF p_field = 'replies_drafted' THEN
    UPDATE usage_monthly SET replies_drafted = replies_drafted + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  ELSIF p_field = 'replies_published' THEN
    UPDATE usage_monthly SET replies_published = replies_published + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  END IF;
END;
$$;
