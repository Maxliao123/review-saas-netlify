-- Migration 014: A/B Testing for Reply Styles
-- Track tone experiments to optimize reply effectiveness.

CREATE TABLE IF NOT EXISTS public.ab_experiments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id    BIGINT REFERENCES public.stores(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                            -- e.g. "Formal vs Casual Tone"
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  variants    JSONB NOT NULL DEFAULT '[]'::jsonb,       -- [{id, label, toneOverride, weight}]
  created_at  TIMESTAMPTZ DEFAULT now(),
  ended_at    TIMESTAMPTZ
);

-- Track which variant was used for each review reply
ALTER TABLE public.reviews_raw
  ADD COLUMN IF NOT EXISTS ab_experiment_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ab_variant_id TEXT DEFAULT NULL;

-- RLS
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.ab_experiments
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_experiments_tenant ON public.ab_experiments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_ab ON public.reviews_raw(ab_experiment_id) WHERE ab_experiment_id IS NOT NULL;

COMMENT ON TABLE public.ab_experiments IS 'A/B experiments for reply tone optimization';
COMMENT ON COLUMN public.ab_experiments.variants IS 'JSON array: [{id: "formal", label: "Formal", toneOverride: "Professional and Formal", weight: 50}, ...]';
