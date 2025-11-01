// functions/store.js
// GET /api/store?storeid=xxx
//
// 讀 Google Sheet（A..I 欄）回傳：name / placeId / logoUrl / heroUrl
// - 會把 Google Drive 連結轉成可直出圖片的 uc?id=... 格式
// - 若無 LOGO/Hero 而有 PlaceID + GOOGLE_MAPS_API_KEY，則用 Place Photos 備援
const PREFER_PLACES_PHOTO = true;
const SHEET_ID   = process.env.SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "stores"; // 你已在 Netlify 設定成「工作表1」
const GMAPS_KEY  = process.env.GOOGLE_MAPS_API_KEY || "";

function json(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
    body: JSON.stringify(data),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: ""
    };
  }
  if (event.httpMethod !== "GET") return json({ error: "Method not allowed" }, 405);

  try {
    const storeid = (event.queryStringParameters?.storeid || "").trim();
    if (!storeid) return json({ error: "storeid required" }, 400);
    if (!SHEET_ID) return json({ error: "Missing SHEET_ID" }, 500);

    const row = await fetchRow(storeid.toLowerCase());
    if (!row) return json({ error: "store not found" }, 404);

    // 轉換 Drive 連結
    let logoUrl = normalizeDrive(row.logoUrl);
    let heroUrl = normalizeDrive(row.heroUrl);

    // 若沒有圖，用 Place Photos 當備援
    if ((!logoUrl || !heroUrl) && row.placeId && GMAPS_KEY) {
      const photo = await fetchPlacePhotoRef(row.placeId);
      if (photo) {
        const photoUrl = buildPlacePhotoUrl(photo);
        // hero 放大圖、logo 沒有就也用同一張
        if (!heroUrl) heroUrl = photoUrl;
        if (!logoUrl) logoUrl = photoUrl;
      }
    }

    const backupPhotoUrl = (row.placeId && GMAPS_KEY)
+      ? await (async () => {
+          const ref = await fetchPlacePhotoRef(row.placeId);
+          return ref ? buildPlacePhotoUrl(ref) : null;
+        })()
+      : null;

    return json({
      storeid: row.storeid,
      name: row.name || row.storeid,
      placeId: row.placeId || "",
      logoUrl: logoUrl || null,
      heroUrl: heroUrl || null,
      // 若前端需要，你也可回傳這些文字欄位
      placePhotoUrl: backupPhotoUrl,   // ⬅️ 新增：備援圖
      top3: row.top3,
      features: row.features,
      ambiance: row.ambiance,
      newItems: row.newItems
    });
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────

// A..I：StoreID, StoreName, PlaceID, Top3Items, StoreFeatures, Ambiance, 新品, LOGO, Hero圖
async function fetchRow(storeidLower) {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  const tq = encodeURIComponent(`select A,B,C,D,E,F,G,H,I where lower(A)='${storeidLower}' limit 1`);
  const url = `${base}?sheet=${encodeURIComponent(SHEET_NAME)}&tq=${tq}`;
  const r = await fetch(url);
  const txt = await r.text();
  const jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
  const obj = JSON.parse(jsonStr);
  const c = obj?.table?.rows?.[0]?.c;
  if (!c) return null;
  const v = (i) => ((c[i]?.v ?? "") + "").trim();
  return {
    storeid:  v(0),
    name:     v(1) || v(0),
    placeId:  v(2),
    top3:     v(3),
    features: v(4),
    ambiance: v(5),
    newItems: v(6),
    logoUrl:  v(7),
    heroUrl:  v(8),
  };
}

/// 把各種 Google Drive 連結轉成能直接出圖的格式
function normalizeDrive(u) {
  if (!u) return "";
  try {
    const url = new URL(u);

    // 只處理 drive.google.com
    if (url.hostname === "drive.google.com") {
      // 1) /file/d/{id}/... → 取出 id
      const m = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
      if (m && m[1]) {
        const id = m[1];
        // 先試 uc?export=view&id=...（比 uc?id= 更穩）
        return `https://drive.google.com/uc?export=view&id=${id}`;
      }

      // 2) ?id={id}
      const id2 = url.searchParams.get("id");
      if (id2) {
        return `https://drive.google.com/uc?export=view&id=${id2}`;
      }

      // 3) 其他（如 open?usp=drive_link 或 sharing?resourcekey=）多半無法直出
      // 直接回傳原連結（之後可加更多分支）
      return u;
    }

    // 非 drive.google.com，原樣回傳
    return u;
  } catch {
    return u;
  }
}


// 取 Place Details 的第一張 photo_reference
async function fetchPlacePhotoRef(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${encodeURIComponent(GMAPS_KEY)}`;
    const r = await fetch(url);
    const j = await r.json();
    const ref = j?.result?.photos?.[0]?.photo_reference;
    return ref || "";
  } catch {
    return "";
  }
}

// 把 photo_reference 變成圖片 URL
function buildPlacePhotoUrl(photoRef, maxwidth = 1000) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${encodeURIComponent(photoRef)}&key=${encodeURIComponent(GMAPS_KEY)}`;
}

