-- ============================================
-- Migration 002: Notification System
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_channels (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email','line','slack','whatsapp')),
  is_active BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  -- config examples:
  -- email:    { "recipients": ["owner@example.com"] }
  -- line:     { "channel_access_token": "...", "target_user_id": "..." }
  -- slack:    { "webhook_url": "https://hooks.slack.com/services/..." }
  -- whatsapp: { "phone_number": "+1...", "provider": "twilio", "account_sid": "...", "auth_token": "..." }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, channel_type)
);

CREATE TABLE IF NOT EXISTS public.notification_log (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  channel_type TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'new_review', 'negative_review', 'weekly_report'
  payload JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Tenant members can read notification channels for their stores
CREATE POLICY "Tenant members read notification channels"
  ON public.notification_channels FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Owner/manager can manage notification channels
CREATE POLICY "Managers manage notification channels"
  ON public.notification_channels FOR ALL
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner','manager')
    )
  );

-- Tenant members can read notification logs
CREATE POLICY "Tenant members read notification logs"
  ON public.notification_log FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_channels_store ON public.notification_channels(store_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_store ON public.notification_log(store_id, created_at DESC);
