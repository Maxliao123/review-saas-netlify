// functions/funnel.js
const { Pool } = require("pg");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const pool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const qs = event.queryStringParameters || {};

    const daysRaw = qs.days;
    const storeIdRaw = qs.store_id;

    // days: 預設 30 天
    let days = parseInt(daysRaw, 10);
    if (Number.isNaN(days) || days <= 0) {
      days = 30;
    }

    // store_id: 預設 1（Memory Corner）
    let storeId = parseInt(storeIdRaw, 10);
    if (Number.isNaN(storeId) || storeId <= 0) {
      storeId = 1;
    }

    const client = await pool.connect();
    try {
      // 直接從 memorycorner_review_funnel 做 group by
      const { rows } = await client.query(
        `
        SELECT
          date_trunc('day', generated_at)::timestamptz AS day,
          COUNT(*) AS generated_count,
          COUNT(*) FILTER (WHERE is_clicked) AS clicked_count,
          COUNT(*) FILTER (WHERE likely_posted) AS posted_count,
          CASE 
            WHEN COUNT(*) > 0 
              THEN COUNT(*) FILTER (WHERE is_clicked) * 100.0 / COUNT(*)
            ELSE NULL
          END AS click_rate_pct,
          CASE 
            WHEN COUNT(*) > 0 
              THEN COUNT(*) FILTER (WHERE likely_posted) * 100.0 / COUNT(*)
            ELSE NULL
          END AS posted_rate_pct,
          AVG(hours_to_click) AS avg_hours_to_click
        FROM memorycorner_review_funnel
        WHERE store_id = $1
          AND generated_at >= (now() - $2 * INTERVAL '1 day')
        GROUP BY day
        ORDER BY day DESC;
        `,
        [storeId, days]
      );

      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rows),
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("funnel.js error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

