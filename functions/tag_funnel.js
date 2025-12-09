// functions/tag_funnel.js
const { Pool } = require("pg");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

    // 安全範圍
    if (isNaN(days) || days <= 0 || days > 365) {
      days = 30;
    }

    const client = await pgPool.connect();
    let rows;
    try {
      const result = await client.query(
        `
        with tag_events as (
          select
            unnest(tags_used) as tag,
            case when event_type = 'generate' then 1 else 0 end as generated_count,
            case when event_type = 'click_google' then 1 else 0 end as clicked_count
          from generator_events
          where store_id = 1
            and created_at >= current_date - $1::int
            and event_type in ('generate', 'click_google')
            and tags_used is not null
        )
        select
          tag,
          sum(generated_count) as generated_count,
          sum(clicked_count)   as clicked_count,
          case
            when sum(generated_count) > 0
              then round(100.0 * sum(clicked_count) / sum(generated_count), 1)
            else null
          end as click_rate_pct
        from tag_events
        group by tag
        order by sum(generated_count) desc, tag asc
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
    console.error("tag_funnel error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
