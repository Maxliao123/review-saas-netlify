-- LINE notification binding verification codes
CREATE TABLE IF NOT EXISTS public.line_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  line_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_line_verif_code ON public.line_verifications(code, status);
CREATE INDEX idx_line_verif_store ON public.line_verifications(store_id);
