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
    // 工作表：stores
    // 欄位：A:storeid, B:name_zh, C:place_id, D:top3, E:features, F:ambiance, G:newItems, H:logo_url, I:hero_url
    const sheetName = "stores";
    const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
    const tq = encodeURIComponent(`select A,B,C,D,E,F,G,H,I where lower(A)='${storeid}' limit 1`);
    const url = `${base}?sheet=${encodeURIComponent(sheetName)}&tq=${tq}`;

    const r = await fetch(url);
    const txt = await r.text();
    const jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
    const obj = JSON.parse(jsonStr);

    let row = [];
    if (obj?.table?.rows?.length) row = obj.table.rows[0]?.c || [];

    const nameZh   = (row[1]?.v || "").toString().trim();
    const placeId  = (row[2]?.v || "").toString().trim();
    const top3     = (row[3]?.v || "").toString().trim();
    const features = (row[4]?.v || "").toString().trim();
    const ambiance = (row[5]?.v || "").toString().trim();
    const newItems = (row[6]?.v || "").toString().trim();
    let logoUrl    = normalizeImgUrl((row[7]?.v || "").toString().trim());
    let heroUrl    = normalizeImgUrl((row[8]?.v || "").toString().trim());

    // 若 logoUrl 為空且有 placeId + API key → 用 Google Places Photo 當備援
    if (!logoUrl && placeId && GOOGLE_MAPS_API_KEY) {
      try {
        const pd = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos,icon,name&key=${GOOGLE_MAPS_API_KEY}`
        ).then(r => r.json());

        const photoRef = pd?.result?.photos?.[0]?.photo_reference;
        if (photoRef) {
          logoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(photoRef)}&key=${GOOGLE_MAPS_API_KEY}`;
        } else if (pd?.result?.icon) {
          logoUrl = pd.result.icon;
        }
      } catch (_) {
        // 忽略錯誤
      }
    }

    return json({
      ok: true,
      storeid,
      name: nameZh || storeid,
      placeId: placeId || "",
      top3,
      features,
      ambiance,
      newItems,
      logoUrl: logoUrl || "",
      heroUrl: heroUrl || ""
    });

  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};

// —— Helpers ——
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

/**
 * 將 Google Drive「預覽連結」轉為可直接放 <img src> 的直連
 * 支援：
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * 轉為：
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 */
function normalizeImgUrl(u = "") {
  if (!u) return "";
  try {
    const url = new URL(u);
    if (url.hostname.includes("drive.google.com")) {
      // /file/d/<id>/view
      const m = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (m && m[1]) {
        return `https://drive.google.com/uc?export=view&id=${m[1]}`;
      }
      // ?id=<id>
      const id = url.searchParams.get("id");
      if (id) {
        return `https://drive.google.com/uc?export=view&id=${id}`;
      }
    }
    return u;
  } catch {
    return u;
  }
}

