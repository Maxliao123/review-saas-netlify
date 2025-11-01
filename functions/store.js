// functions/store.js
exports.handler = async (event) => {
  // --- CORS ---
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
    const SHEET_NAME_ENV = process.env.SHEET_NAME || ""; // 可選：環境變數指定工作表名

    if (!SHEET_ID) return json({ error: "Missing SHEET_ID env" }, 500);

    const qs = new URLSearchParams(event.queryStringParameters || {});
    const storeid = (qs.get("storeid") || "").trim().toLowerCase();
    if (!storeid) return json({ error: "storeid required" }, 400);

    // 依序嘗試的工作表名稱（提高容錯）
    const sheetCandidates = [
      qs.get("sheet")?.trim(),
      SHEET_NAME_ENV,
      "stores",
      "Store",
      "工作表1",
      "Sheet1",
    ].filter(Boolean);

    // 讀取 Google Sheet（GViz tq）
    const row = await getRowFromAnySheet(SHEET_ID, sheetCandidates, storeid);

    if (!row) {
      return json({ ok: false, error: "store not found", storeid }, 404);
    }

    // A~H 欄位：StoreID, StoreName, PlaceID, Top3Items, StoreFeatures, Ambiance, 新品, LOGO(H)
    const getVal = (c) => (c && c.v != null ? String(c.v) : "").trim();

    const store = {
      storeid: getVal(row[0]) || storeid,
      name: getVal(row[1]) || getVal(row[0]) || storeid,
      placeId: getVal(row[2]),
      top3: getVal(row[3]),
      features: getVal(row[4]),
      ambiance: getVal(row[5]),
      newItems: getVal(row[6]),
      logoUrl: getVal(row[7]), // 👈 H 欄 LOGO（優先採用）
    };

    // 若 H 欄沒填、但有 placeId + API Key，嘗試用 Places Photos 當封面
    if (!store.logoUrl && store.placeId && GOOGLE_MAPS_API_KEY) {
      try {
        const details = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            store.placeId
          )}&fields=photos,icon,name&key=${GOOGLE_MAPS_API_KEY}`
        ).then((r) => r.json());

        const photoRef = details?.result?.photos?.[0]?.photo_reference;
        if (photoRef) {
          store.logoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(
            photoRef
          )}&key=${GOOGLE_MAPS_API_KEY}`;
        } else if (details?.result?.icon) {
          store.logoUrl = details.result.icon;
        }
        if (!store.name && details?.result?.name) {
          store.name = details.result.name;
        }
      } catch (e) {
        // 忽略：維持空字串
      }
    }

    return json({ ok: true, ...store });
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};

// 依序嘗試不同工作表名，找到就回傳該列
async function getRowFromAnySheet(SHEET_ID, sheetNames, storeidLower) {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  for (const name of sheetNames) {
    try {
      const tq = encodeURIComponent(
        `select A,B,C,D,E,F,G,H where lower(A)='${storeidLower}' limit 1`
      );
      const url = `${base}?sheet=${encodeURIComponent(name)}&tq=${tq}`;
      const r = await fetch(url);
      const txt = await r.text();

      // 可能遇到 404 或非 gviz 格式，這裡都用 try 包住
      const jsonStr = txt
        .replace(/^[\s\S]*setResponse\(/, "")
        .replace(/\);?\s*$/, "");
      const obj = JSON.parse(jsonStr);

      const row = obj?.table?.rows?.[0]?.c;
      if (row && row.length) return row;
    } catch (_) {
      // 換下一個名稱再試
    }
  }

  // 若全部 sheetName 都不行，再用「不指定 sheet」最後試一次（會讀第一個工作表）
  try {
    const tq = encodeURIComponent(
      `select A,B,C,D,E,F,G,H where lower(A)='${storeidLower}' limit 1`
    );
    const url = `${base}?tq=${tq}`;
    const r = await fetch(url);
    const txt = await r.text();
    const jsonStr = txt
      .replace(/^[\s\S]*setResponse\(/, "")
      .replace(/\);?\s*$/, "");
    const obj = JSON.parse(jsonStr);
    const row = obj?.table?.rows?.[0]?.c;
    if (row && row.length) return row;
  } catch (_) {}

  return null;
}

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

