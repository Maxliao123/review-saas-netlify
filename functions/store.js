// functions/store.js
exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }
  if (event.httpMethod !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const SHEET_ID = process.env.SHEET_ID;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

    if (!SHEET_ID) return json({ error: "Missing SHEET_ID env" }, 500);

    const qs = new URLSearchParams(event.queryStringParameters || {});
    const storeid = (qs.get("storeid") || "").trim().toLowerCase();
    if (!storeid) return json({ error: "storeid required" }, 400);

    // 讀 Google Sheet（GViz tq，公開可讀）
    // 預設工作表名：stores，欄位：A:storeid, B:name_zh, C:place_id, D:logo_url
    const sheetName = "stores";
    const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
    const tq = encodeURIComponent(`select A,B,C,D where lower(A)='${storeid}' limit 1`);
    const url = `${base}?sheet=${encodeURIComponent(sheetName)}&tq=${tq}`;

    const r = await fetch(url);
    const txt = await r.text();

    // GViz 會回傳類 JSON，需要剝外層
    const jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
    const obj = JSON.parse(jsonStr);

    let name = "";
    let placeId = "";
    let logoUrl = "";

    if (obj.table && obj.table.rows && obj.table.rows.length) {
      const row = obj.table.rows[0].c;
      name    = (row[1]?.v || "").toString();
      placeId = (row[2]?.v || "").toString();
      logoUrl = (row[3]?.v || "").toString();
    }

    // 若 logoUrl 空、但有 placeId 且有 Google API Key，嘗試抓商家照片
    if (!logoUrl && placeId && GOOGLE_MAPS_API_KEY) {
      try {
        const pd = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos,icon,name&key=${GOOGLE_MAPS_API_KEY}`
        ).then(r => r.json());

        const photoRef = pd?.result?.photos?.[0]?.photo_reference;
        if (photoRef) {
          // 取一張 400px 的照片當封面
          logoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(photoRef)}&key=${GOOGLE_MAPS_API_KEY}`;
        } else if (pd?.result?.icon) {
          logoUrl = pd.result.icon;
        }
        if (!name && pd?.result?.name) name = pd.result.name;
      } catch(e) {
        // 靜默忽略，fallback 用空值
      }
    }

    return json({
      ok: true,
      storeid,
      name: name || storeid,
      placeId: placeId || "",
      logoUrl: logoUrl || "",
    });

  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};

function json(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data),
  };
}
