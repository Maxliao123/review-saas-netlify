-- Migration 017: Review Response Specialist Marketplace
-- Enables: Phase 4 P2 — Marketplace for review response specialists

-- ============================================================
-- 1. Specialists — People who offer review response services
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_specialists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,                                          -- Short intro
  languages TEXT[] DEFAULT ARRAY['en']::TEXT[],       -- Languages they can write in
  verticals TEXT[] DEFAULT ARRAY['restaurant']::TEXT[], -- Industries they specialize in
  hourly_rate NUMERIC(10,2),                         -- Suggested rate (USD)
  per_review_rate NUMERIC(10,2) DEFAULT 2.00,        -- Per-review rate (USD)
  rating_avg NUMERIC(3,2) DEFAULT 0,                 -- Average rating from clients
  rating_count INTEGER DEFAULT 0,
  total_reviews_written INTEGER DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  response_time_avg_hours NUMERIC(5,1) DEFAULT 24,   -- Average turnaround
  is_verified BOOLEAN DEFAULT false,                  -- Platform-verified badge
  is_available BOOLEAN DEFAULT true,
  portfolio_samples JSONB DEFAULT '[]'::JSONB,        -- Sample review replies
  certifications TEXT[],                              -- e.g. "Google Business Profile Certified"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_specialist_user ON marketplace_specialists(user_id);
CREATE INDEX idx_specialist_available ON marketplace_specialists(is_available) WHERE is_available = true;
CREATE INDEX idx_specialist_rating ON marketplace_specialists(rating_avg DESC) WHERE is_available = true;
CREATE INDEX idx_specialist_verticals ON marketplace_specialists USING GIN(verticals);

ALTER TABLE marketplace_specialists ENABLE ROW LEVEL SECURITY;

-- Specialists can manage their own profile
CREATE POLICY "Specialists manage own profile"
  ON marketplace_specialists FOR ALL
  USING (user_id = auth.uid());

-- Anyone authenticated can view available specialists
CREATE POLICY "View available specialists"
  ON marketplace_specialists FOR SELECT
  USING (is_available = true);

-- ============================================================
-- 2. Marketplace Orders — Hire a specialist for reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES marketplace_specialists(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('one_time', 'batch', 'ongoing')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'disputed')),
  review_count INTEGER DEFAULT 1,                     -- Number of reviews to respond to
  price_per_review NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  instructions TEXT,                                   -- Special instructions from client
  deadline_at TIMESTAMPTZ,                            -- When the work should be done
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  client_rating INTEGER CHECK (client_rating BETWEEN 1 AND 5),
  client_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_tenant ON marketplace_orders(tenant_id);
CREATE INDEX idx_order_specialist ON marketplace_orders(specialist_id);
CREATE INDEX idx_order_status ON marketplace_orders(status) WHERE status IN ('pending', 'accepted', 'in_progress');

ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;

-- Tenant members can manage their orders
CREATE POLICY "Tenant members manage orders"
  ON marketplace_orders FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Specialists can view/update their assigned orders
CREATE POLICY "Specialists view assigned orders"
  ON marketplace_orders FOR SELECT
  USING (
    specialist_id IN (
      SELECT id FROM marketplace_specialists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Specialists update assigned orders"
  ON marketplace_orders FOR UPDATE
  USING (
    specialist_id IN (
      SELECT id FROM marketplace_specialists WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Marketplace Review Assignments — Individual review tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews_raw(id) ON DELETE SET NULL,
  specialist_id UUID NOT NULL REFERENCES marketplace_specialists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'revision_requested')),
  draft_reply TEXT,                                    -- Specialist's draft
  revision_notes TEXT,                                 -- Client feedback for revision
  revision_count INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assignment_order ON marketplace_assignments(order_id);
CREATE INDEX idx_assignment_specialist ON marketplace_assignments(specialist_id);
CREATE INDEX idx_assignment_review ON marketplace_assignments(review_id);

ALTER TABLE marketplace_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants manage assignments"
  ON marketplace_assignments FOR ALL
  USING (
    order_id IN (
      SELECT id FROM marketplace_orders WHERE
        tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
        OR specialist_id IN (SELECT id FROM marketplace_specialists WHERE user_id = auth.uid())
    )
  );
