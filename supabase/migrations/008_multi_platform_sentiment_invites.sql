-- Migration 008: Multi-Platform Reviews, Sentiment Analysis, Review Invites
-- =========================================================================
-- ACTUAL DB TYPES: tenants.id=UUID, stores.id=BIGINT, reviews_raw.id=UUID

-- ── A. Extend reviews_raw for multi-platform + sentiment ──

ALTER TABLE public.reviews_raw
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'google'
    CHECK (platform IN ('google', 'facebook', 'yelp', 'tripadvisor')),
  ADD COLUMN IF NOT EXISTS external_review_id TEXT,
  ADD COLUMN IF NOT EXISTS normalized_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS sentiment_label TEXT
    CHECK (sentiment_label IN ('positive', 'negative', 'neutral', 'mixed')),
  ADD COLUMN IF NOT EXISTS emotion_tags TEXT[],
  ADD COLUMN IF NOT EXISTS key_topics TEXT[],
  ADD COLUMN IF NOT EXISTS sentiment_analyzed_at TIMESTAMPTZ;

-- Backfill external_review_id from google_review_id
UPDATE public.reviews_raw
  SET external_review_id = google_review_id
  WHERE external_review_id IS NULL AND google_review_id IS NOT NULL;

-- Backfill normalized_rating from rating
UPDATE public.reviews_raw
  SET normalized_rating = rating::NUMERIC
  WHERE normalized_rating IS NULL AND rating IS NOT NULL;

-- Unique constraint per platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_platform_external
  ON public.reviews_raw(platform, external_review_id)
  WHERE external_review_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_platform ON public.reviews_raw(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON public.reviews_raw(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment_pending
  ON public.reviews_raw(id) WHERE sentiment_analyzed_at IS NULL AND content IS NOT NULL;

-- ── B. Platform credentials (tenant_id is UUID) ──

CREATE TABLE IF NOT EXISTS public.platform_credentials (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'yelp', 'tripadvisor', 'twilio_sms')),
  account_identifier TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, platform)
);

ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage platform credentials"
  ON public.platform_credentials FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ── C. Platform summaries (store_id is BIGINT) ──

CREATE TABLE IF NOT EXISTS public.platform_summaries (
  id SERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google', 'facebook', 'yelp', 'tripadvisor')),
  overall_rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  meta JSONB DEFAULT '{}',
  UNIQUE(store_id, platform)
);

ALTER TABLE public.platform_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read platform summaries"
  ON public.platform_summaries FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- ── D. Review invites (store_id BIGINT, tenant_id UUID) ──

CREATE TABLE IF NOT EXISTS public.review_invites (
  id SERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient TEXT NOT NULL,
  recipient_name TEXT,
  invite_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'opened', 'completed', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.review_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_review_invites_store ON public.review_invites(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_invites_token ON public.review_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_review_invites_tenant ON public.review_invites(tenant_id);

CREATE POLICY "Tenant members read invites"
  ON public.review_invites FOR SELECT
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Anon can update invite status by token (for open/complete tracking)
CREATE POLICY "Anon update invite by token"
  ON public.review_invites FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── E. Create or extend usage_monthly (tenant_id UUID, store_id BIGINT) ──

CREATE TABLE IF NOT EXISTS public.usage_monthly (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_id BIGINT REFERENCES public.stores(id) ON DELETE SET NULL,
  year_month TEXT NOT NULL,
  reviews_generated INTEGER NOT NULL DEFAULT 0,
  scans_tracked INTEGER NOT NULL DEFAULT 0,
  replies_drafted INTEGER NOT NULL DEFAULT 0,
  replies_published INTEGER NOT NULL DEFAULT 0,
  invites_sent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, store_id, year_month)
);

-- If table already existed, just add missing column
ALTER TABLE public.usage_monthly
  ADD COLUMN IF NOT EXISTS invites_sent INTEGER NOT NULL DEFAULT 0;

-- Update increment_usage with correct UUID/BIGINT types
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_tenant_id UUID,
  p_store_id BIGINT,
  p_year_month TEXT,
  p_field TEXT DEFAULT 'reviews_generated'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usage_monthly (tenant_id, store_id, year_month, reviews_generated, scans_tracked, replies_drafted, replies_published, invites_sent, updated_at)
  VALUES (p_tenant_id, p_store_id, p_year_month, 0, 0, 0, 0, 0, now())
  ON CONFLICT (tenant_id, store_id, year_month) DO NOTHING;

  IF p_field = 'reviews_generated' THEN
    UPDATE public.usage_monthly SET reviews_generated = reviews_generated + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  ELSIF p_field = 'scans_tracked' THEN
    UPDATE public.usage_monthly SET scans_tracked = scans_tracked + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  ELSIF p_field = 'replies_drafted' THEN
    UPDATE public.usage_monthly SET replies_drafted = replies_drafted + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  ELSIF p_field = 'replies_published' THEN
    UPDATE public.usage_monthly SET replies_published = replies_published + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  ELSIF p_field = 'invites_sent' THEN
    UPDATE public.usage_monthly SET invites_sent = invites_sent + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND store_id = p_store_id AND year_month = p_year_month;
  END IF;
END;
$$;
