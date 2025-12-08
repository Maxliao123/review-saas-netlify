// functions/confirm.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
    body: body ? JSON.stringify(body) : "",
  };
}

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
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { reviewId } = body;

    if (!reviewId) {
      return json(400, { error: "reviewId is required" });
    }

    const client = await pool.connect();

    try {
      // 1) 更新這筆 generated_reviews，並同時把需要的欄位取回
      const { rows } = await client.query(
        `
        UPDATE generated_reviews
        SET 
          likely_posted = TRUE,
          posted_at     = COALESCE(posted_at, NOW())
        WHERE id = $1
        RETURNING
          store_id,
          COALESCE(pos_top3_tags,     '{}'::text[]) AS pos_top3_tags,
          COALESCE(pos_features_tags, '{}'::text[]) AS pos_features_tags,
          COALESCE(pos_ambiance_tags, '{}'::text[]) AS pos_ambiance_tags,
          COALESCE(pos_newitems_tags, '{}'::text[]) AS pos_newitems_tags,
          COALESCE(cons_tags,         '{}'::text[]) AS cons_tags,
          custom_food_tag,
          custom_cons_tag;
        `,
        [reviewId]
      );

      if (rows.length > 0) {
        const r = rows[0];

        // 2) 收集所有 tag，去空白、去重
        const allTags = [
          ...r.pos_top3_tags,
          ...r.pos_features_tags,
          ...r.pos_ambiance_tags,
          ...r.pos_newitems_tags,
          ...r.cons_tags,
        ];

        if (r.custom_food_tag) allTags.push(r.custom_food_tag);
        if (r.custom_cons_tag) allTags.push(r.custom_cons_tag);

        const tagsUsed = Array.from(
          new Set(
            allTags
              .map((t) => String(t || "").trim())
              .filter(Boolean)
          )
        );

        // 3) 因為 generator_events.tags_used 是 text，
        //    我們存成 JSON 字串（跟 generate 時一樣風格）
        const tagsText = JSON.stringify(tagsUsed);

        await client.query(
          `
          INSERT INTO generator_events (store_id, event_type, tags_used)
          VALUES ($1, 'click_google', $2)
        `,
          [r.store_id, tagsText]
        );
      }

      return json(200, { ok: true });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("confirm handler error:", err);
    return json(500, { error: "Internal Server Error" });
  }
};




