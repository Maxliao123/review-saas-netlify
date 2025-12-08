// functions/track.js
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

  // 目前先不寫任何資料，只回成功，避免前端報錯
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ ok: true }),
  };
};
