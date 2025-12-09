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
    const params = event.queryStringParameters || {};
    const daysRaw = params.days || "30";
    const storeId = (params.store_id || "1").trim();

    const days = parseInt(daysRaw, 10);
    if (isNaN(days) || days <= 0 || days > 365) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Invalid days" }),
      };
    }

    const client = await pool.connect();
    let rows;
    try {
      // 從 tag_daily_usage 聚合出這段時間各標籤的表現
      const { rows: result } = await client.query(
        `
        SELECT
          tag,
          SUM(generated_count)::int AS generated_count,
          SUM(clicked_count)::int   AS clicked_count,
          CASE
            WHEN SUM(generated_count) > 0
            THEN ROUND(
              SUM(clicked_count)::numeric * 100.0 / SUM(generated_count),
              1
            )
            ELSE NULL
          END AS click_rate_pct
        FROM tag_daily_usage
        WHERE store_id = $1
          AND day >= (CURRENT_DATE - ($2::int - 1))
        GROUP BY tag
        ORDER BY generated_count DESC, tag ASC
        `,
        [storeId, days]
      );
      rows = result;
    } finally {
      client.release();
    }

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rows),
    };
  } catch (err) {
    console.error("tag_funnel error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

