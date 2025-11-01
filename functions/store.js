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
    const storeidRaw = (qs.get("storeid") || "").trim();
    const storeid = storeidRaw.toLowerCase();
    if (!storeid) return json({ error: "storeid required" }, 400);

    // 讀 Google Sheet（GViz tq，公開可讀）
    // 工作表名：stores
    // 欄位：A storeid, B name_zh, C place_id, H logo_url, I hero_url
    const sheetName = "stores";
    const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
    // 取 A,B,C,H,I
    const tq = encodeURIComponent(
      `select A,B,C,H,I where lower(A)='${storeid}' limit 1`
    );
    const url = `${base}?sheet=${encodeURIComponent(sheetName)}&tq=${tq}`;

    const r = await fetch(url);
    const txt = await r.text();

    // 剝除 GViz 外層
    const jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
    const obj = JSON.parse(jsonStr);

    let name = "";
    let placeId = "";
    let logoUrl = "";
    let heroUrl = "";

    if (obj?.table?.rows?.length) {
      const row = obj.table.rows[0].c;
      name    = (row[1]?.v || "").toString().trim(); // B
      placeId = (row[2]?.v || "").toString().trim(); // C
      logoUrl = toDirectImageUrl((row[3]?.v || "").toString().trim()); // H
      heroUrl = toDirectImageUrl((row[4]?.v || "").toString().trim()); // I
    }

    // 如果沒 logo，且有 placeId + API key，試抓 Google Places 照片
    if (!logoUrl && placeId && GOOGLE_MAPS_API_KEY) {
      try {
        const pd = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            placeId
          )}&fields=photos,icon,name&key=${GOOGLE_MAPS_API_KEY}`
        ).then((x) => x.json());

        const photoRef = pd?.result?.photos?.[0]?.photo_reference;
        if (photoRef) {
          logoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(
            photoRef
          )}&key=${GOOGLE_MAPS_API_KEY}`;
        } else if (pd?.result?.icon) {
          logoUrl = pd.result.icon;
        }
        if (!name && pd?.result?.name) name = pd.result.name;
      } catch (e) {
        // 忽略
      }
    }

    return json({
      ok: true,
      storeid: storeidRaw,
      name: name || storeidRaw,
      placeId: placeId || "",
      logoUrl: logoUrl || "",
      heroUrl: heroUrl || "",
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

// 轉常見的雲端硬碟/Imgur/share 連結為可直接顯示的圖檔網址
function toDirectImageUrl(u) {
  if (!u) return "";

  try {
    const url = new URL(u);

    // Google Drive: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // => https://drive.google.com/uc?export=view&id=FILE_ID
    if (url.hostname.includes("drive.google.com")) {
      const m = u.match(/\/file\/d\/([^/]+)/);
      if (m && m[1]) {
        return `https://drive.google.com/uc?export=view&id=${m[1]}`;
      }
      // 另一種分享：open?id=FILE_ID
      const id = url.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    }

    // 其他平台（官網 CDN、S3、Imgur、Cloudflare R2 等）通常原連結即可
    return u;
  } catch {
    return u;
  }
}
