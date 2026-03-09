-- Migration 016: POS Integrations + White-Label + NFC Hardware
-- Enables: Phase 4 remaining items

-- ============================================================
-- 1. POS Integrations — Connect POS systems for auto-invites
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pos_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('toast', 'clover', 'square', 'lightspeed', 'shopify', 'custom')),
  name TEXT NOT NULL,                               -- "Main Register", "Bar POS"
  api_key_encrypted TEXT,                           -- Encrypted POS API key
  webhook_url TEXT,                                 -- Our endpoint for this integration
  config JSONB DEFAULT '{}'::JSONB,                 -- Provider-specific config
  auto_invite_enabled BOOLEAN DEFAULT false,
  auto_invite_delay_minutes INTEGER DEFAULT 60,     -- Delay after checkout
  auto_invite_channel TEXT DEFAULT 'sms' CHECK (auto_invite_channel IN ('sms', 'email', 'both')),
  min_transaction_amount NUMERIC(10,2) DEFAULT 0,   -- Only invite if spend >= X
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  transactions_synced INTEGER DEFAULT 0,
  invites_triggered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pos_tenant ON pos_integrations(tenant_id);
CREATE INDEX idx_pos_store ON pos_integrations(store_id) WHERE is_active = true;

ALTER TABLE pos_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage POS integrations"
  ON pos_integrations FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. White-Label Config — Custom branding per tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whitelabel_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT,                                  -- Custom product name
  logo_url TEXT,                                    -- Custom logo
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#2563eb',              -- Hex color
  secondary_color TEXT DEFAULT '#1e40af',
  accent_color TEXT DEFAULT '#3b82f6',
  custom_domain TEXT,                               -- e.g. "reviews.clientbrand.com"
  custom_domain_verified BOOLEAN DEFAULT false,
  hide_powered_by BOOLEAN DEFAULT false,
  custom_email_from TEXT,                           -- "noreply@clientbrand.com"
  custom_email_name TEXT,                           -- "ClientBrand Reviews"
  css_overrides TEXT,                               -- Custom CSS injection
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_whitelabel_tenant ON whitelabel_config(tenant_id);
CREATE INDEX idx_whitelabel_domain ON whitelabel_config(custom_domain) WHERE custom_domain IS NOT NULL;

ALTER TABLE whitelabel_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage white-label config"
  ON whitelabel_config FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. NFC/Hardware Devices — Track physical review collection devices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hardware_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('nfc_stand', 'nfc_card', 'qr_stand', 'table_talker', 'counter_display')),
  name TEXT NOT NULL,                               -- "Table 5 NFC", "Front Counter QR"
  serial_number TEXT,
  nfc_tag_id TEXT,                                  -- NFC tag UID
  location_description TEXT,                        -- "Near entrance", "Table 5"
  scan_count INTEGER DEFAULT 0,
  last_scan_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hardware_tenant ON hardware_devices(tenant_id);
CREATE INDEX idx_hardware_store ON hardware_devices(store_id);
CREATE INDEX idx_hardware_nfc ON hardware_devices(nfc_tag_id) WHERE nfc_tag_id IS NOT NULL;

ALTER TABLE hardware_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage hardware devices"
  ON hardware_devices FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );
