// functions/store.js
exports.handler = async (event) => {
  // CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const SHEET_ID = process.env.SHEET_ID;
    const SHEET_NAME = process.env.SHEET_NAME || "stores";
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

    if (!SHEET_ID) return json({ error: "Missing SHEET_ID env" }, 500);

    const qs = new URLSearchParams(event.queryStringParameters || {});
    const storeid = (qs.get("storeid") || "").trim().toLowerCase();
    if (!storeid) return json({ error: "storeid required" }, 400);

    // A:StoreID, B:StoreName, C:PlaceID, D:Top3Items, E:StoreFeatures,
    // F:Ambiance, G:NewItems, H:LOGO, I:Hero
    const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
    const tq = encodeURIComponent(
      `select A,B,C,D,E,F,G,H,I where lower(A)='${storeid}' limit 1`
    );
    const url = `${base}?sheet=${encodeURIComponent(SHEET_NAME)}&tq=${tq}`;

    const r = await fetch(url);
    const txt = await r.text();
    const jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
    const obj = JSON.parse(jsonStr);

    if (!obj?.table?.rows?.length) {
      return json({ ok: false, storeid, name: storeid, placeId: "", logoUrl: "", heroUrl: "" });
    }

    const c = obj.table.rows[0].c || [];
    const v = (i) => ((c[i]?.v ?? "") + "").trim();

    let data = {
      storeid: v(0),
      name: v(1) || v(0) || storeid,
      placeId: v(2) || "",
      top3: v(3) || "",
      features: v(4) || "",
      ambiance: v(5) || "",
      newItems: v(6) || "",
      logoUrl: normalizeDrive(v(7) || ""),
      heroUrl: normalizeDrive(v(8) || ""),
    };

    // LOGO 備援：Place Photos
    if (!data.logoUrl && data.placeId && GOOGLE_MAPS_API_KEY) {
      try {
        const pd = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
            data.placeId
          )}&fields=photos,icon,name&key=${GOOGLE_MAPS_API_KEY}`
        ).then((x) => x.json());
        const photoRef = pd?.result?.photos?.[0]?.photo_reference;
        if (photoRef) {
          data.logoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(
            photoRef
          )}&key=${GOOGLE_MAPS_API_KEY}`;
        } else if (pd?.result?.icon) {
          data.logoUrl = pd.result.icon;
        }
        if (!data.name && pd?.result?.name) data.name = pd.result.name;
      } catch {}
    }

    return json({ ok: true, ...data });
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};

// —— Helpers ——
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}
function json(data, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json", ...corsHeaders() }, body: JSON.stringify(data) };
}
function normalizeDrive(u = "") {
  if (!u) return "";
  try {
    const url = new URL(u);
    if (url.hostname.includes("drive.google.com")) {
      const m = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (m?.[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
      const id = url.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    }
    return u;
  } catch { return u; }
}

