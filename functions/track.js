// functions/track.js
const { Pool } = require("pg");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const pgPool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
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

    const payload = JSON.parse(event.body || "{}");
    let { store_id, event_type, tags_used, source_id } = payload;

    if (!event_type) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: "Missing event_type",
      };
    }

    // 目前只有 Memory Corner，沒傳就先 default = 1
    if (!store_id) {
      store_id = 1;
    }

    // tags_used 可以是 null / 陣列；空陣列就存成 null 比較乾淨
    if (Array.isArray(tags_used) && tags_used.length === 0) {
      tags_used = null;
    }

    const client = await pgPool.connect();
    try {
      await client.query(
        `
        INSERT INTO generator_events (store_id, source_id, event_type, tags_used)
        VALUES ($1, $2, $3, $4::text[])
        `,
        [store_id, source_id || null, event_type, tags_used]
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
    console.error("Track error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: "Error",
    };
  }
};

