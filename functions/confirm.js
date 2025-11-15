// functions/confirm.js
const { Pool } = require("pg");

const pgPool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
  ssl: { rejectUnauthorized: false }, // Supabase SSL
});

exports.handler = async (event) => {
  // CORS 預檢
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { storeid, reviewText } = JSON.parse(event.body || "{}");

    if (!storeid || !reviewText) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing storeid or reviewText" }),
      };
    }

    // 用相似度找「最像這一則文字」的那一筆，標記為 likely_posted = true
    const updateQuery = `
      UPDATE generated_reviews
      SET likely_posted = TRUE
      WHERE store_id = $1
      ORDER BY similarity(review_text, $2) DESC
      LIMIT 1;
    `;

    await pgPool.query(updateQuery, [storeid, reviewText]);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    console.error("confirm.js error:", e);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
