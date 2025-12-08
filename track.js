// functions/track.js
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

exports.handler = async (event) => {
  try {
    if (!event.body) return { statusCode: 400, body: "No body" };

    const { store_id, event_type, tags_used } = JSON.parse(event.body);

    const query = `
      INSERT INTO generator_events (store_id, event_type, tags_used)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;

    await pgPool.query(query, [
      store_id,
      event_type,
      tags_used || null
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };

  } catch (err) {
    console.error("Track error:", err);
    return { statusCode: 500, body: "Error" };
  }
};
