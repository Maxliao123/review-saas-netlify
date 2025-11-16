// functions/confirm.js
// 用戶按「已貼上 / 可能會貼」後，回寫 generated_reviews 的 likely_posted + 標籤欄位

const { Pool } = require("pg");

// 連線到 Supabase Postgres
const pgPool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
  ssl: { rejectUnauthorized: false },
});

exports.handler = async (event) => {
  // CORS 預檢
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
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
    const body = JSON.parse(event.body || "{}");
    const {
      reviewId,
      likelyPosted,
      tagBuckets = {},
    } = body;

    if (!reviewId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "reviewId is required" }),
      };
    }

    const {
      posTop3 = [],
      posFeatures = [],
      posAmbiance = [],
      posNewItems = [],
      customFood = null,
      cons = [],
      customCons = null,
    } = tagBuckets || {};

    const safeJoin = (val) =>
      Array.isArray(val) ? val.join(",") : (val == null ? null : String(val));

    const query = `
      UPDATE generated_reviews
      SET
        likely_posted     = COALESCE($2, likely_posted),
        pos_top3_tags     = COALESCE($3, pos_top3_tags),
        pos_features_tags = COALESCE($4, pos_features_tags),
        pos_ambiance_tags = COALESCE($5, pos_ambiance_tags),
        pos_newitems_tags = COALESCE($6, pos_newitems_tags),
        custom_food_tag   = COALESCE($7, custom_food_tag),
        cons_tags         = COALESCE($8, cons_tags),
        custom_cons_tag   = COALESCE($9, custom_cons_tag)
      WHERE id = $1
      RETURNING id;
    `;

    const values = [
      reviewId,
      typeof likelyPosted === "boolean" ? likelyPosted : null,
      safeJoin(posTop3),
      safeJoin(posFeatures),
      safeJoin(posAmbiance),
      safeJoin(posNewItems),
      customFood == null || customFood === "" ? null : String(customFood),
      safeJoin(cons),
      customCons == null || customCons === "" ? null : String(customCons),
    ];

    const { rows } = await pgPool.query(query, values);
    const updated = rows?.[0]?.id || null;

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, updatedId: updated }),
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



