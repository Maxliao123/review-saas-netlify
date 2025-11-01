// functions/generate.js
// Netlify Function: POST /api/generate
// Body JSON: { storeid, selectedTags: string[], variant?: number, minChars?: number, maxChars?: number }

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SHEET_ID       = process.env.SHEET_ID;

// —— 簡易 45 秒記憶體快取（部署至 Netlify 時，單次冷啟後同實例有效）——
const CACHE_TTL_MS = 45 * 1000;
const cache = new Map(); // key -> { expiresAt, data }

// ---- Utilities ----
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

function stableKey(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function getFromCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCache(key, data) {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
}

// 讀 Google Sheet：stores 工作表，欄位：A:storeid, B:name_zh, C:place_id
async function fetchStoreMeta(storeid) {
  if (!SHEET_ID) return { name: storeid, placeId: "" };

  const sheetName = "stores";
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  const tq   = encodeURIComponent(`select A,B,C where lower(A)='${storeid.toLowerCase()}' limit 1`);
  const url  = `${base}?sheet=${encodeURIComponent(sheetName)}&tq=${tq}`;

  const r = await fetch(url);
  const txt = await r.text();
  // GViz 外層剝除
  const jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
  const obj = JSON.parse(jsonStr);

  if (obj?.table?.rows?.length) {
    const row = obj.table.rows[0].c;
    const nameZh  = (row[1]?.v || "").toString().trim();
    const placeId = (row[2]?.v || "").toString().trim();
    return { name: nameZh || storeid, placeId };
  }
  return { name: storeid, placeId: "" };
}

// 呼叫 OpenAI
async function callOpenAI(system, user) {
  const t0 = Date.now();

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.8,
      top_p: 0.9,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
    }),
  });

  if (!resp.ok) {
    const errtxt = await resp.text().catch(()=> "");
    throw new Error(`OpenAI ${resp.status}: ${errtxt}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  const usage = data?.usage || {};
  const latencyMs = Date.now() - t0;

  return { text, usage, latencyMs };
}

// 依 variant 給不同微風格提示，增加多樣化
function variantFlavor(variant = 0) {
  const styles = [
    "語氣自然親切、像在對朋友分享。",
    "語氣精簡俐落、重點清楚、不拖泥帶水。",
    "語氣溫暖帶感官，微微描寫香氣或口感。",
    "語氣中性理性，避免過度主觀形容。",
    "加入一個細小具體情境（如排隊、店內座位、端上桌瞬間）。"
  ];
  return styles[Math.abs(parseInt(variant, 10) || 0) % styles.length];
}

// —— Netlify Handler ——
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

  if (event.httpMethod !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY" }, 500);

    const body = JSON.parse(event.body || "{}");
    const storeid = (body.storeid || "").trim();
    const selectedTags = Array.isArray(body.selectedTags) ? body.selectedTags : [];
    const variant = body.variant ?? 0;
    const minChars = Math.max(40, parseInt(body.minChars || 80, 10));   // 下限至少 40
    const maxChars = Math.max(minChars + 10, parseInt(body.maxChars || 180, 10)); // 上限 > 下限

    if (!storeid) return json({ error: "storeid required" }, 400);

    // 45s cache key（不將 variant 納入可取得更高命中率；若想每個變體獨立緩存就把 variant 加進 key）
    const cacheKey = stableKey({ storeid, selectedTags, minChars, maxChars, variant });
    const cached = getFromCache(cacheKey);
    if (cached) return json(cached, 200);

    // 取店家中名 & placeId
    const meta = await fetchStoreMeta(storeid);
    const storeName = meta.name || storeid;

    // —— Prompt —— //
    const sys = [
      "你是專業在地向導，專長是把顧客體驗濃縮成『自然、可信、短小精悍的繁體中文評論』。",
      "輸出限制：只寫 1–2 句，避免列點、避免 emoji、避免 hashtag、避免誇飾用語濫用與多個驚嘆號。",
      "要點：加入一個具體感官細節（口感、香氣、溫度、份量、動線等）或小情境（點餐、上桌、座位、排隊）。",
      "請避免千篇一律的句型（例如「讓我忍不住…」「真的很…」「超級…」等口頭禪）。",
      "若有指定長度上下限，盡可能控制在該字數範圍內（以中文字數估計即可）。",
    ].join("\n");

    const tagsLine = selectedTags.length ? `重點標籤：${selectedTags.join("、")}` : "重點標籤：無";
    const flavor = variantFlavor(variant);

    const user = [
      `店名（中文）：${storeName}`,
      `店家代號：${storeid}`,
      tagsLine,
      `風格變體要求：${flavor}`,
      `長度要求：${minChars}–${maxChars} 字（繁體中文）。`,
      "請輸出最終短評文字本身，不要前後加任何說明。",
    ].join("\n");

    const { text, usage, latencyMs } = await callOpenAI(sys, user);

    const result = {
      reviewText: text,
      store: { name: storeName, placeId: meta.placeId || "" },
      usage,
      latencyMs,
      meta: { // 便於除錯觀察
        variant,
        minChars,
        maxChars,
        tags: selectedTags,
      },
    };

    setCache(cacheKey, result);
    return json(result, 200);

  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};

