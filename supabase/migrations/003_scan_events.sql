-- ============================================
-- Migration 003: Scan Tracking + NFC
-- ============================================

CREATE TABLE IF NOT EXISTS public.scan_events (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  scan_source TEXT DEFAULT 'qr' CHECK (scan_source IN ('qr','nfc','link','unknown')),
  device_type TEXT,
  os_type TEXT,
  browser TEXT,
  ip_city TEXT,
  ip_country TEXT,
  referrer TEXT,
  user_agent TEXT,
  language TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_store_created ON scan_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_source ON scan_events(scan_source);

-- Public insert (anonymous customers scanning QR/NFC)
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert scan events"
  ON public.scan_events FOR INSERT
  WITH CHECK (true);

-- Tenant members can read scan events for their stores
CREATE POLICY "Tenant members read scan events"
  ON public.scan_events FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );
