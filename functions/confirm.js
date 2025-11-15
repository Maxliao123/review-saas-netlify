// functions/confirm.js
const { Pool } = require("pg");

// 連線到 Supabase Postgres
const pgPool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
  ssl: { rejectUnauthorized: false }, // Supabase 需要 SSL
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
    const body = JSON.parse(event.body || "{}");
    const reviewId = body.reviewId;

    // 沒帶 reviewId 就直接回 400，方便除錯
    if (!reviewId) {
      console.warn("confirm: missing reviewId in body");
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "reviewId required" }),
      };
    }

    // 將這一筆評論標記為 likely_posted = TRUE
    const updateSql = `
      UPDATE generated_reviews
      SET likely_posted = TRUE
      WHERE id = $1;
    `;
    const updateRes = await pgPool.query(updateSql, [reviewId]);

    console.log(
      "confirm: updated rows =",
      updateRes.rowCount,
      "id =",
      reviewId
    );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, updatedId: reviewId }),
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



