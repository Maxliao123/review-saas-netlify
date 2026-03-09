-- Customer feedback table (captures negative feedback from survey)
CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  feedback_text TEXT,
  contact_info TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new, read, resolved
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast store-scoped queries
CREATE INDEX IF NOT EXISTS idx_customer_feedback_store_id ON public.customer_feedback(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON public.customer_feedback(created_at DESC);

-- RLS
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API inserts)
CREATE POLICY "service_role_feedback" ON public.customer_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow tenant members to read their stores' feedback
CREATE POLICY "tenant_members_read_feedback" ON public.customer_feedback
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      JOIN public.tenant_members tm ON tm.tenant_id = s.tenant_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Allow anonymous inserts (customer-facing form, no auth required)
CREATE POLICY "anon_insert_feedback" ON public.customer_feedback
  FOR INSERT TO anon
  WITH CHECK (true);
