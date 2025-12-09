// functions/confirm.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
  ssl: { rejectUnauthorized: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing body" }),
    };
  }

  try {
    const { reviewId } = JSON.parse(event.body || "{}");

    const normalizedId =
      typeof reviewId === "string"
        ? reviewId.trim()
        : String(reviewId || "").trim();

    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
        normalizedId
      );
    const isSafeToken = /^[A-Za-z0-9_-]{6,128}$/.test(normalizedId);

    // reviewId 要存在，而且要是 UUID 或安全字串，才接受
    if (!normalizedId || (!isUuid && !isSafeToken)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Missing or invalid reviewId" }),
      };
    }

    const client = await pool.connect();
    try {
      await client.query(
        `
        UPDATE generated_reviews
        SET likely_posted = TRUE,
            posted_at     = COALESCE(posted_at, NOW())
        WHERE id = $1
      `,
        [normalizedId]
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
    console.error("confirm handler error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};







