// functions/confirm.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
  ssl: { rejectUnauthorized: false }, // 和 track.js 一樣保持一致即可
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const reviewId = body.reviewId;

    if (!reviewId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "reviewId is required" }),
      };
    }

    const client = await pool.connect();
    try {
      await client.query(
        `
        UPDATE generated_reviews
        SET 
          likely_posted = TRUE,
          posted_at     = COALESCE(posted_at, NOW())
        WHERE id = $1
        `,
        [reviewId]
      );
    } finally {
      client.release();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("confirm error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};






