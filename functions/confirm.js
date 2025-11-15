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
    // 先試著解析 body（目前不用，但保留擴充空間）
    try {
      JSON.parse(event.body || "{}");
    } catch (e) {
      console.error("confirm parse body error:", e.message);
    }

    // 第一步：找出目前表裡「最新一筆」的 id
    const selectSql = `
      SELECT id
      FROM generated_reviews
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const { rows } = await pgPool.query(selectSql);

    if (rows.length === 0) {
      // 表裡還沒有任何資料，直接回 OK
      console.log("confirm: no rows in generated_reviews yet.");
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: true, note: "no rows" }),
      };
    }

    const targetId = rows[0].id;

    // 第二步：把那一筆標記為 likely_posted = TRUE
    const updateSql = `
      UPDATE generated_reviews
      SET likely_posted = TRUE
      WHERE id = $1;
    `;
    const updateRes = await pgPool.query(updateSql, [targetId]);

    console.log("confirm: updated rows =", updateRes.rowCount, "id =", targetId);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, updatedId: targetId }),
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

