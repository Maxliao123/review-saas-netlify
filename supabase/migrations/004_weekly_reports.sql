-- ============================================
-- Migration 004: Weekly Reports
-- ============================================

CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id),
  tenant_id INTEGER REFERENCES tenants(id),
  report_week DATE NOT NULL,
  data JSONB NOT NULL,
  delivered_via TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, report_week)
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read weekly reports"
  ON public.weekly_reports FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_weekly_reports_store_week ON public.weekly_reports(store_id, report_week DESC);
