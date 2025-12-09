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
    const params = event.queryStringParameters || {};
    const daysRaw = params.days || "30";
    const storeId = (params.store_id || "1").trim(); // 預設先用 1（Memory Corner）

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
      // 從 store_daily_funnel 取指定門店 + 區間
      const { rows: result } = await client.query(
        `
        SELECT
          day,
          store_id,
          generated_count,
          clicked_count,
          posted_count,
          click_rate_pct,
          posted_rate_pct,
          avg_hours_to_click
        FROM store_daily_funnel
        WHERE store_id = $1
          AND day >= (CURRENT_DATE - ($2::int - 1))
        ORDER BY day ASC
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
    console.error("funnel error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

