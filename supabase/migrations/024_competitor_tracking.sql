-- Persistent competitor tracking
CREATE TABLE competitor_tracking (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  competitor_place_id TEXT NOT NULL,
  current_rating NUMERIC(2,1),
  current_review_count INTEGER DEFAULT 0,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, competitor_place_id)
);

CREATE TABLE competitor_snapshots (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES competitor_tracking(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  rating NUMERIC(2,1),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competitor_id, snapshot_date)
);

ALTER TABLE competitor_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read competitor tracking"
  ON competitor_tracking FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = competitor_tracking.tenant_id
    AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Tenant owners can manage competitor tracking"
  ON competitor_tracking FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = competitor_tracking.tenant_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'manager')
  ));

CREATE POLICY "Tenant members can read competitor snapshots"
  ON competitor_snapshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM competitor_tracking ct
    JOIN tenant_members tm ON tm.tenant_id = ct.tenant_id
    WHERE ct.id = competitor_snapshots.competitor_id
    AND tm.user_id = auth.uid()
  ));

CREATE INDEX idx_competitor_snapshots_date ON competitor_snapshots(competitor_id, snapshot_date);
