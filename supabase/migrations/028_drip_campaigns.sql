-- 028: Drip email campaigns for automated follow-up emails
CREATE TABLE IF NOT EXISTS public.drip_emails (
  id SERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('thank_you', 'reminder_24h')),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('scan_event', 'generated_review', 'review_invite')),
  source_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email_type, source_type, source_id)
);

ALTER TABLE public.drip_emails ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_drip_pending ON public.drip_emails(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_drip_store ON public.drip_emails(store_id, created_at DESC);

CREATE POLICY "Tenant members read drip emails" ON public.drip_emails FOR SELECT
  USING (store_id IN (SELECT s.id FROM public.stores s JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id WHERE tm.user_id = auth.uid()));
