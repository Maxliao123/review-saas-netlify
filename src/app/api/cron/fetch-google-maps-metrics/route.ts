import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleClientForTenant } from '@/lib/google-business';

export const dynamic = 'force-dynamic';

// Metrics to fetch from the Business Profile Performance API
const METRIC_KEYS = [
  'BUSINESS_DIRECTION_REQUESTS',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
] as const;

// Map API metric names to our DB column names
const METRIC_TO_COLUMN: Record<string, string> = {
  BUSINESS_DIRECTION_REQUESTS: 'direction_requests',
  CALL_CLICKS: 'phone_calls',
  WEBSITE_CLICKS: 'website_clicks',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('cron_secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outputLog: string[] = [];

    // Find all tenants on Pro or Enterprise plans that have Google credentials
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, plan')
      .in('plan', ['pro', 'enterprise']);

    if (!tenants || tenants.length === 0) {
      outputLog.push('No Pro/Enterprise tenants found.');
      return NextResponse.json({ success: true, log: outputLog });
    }

    outputLog.push(`Found ${tenants.length} Pro/Enterprise tenant(s).`);

    // Date range: last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (d: Date) => ({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    });

    for (const tenant of tenants) {
      try {
        const client = await getGoogleClientForTenant(String(tenant.id));
        if (!client) {
          outputLog.push(`[Tenant ${tenant.id}] No Google credentials, skipping.`);
          continue;
        }

        const { oauth2Client } = client;

        // Get stores for this tenant that have a place_id (Google location)
        const { data: stores } = await supabaseAdmin
          .from('stores')
          .select('id, name, place_id, google_location_name')
          .eq('tenant_id', tenant.id)
          .not('place_id', 'is', null);

        if (!stores || stores.length === 0) {
          outputLog.push(`[Tenant ${tenant.id}] No stores with place_id, skipping.`);
          continue;
        }

        for (const store of stores) {
          try {
            // The location resource name for the Performance API
            // Format: locations/{locationId}
            const locationName = store.google_location_name || `locations/${store.place_id}`;

            // Fetch each metric as a time series
            const dailyData = new Map<string, {
              direction_requests: number;
              phone_calls: number;
              website_clicks: number;
              search_impressions: number;
              photo_views: number;
            }>();

            for (const metric of METRIC_KEYS) {
              try {
                const url = `https://businessprofileperformance.googleapis.com/v1/${locationName}:getDailyMetricsTimeSeries`;
                const res = await oauth2Client.request({
                  url,
                  params: {
                    dailyMetric: metric,
                    'dailyRange.startDate.year': formatDate(startDate).year,
                    'dailyRange.startDate.month': formatDate(startDate).month,
                    'dailyRange.startDate.day': formatDate(startDate).day,
                    'dailyRange.endDate.year': formatDate(endDate).year,
                    'dailyRange.endDate.month': formatDate(endDate).month,
                    'dailyRange.endDate.day': formatDate(endDate).day,
                  },
                });

                const timeSeries = (res.data as any)?.timeSeries?.datedValues || [];

                for (const entry of timeSeries) {
                  const dateObj = entry.date;
                  if (!dateObj) continue;
                  const dateStr = `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
                  const value = parseInt(entry.value || '0', 10);

                  if (!dailyData.has(dateStr)) {
                    dailyData.set(dateStr, {
                      direction_requests: 0,
                      phone_calls: 0,
                      website_clicks: 0,
                      search_impressions: 0,
                      photo_views: 0,
                    });
                  }

                  const row = dailyData.get(dateStr)!;

                  // Map metric to column
                  if (metric === 'BUSINESS_DIRECTION_REQUESTS') {
                    row.direction_requests += value;
                  } else if (metric === 'CALL_CLICKS') {
                    row.phone_calls += value;
                  } else if (metric === 'WEBSITE_CLICKS') {
                    row.website_clicks += value;
                  } else if (metric === 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH' || metric === 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH') {
                    row.search_impressions += value;
                  }
                }
              } catch (metricErr: any) {
                outputLog.push(`[Tenant ${tenant.id}] [Store ${store.name}] Failed to fetch ${metric}: ${metricErr.message}`);
              }
            }

            // Also try to fetch photo views (separate endpoint or metric if available)
            // Note: BUSINESS_PHOTOS_VIEWS_MERCHANT may not be available in all regions
            try {
              const photoUrl = `https://businessprofileperformance.googleapis.com/v1/${locationName}:getDailyMetricsTimeSeries`;
              const photoRes = await oauth2Client.request({
                url: photoUrl,
                params: {
                  dailyMetric: 'PHOTOS_VIEWS_MERCHANT',
                  'dailyRange.startDate.year': formatDate(startDate).year,
                  'dailyRange.startDate.month': formatDate(startDate).month,
                  'dailyRange.startDate.day': formatDate(startDate).day,
                  'dailyRange.endDate.year': formatDate(endDate).year,
                  'dailyRange.endDate.month': formatDate(endDate).month,
                  'dailyRange.endDate.day': formatDate(endDate).day,
                },
              });

              const photoSeries = (photoRes.data as any)?.timeSeries?.datedValues || [];
              for (const entry of photoSeries) {
                const dateObj = entry.date;
                if (!dateObj) continue;
                const dateStr = `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
                const value = parseInt(entry.value || '0', 10);

                if (!dailyData.has(dateStr)) {
                  dailyData.set(dateStr, {
                    direction_requests: 0,
                    phone_calls: 0,
                    website_clicks: 0,
                    search_impressions: 0,
                    photo_views: 0,
                  });
                }
                dailyData.get(dateStr)!.photo_views += value;
              }
            } catch {
              // Photo views metric may not be available — that's fine
            }

            // Upsert into google_maps_metrics
            const upsertRows = Array.from(dailyData.entries()).map(([date, values]) => ({
              tenant_id: tenant.id,
              store_id: store.id,
              date,
              ...values,
              fetched_at: new Date().toISOString(),
            }));

            if (upsertRows.length > 0) {
              const { error: upsertError } = await supabaseAdmin
                .from('google_maps_metrics')
                .upsert(upsertRows, { onConflict: 'store_id,date' });

              if (upsertError) {
                outputLog.push(`[Tenant ${tenant.id}] [Store ${store.name}] Upsert error: ${upsertError.message}`);
              } else {
                outputLog.push(`[Tenant ${tenant.id}] [Store ${store.name}] Upserted ${upsertRows.length} days of metrics.`);
              }
            } else {
              outputLog.push(`[Tenant ${tenant.id}] [Store ${store.name}] No metric data returned.`);
            }
          } catch (storeErr: any) {
            outputLog.push(`[Tenant ${tenant.id}] [Store ${store.name}] Error: ${storeErr.message}`);
          }
        }
      } catch (tenantErr: any) {
        outputLog.push(`[Tenant ${tenant.id}] Unexpected error: ${tenantErr.message}`);
      }
    }

    return NextResponse.json({ success: true, log: outputLog });
  } catch (error: any) {
    console.error('Error in fetch-google-maps-metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
