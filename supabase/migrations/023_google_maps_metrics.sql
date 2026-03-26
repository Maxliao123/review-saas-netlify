-- Google Maps performance metrics (Pro/Enterprise feature)
CREATE TABLE google_maps_metrics (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  direction_requests INTEGER DEFAULT 0,
  phone_calls INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  search_impressions INTEGER DEFAULT 0,
  photo_views INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, date)
);

ALTER TABLE google_maps_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read google maps metrics"
  ON google_maps_metrics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores s
    JOIN tenant_members tm ON tm.tenant_id = s.tenant_id
    WHERE s.id = google_maps_metrics.store_id
    AND tm.user_id = auth.uid()
  ));

CREATE INDEX idx_gmaps_metrics_store_date ON google_maps_metrics(store_id, date);
