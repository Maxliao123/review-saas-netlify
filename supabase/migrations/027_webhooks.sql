-- Migration 027: Enhanced Webhooks — Zapier/integration-ready webhook system
-- Adds webhook_configs (replaces old webhooks table for new integrations)
-- and enhanced webhook_deliveries with response tracking.
--
-- Note: The original `webhooks` + `webhook_deliveries` tables from migration 015
-- remain intact. This migration creates a parallel `webhook_configs` table with
-- a cleaner schema for the new Zapier-style integration UI.

-- ============================================================
-- 1. Webhook Configs — Per-tenant endpoint configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{"review.created"}',
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_configs_tenant ON webhook_configs(tenant_id);
CREATE INDEX idx_webhook_configs_active ON webhook_configs(tenant_id) WHERE enabled = true;

-- RLS
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage webhook configs"
  ON webhook_configs FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. Webhook Delivery Log — Track each dispatch attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_config_deliveries (
  id SERIAL PRIMARY KEY,
  webhook_config_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  status_code INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_config_deliveries_config
  ON webhook_config_deliveries(webhook_config_id, created_at DESC);

-- RLS (read-only via join to webhook_configs)
ALTER TABLE webhook_config_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view webhook deliveries"
  ON webhook_config_deliveries FOR SELECT
  USING (
    webhook_config_id IN (
      SELECT wc.id FROM webhook_configs wc
      JOIN tenant_members tm ON tm.tenant_id = wc.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert webhook deliveries"
  ON webhook_config_deliveries FOR INSERT
  WITH CHECK (true);
