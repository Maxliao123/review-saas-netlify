// functions/funnel.js
const { Pool } = require("pg");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 跟 track.js / confirm.js 一樣，用 SUPABASE_PG_URL
const pgPool = new Pool({
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
      body: "Method not allowed",
    };
  }

  try {
    const qs = event.queryStringParameters || {};
    let days = parseInt(qs.days, 10);

    // 安全護欄：days 不能亂給
    if (isNaN(days) || days <= 0 || days > 365) {
      days = 30; // 預設看最近 30 天
    }

    const client = await pgPool.connect();
    let rows;
    try {
      const result = await client.query(
        `
        select
          day,
          generated_count,
          clicked_count,
          posted_count,
          click_rate_pct,
          posted_rate_pct,
          avg_hours_to_click
        from public.memorycorner_daily_funnel
        where day >= current_date - $1::int
        order by day asc
        `,
        [days]
      );
      rows = result.rows;
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
