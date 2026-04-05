-- ============================================================
-- Migration 029: Membership + Booking + Verification MVP
-- Date: 2026-04-04
-- Description: Core tables for AI Digital Employee system
--   - members (customer membership with SMS token)
--   - services (service catalog)
--   - staff (technicians/service providers)
--   - credit_packages (session/credit/amount packages)
--   - member_credits (purchased packages with remaining tracking)
--   - bookings (appointments with verification codes)
--   - verifications (audit trail for check-ins)
--   - member_feedback (survey data before review redirect)
--   - points_transactions (loyalty points)
--   - automation_rules (SMS marketing rules)
-- ============================================================

-- 1. Members (客戶會員)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  language TEXT DEFAULT 'en',
  member_token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  points_balance INT DEFAULT 0,
  total_visits INT DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','churned')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  birthday DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, phone)
);

CREATE INDEX idx_members_store ON members(store_id);
CREATE INDEX idx_members_token ON members(member_token);
CREATE INDEX idx_members_phone ON members(store_id, phone);
CREATE INDEX idx_members_status ON members(store_id, status);
CREATE INDEX idx_members_last_visit ON members(store_id, last_visit_at);

-- 2. Services (服務項目)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
  price NUMERIC(10,2),
  credits_required INT DEFAULT 1,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_services_store ON services(store_id, is_active);

-- 3. Staff (技師/服務人員)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'technician' CHECK (role IN ('technician','manager')),
  service_ids UUID[] DEFAULT '{}',
  working_hours JSONB DEFAULT '{"mon":["09:00-18:00"],"tue":["09:00-18:00"],"wed":["09:00-18:00"],"thu":["09:00-18:00"],"fri":["09:00-18:00"],"sat":["10:00-17:00"],"sun":[]}',
  commission_rate NUMERIC(4,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_store ON staff(store_id, is_active);

-- 4. Credit Packages (點數/堂數/儲值方案)
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  package_type TEXT NOT NULL CHECK (package_type IN ('sessions','credits','amount')),
  total_units INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  valid_days INT DEFAULT 365,
  applicable_service_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_packages_store ON credit_packages(store_id, is_active);

-- 5. Member Credits (會員持有的方案)
CREATE TABLE IF NOT EXISTS member_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  package_id UUID REFERENCES credit_packages(id),
  package_name TEXT NOT NULL,
  package_type TEXT NOT NULL,
  total_units INT NOT NULL,
  used_units INT DEFAULT 0,
  remaining_units INT GENERATED ALWAYS AS (total_units - used_units) STORED,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','exhausted')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_member_credits_member ON member_credits(member_id, status);
CREATE INDEX idx_member_credits_expiry ON member_credits(store_id, expires_at) WHERE status = 'active';

-- 6. Bookings (預約)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  staff_id UUID REFERENCES staff(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','completed','cancelled','no_show')),
  verification_code TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES staff(id),
  credits_deducted INT DEFAULT 0,
  member_credit_id UUID REFERENCES member_credits(id),
  reminder_sent_at TIMESTAMPTZ,
  review_invited_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookings_store_date ON bookings(store_id, start_time);
CREATE INDEX idx_bookings_member ON bookings(member_id);
CREATE INDEX idx_bookings_staff ON bookings(staff_id, start_time);
CREATE INDEX idx_bookings_status ON bookings(store_id, status);
CREATE INDEX idx_bookings_verification ON bookings(verification_code, status) WHERE status = 'confirmed';

-- Prevent double-booking same staff at same time
CREATE UNIQUE INDEX idx_bookings_no_overlap ON bookings(staff_id, start_time) WHERE status = 'confirmed';

-- 7. Verifications (核銷審計記錄)
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  member_id UUID NOT NULL REFERENCES members(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  verification_code TEXT NOT NULL,
  credits_deducted INT NOT NULL,
  member_credit_id UUID REFERENCES member_credits(id),
  service_name TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verifications_store ON verifications(store_id, verified_at);
CREATE INDEX idx_verifications_staff ON verifications(staff_id, verified_at);
CREATE INDEX idx_verifications_member ON verifications(member_id);

-- 8. Member Feedback (問卷數據 — 在 Google Review 之前收集)
CREATE TABLE IF NOT EXISTS member_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  booking_id UUID REFERENCES bookings(id),
  staff_id UUID REFERENCES staff(id),
  overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  selected_tags TEXT[] DEFAULT '{}',
  positive_tags TEXT[] DEFAULT '{}',
  negative_tags TEXT[] DEFAULT '{}',
  custom_feedback TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive','neutral','negative')),
  redirected_to TEXT CHECK (redirected_to IN ('google_review','internal_report','none')),
  google_review_completed BOOLEAN DEFAULT false,
  points_awarded INT DEFAULT 0,
  source TEXT DEFAULT 'post_visit_sms',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_member_feedback_store ON member_feedback(store_id, created_at);
CREATE INDEX idx_member_feedback_staff ON member_feedback(staff_id);
CREATE INDEX idx_member_feedback_sentiment ON member_feedback(store_id, sentiment);

-- 9. Points Transactions (積分交易記錄)
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id),
  amount INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn_review','earn_referral','earn_purchase','redeem','expire','admin_adjust')),
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_points_member ON points_transactions(member_id, created_at);

-- 10. Automation Rules (SMS 自動化規則)
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'pre_visit_reminder','post_visit_review','post_visit_care',
    'dormant_alert','credit_expiry','birthday','follow_up'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  sms_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_automation_store ON automation_rules(store_id, rule_type, is_active);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for cron jobs and admin operations)
CREATE POLICY "Service role full access" ON members FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON staff FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON credit_packages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON member_credits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON member_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON points_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON automation_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tenant-scoped access for authenticated users
CREATE POLICY "Tenant members can manage members" ON members FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage services" ON services FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage staff" ON staff FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage credit_packages" ON credit_packages FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can view member_credits" ON member_credits FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));

CREATE POLICY "Tenant members can manage bookings" ON bookings FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can view verifications" ON verifications FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));

CREATE POLICY "Tenant members can manage feedback" ON member_feedback FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));

CREATE POLICY "Tenant members can view points" ON points_transactions FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())));

CREATE POLICY "Tenant members can manage automation" ON automation_rules FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));

-- Public access for member-facing pages (token-based, no login required)
CREATE POLICY "Public can insert feedback" ON member_feedback FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can read own bookings via store" ON bookings FOR SELECT TO anon USING (true);

-- ============================================================
-- Helper Functions
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-expire member credits
CREATE OR REPLACE FUNCTION check_credit_expiry()
RETURNS void AS $$
BEGIN
  UPDATE member_credits
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$ language 'plpgsql';

-- Auto-exhaust member credits when fully used
CREATE OR REPLACE FUNCTION check_credit_exhausted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.used_units >= NEW.total_units AND NEW.status = 'active' THEN
    NEW.status := 'exhausted';
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_exhaust_credits BEFORE UPDATE ON member_credits
  FOR EACH ROW EXECUTE FUNCTION check_credit_exhausted();
