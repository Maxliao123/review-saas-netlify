-- Migration 010: One-Click Review Approve Tokens
-- Enables token-based approval from email/Slack/LINE without login

CREATE TABLE IF NOT EXISTS public.review_approve_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  review_id UUID NOT NULL REFERENCES public.reviews_raw(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_review_approve_tokens_token ON public.review_approve_tokens(token);

-- Auto-cleanup expired tokens (can be called by cron or DB scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_approve_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.review_approve_tokens
  WHERE expires_at < now() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.review_approve_tokens IS 'One-click approve tokens sent via email/Slack notifications. Expires in 72h.';
