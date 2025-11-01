// functions/store.js
// GET /api/store?storeid=xxx
//
// 讀 Google Sheet（A..I 欄）回傳：name / placeId / logoUrl / heroUrl / placePhotoUrl
// - 將 Google Drive 連結轉為 uc?export=view&id=... 直出格式
// - 若 LOGO/Hero 空、或圖片失敗，可用 Place Photos 備援

const SHEET_ID   = process.env.SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "stores";
const GMAPS_KEY  = process.env.GOOGLE_MAPS_API_KEY || "";

function json(data, statusCode = 200) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
    body: JSON.stringify(data),
  };
}

exports.handler = async function(event) {
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
    var qs = event && event.queryStringParameters ? event.queryStringParameters : {};
    var storeid = (qs.storeid || qs.store || "").trim();
    if (!storeid) return json({ error: "storeid required" }, 400);
    if (!SHEET_ID) return json({ error: "Missing SHEET_ID" }, 500);

    var row = await fetchRow(storeid.toLowerCase());
    if (!row) return json({ error: "store not found" }, 404);

    // 轉換 Drive 連結
    var logoUrl = normalizeDrive(row.logoUrl);
    var heroUrl = normalizeDrive(row.heroUrl);

    // 先準備 Place Photo 備援 URL（如果有 placeId 與 key）
    var placePhotoUrl = null;
    if (row.placeId && GMAPS_KEY) {
      var ref = await fetchPlacePhotoRef(row.placeId);
      if (ref) placePhotoUrl = buildPlacePhotoUrl(ref);
    }

    return json({
      storeid: row.storeid,
      name: row.name || row.storeid,
      placeId: row.placeId || "",
      logoUrl: logoUrl || null,
      heroUrl: heroUrl || null,
      placePhotoUrl: placePhotoUrl, // 給前端 onerror fallback
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
  var base = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq";
  var tq = encodeURIComponent("select A,B,C,D,E,F,G,H,I where lower(A)='" + storeidLower + "' limit 1");
  var url = base + "?sheet=" + encodeURIComponent(SHEET_NAME) + "&tq=" + tq;
  var r = await fetch(url);
  var txt = await r.text();
  var jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
  var obj = JSON.parse(jsonStr);

  var table = obj && obj.table ? obj.table : null;
  var rows = table && table.rows ? table.rows : null;
  var first = rows && rows[0] ? rows[0] : null;
  var c = first && first.c ? first.c : null;
  if (!c) return null;

  function v(i) {
    var cell = c[i];
    var val = (cell && typeof cell.v !== "undefined") ? cell.v : "";
    return ("" + val).trim();
    }

  return {
    storeid:  v(0),
    name:     v(1) || v(0),
    placeId:  v(2),
    top3:     v(3),
    features: v(4),
    ambiance: v(5),
    newItems: v(6),
    logoUrl:  v(7),
    heroUrl:  v(8)
  };
}

// 把各種 Google Drive 連結轉成能直接出圖的格式
function normalizeDrive(u) {
  if (!u) return '';
  try {
    // 已是 uc 直連則直接回傳（但我們仍會補上可能的 resourcekey）
    const isUC = /^https:\/\/drive\.google\.com\/uc/i.test(u);

    // 取出 id
    const mId = u.match(/\/file\/d\/([^/]+)/) || u.match(/[?&]id=([^&]+)/i);
    const id = mId ? mId[1] : '';
    if (!id) return u;

    // 取出 resourcekey（若有就保留）
    const rkMatch = u.match(/[?&]resourcekey=([^&]+)/i);
    const rk = rkMatch ? rkMatch[1] : '';

    let out = isUC ? u : `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
    // 若原本不是 uc 或 uc 上沒有 resourcekey，補上它
    if (rk && !/[?&]resourcekey=/.test(out)) {
      out += (out.includes('?') ? '&' : '?') + `resourcekey=${encodeURIComponent(rk)}`;
    }
    return out;
  } catch {
    return u;
  }
}

// 取 Place Details 的第一張 photo_reference
async function fetchPlacePhotoRef(placeId) {
  try {
    var url = "https://maps.googleapis.com/maps/api/place/details/json"
      + "?place_id=" + encodeURIComponent(placeId)
      + "&fields=photos"
      + "&key=" + encodeURIComponent(GMAPS_KEY);
    var r = await fetch(url);
    var j = await r.json();
    var result = j && j.result ? j.result : null;
    var photos = result && result.photos ? result.photos : null;
    var first = photos && photos[0] ? photos[0] : null;
    var ref = first && first.photo_reference ? first.photo_reference : "";
    return ref || "";
  } catch (_e) {
    return "";
  }
}

// 把 photo_reference 變成圖片 URL
function buildPlacePhotoUrl(photoRef, maxwidth) {
  var mw = maxwidth || 1000;
  return "https://maps.googleapis.com/maps/api/place/photo"
    + "?maxwidth=" + mw
    + "&photo_reference=" + encodeURIComponent(photoRef)
    + "&key=" + encodeURIComponent(GMAPS_KEY);
}

