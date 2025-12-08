// functions/confirm.js
const { Pool } = require("pg");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const pgPool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL, // 🔴 改這行
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

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: "Method not allowed",
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: "No body",
      };
    }

    const { reviewId } = JSON.parse(event.body || "{}");

    if (!reviewId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: "Missing reviewId",
      };
    }

    const client = await pgPool.connect();

    try {
      await client.query(
        `
        UPDATE generated_reviews
        SET likely_posted = TRUE,
            posted_at     = COALESCE(posted_at, NOW())
        WHERE id = $1;
        `,
        [reviewId]
      );
    } finally {
      client.release();
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Confirm error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: "Error",
    };
  }
};






