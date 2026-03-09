-- Migration 015: API Keys + Webhooks
-- Enables: Open API (Phase 4 P0) + CRM/Webhook integrations (Phase 3 P1)

-- ============================================================
-- 1. API Keys — Public API access for partners / integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                              -- "Production Key", "Staging Key"
  key_prefix TEXT NOT NULL,                         -- First 8 chars for identification (rm_live_xxxx)
  key_hash TEXT NOT NULL,                           -- SHA-256 hash of full key
  scopes TEXT[] DEFAULT ARRAY['read']::TEXT[],      -- 'read', 'write', 'analytics', 'admin'
  rate_limit_per_hour INTEGER DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                           -- NULL = no expiry
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix) WHERE is_active = true;
CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage API keys"
  ON api_keys FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. Webhooks — Event delivery to external systems
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                               -- "Salesforce Sync", "Slack Alerts"
  url TEXT NOT NULL,                                -- HTTPS endpoint
  secret TEXT,                                      -- HMAC signing secret
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],    -- Event types to subscribe to
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(tenant_id) WHERE is_active = true;

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage webhooks"
  ON webhooks FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Webhook Delivery Log — Track delivery attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  duration_ms INTEGER,
  attempt INTEGER DEFAULT 1,
  delivered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, delivered_at DESC);

-- ============================================================
-- 4. AI Training Data — Approved/rejected reply pairs for fine-tuning
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_training_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews_raw(id) ON DELETE SET NULL,
  vertical TEXT DEFAULT 'restaurant',
  review_rating INTEGER NOT NULL,
  review_text TEXT,
  reply_text TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'rejected', 'edited')),
  edited_text TEXT,                                  -- If owner edited before approving
  confidence_score INTEGER,                          -- Confidence at time of draft
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_training_tenant ON ai_training_data(tenant_id, vertical);
CREATE INDEX idx_training_outcome ON ai_training_data(outcome, vertical);

-- RLS
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read training data"
  ON ai_training_data FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. Add plan feature flags for new features
-- ============================================================
-- (Plan gating handled in src/lib/plan-limits.ts)
