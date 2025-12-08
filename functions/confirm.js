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
    const reviewId = body.reviewId;

    if (!reviewId) {
      return json(400, { error: "reviewId is required" });
    }

    const client = await pool.connect();

    try {
      // 1) 把這一則評論標記為 likely_posted = true
      await client.query(
        `
        UPDATE generated_reviews
        SET likely_posted = true,
            posted_at     = COALESCE(posted_at, NOW())
        WHERE id = $1
      `,
        [reviewId]
      );

      // 2) 讀出這一筆評論的 store_id + 各種 tags
      const { rows } = await client.query(
        `
        SELECT
          store_id,
          COALESCE(pos_top3_tags,      '{}'::text[]) AS pos_top3_tags,
          COALESCE(pos_features_tags,  '{}'::text[]) AS pos_features_tags,
          COALESCE(pos_ambiance_tags,  '{}'::text[]) AS pos_ambiance_tags,
          COALESCE(pos_newitems_tags,  '{}'::text[]) AS pos_newitems_tags,
          COALESCE(cons_tags,          '{}'::text[]) AS cons_tags,
          custom_food_tag,
          custom_cons_tag
        FROM generated_reviews
        WHERE id = $1
      `,
        [reviewId]
      );

      if (rows.length) {
        const r = rows[0];

        // 3) 把所有 tag 收成一個去重後的陣列
        const all = [
          ...r.pos_top3_tags,
          ...r.pos_features_tags,
          ...r.pos_ambiance_tags,
          ...r.pos_newitems_tags,
          ...r.cons_tags,
        ];

        if (r.custom_food_tag) all.push(r.custom_food_tag);
        if (r.custom_cons_tag) all.push(r.custom_cons_tag);

        const tagsUsed = Array.from(
          new Set(
            all
              .map((t) => String(t || "").trim())
              .filter(Boolean)
          )
        );

        // 4) 寫入 generator_events：click_google
        await client.query(
          `
          INSERT INTO generator_events (store_id, event_type, tags_used)
          VALUES ($1, 'click_google', $2::text[])
        `,
          [r.store_id, tagsUsed]
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




