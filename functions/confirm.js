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

  // 只接受 POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // 目前不強制需要 storeid / reviewText，
    // 但先解析 body，未來要用的話也方便擴充
    try {
      JSON.parse(event.body || "{}");
    } catch (_) {}

    // 👉 最簡單穩定版：
    // 直接把 generated_reviews 裡「最新一筆」標記為 TRUE
    const updateQuery = `
      UPDATE generated_reviews
      SET likely_posted = TRUE
      WHERE id = (
        SELECT id
        FROM generated_reviews
        ORDER BY created_at DESC
        LIMIT 1
      );
    `;

    await pgPool.query(updateQuery);

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
