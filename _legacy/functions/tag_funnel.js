// functions/tag_funnel.js
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

    // days: 預設 30
    let days = parseInt(daysRaw, 10);
    if (Number.isNaN(days) || days <= 0) {
      days = 30;
    }

    // store_id: 預設 1
    let storeId = parseInt(storeIdRaw, 10);
    if (Number.isNaN(storeId) || storeId <= 0) {
      storeId = 1;
    }

    const client = await pool.connect();
    try {
      /**
       * 思路：
       * - 從 generator_events 把最近 N 天、指定 store 的事件撈出來
       * - 對 tags_used 做 unnest，變成一列一個 tag
       * - event_type = 'generate' 算在 generated_count
       * - event_type = 'click_google' 算在 clicked_count
       */
      const { rows } = await client.query(
        `
        WITH exploded AS (
          SELECT
            store_id,
            unnest(tags_used) AS tag,
            event_type,
            created_at
          FROM generator_events
          WHERE store_id = $1
            AND created_at >= (now() - $2 * INTERVAL '1 day')
            AND tags_used IS NOT NULL
        )
        SELECT
          tag,
          SUM(CASE WHEN event_type = 'generate' THEN 1 ELSE 0 END) AS generated_count,
          SUM(CASE WHEN event_type = 'click_google' THEN 1 ELSE 0 END) AS clicked_count,
          CASE 
            WHEN SUM(CASE WHEN event_type = 'generate' THEN 1 ELSE 0 END) > 0
              THEN SUM(CASE WHEN event_type = 'click_google' THEN 1 ELSE 0 END)
                   * 100.0
                   / SUM(CASE WHEN event_type = 'generate' THEN 1 ELSE 0 END)
            ELSE NULL
          END AS click_rate_pct
        FROM exploded
        GROUP BY tag
        ORDER BY generated_count DESC, tag ASC;
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
    console.error("tag_funnel.js error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};


