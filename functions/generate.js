// functions/generate.js
// POST /api/generate
// Body JSON: { storeid, selectedTags: string[], variant?: number, minChars?: number, maxChars?: number }

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SHEET_ID       = process.env.SHEET_ID;
const SHEET_NAME_ENV = process.env.SHEET_NAME || ""; // 可選：指定工作表名
const CACHE_TTL_S    = parseInt(process.env.CACHE_TTL_S || "60", 10); // 預設 60 秒
const CACHE_TTL_MS   = Math.max(10, CACHE_TTL_S) * 1000;

// --- 簡單記憶體快取（同一 Lambda 實例有效） ---
const cache = new Map(); // key -> { expiresAt, data }

// ---------- Utilities ----------
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

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key, value) {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data: value });
}

// 輕量雜湊（穩定 variant 用）
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// 依序嘗試不同 Sheet 名稱，回傳 A~H 欄 row
async function readStoreRow(storeidLower) {
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  const sheetCandidates = [
    SHEET_NAME_ENV,
    "stores",
    "Store",
    "工作表1",
    "Sheet1",
  ].filter(Boolean);

  const tq = encodeURIComponent(
    `select A,B,C,D,E,F,G,H where lower(A)='${storeidLower}' limit 1`
  );

  for (const name of sheetCandidates) {
    try {
      const url = `${base}?sheet=${encodeURIComponent(name)}&tq=${tq}`;
      const r = await fetch(url);
      const txt = await r.text();
      const jsonStr = txt
        .replace(/^[\s\S]*setResponse\(/, "")
        .replace(/\);?\s*$/, "");
      const obj = JSON.parse(jsonStr);
      const row = obj?.table?.rows?.[0]?.c;
      if (row) return row;
    } catch (_) {}
  }
  // 再嘗試不指定 sheet（讀第一張）
  try {
    const url = `${base}?tq=${tq}`;
    const r = await fetch(url);
    const txt = await r.text();
    const jsonStr = txt
      .replace(/^[\s\S]*setResponse\(/, "")
      .replace(/\);?\s*$/, "");
    const obj = JSON.parse(jsonStr);
    const row = obj?.table?.rows?.[0]?.c;
    if (row) return row;
  } catch (_) {}

  return null;
}

function val(c) {
  return (c && c.v != null ? String(c.v) : "").trim();
}

async function fetchStoreMetaFull(storeid) {
  if (!SHEET_ID) {
    return { name: storeid, placeId: "", top3: "", features: "", ambiance: "", newItems: "" };
  }
  const row = await readStoreRow(storeid.toLowerCase());
  if (!row) return { name: storeid, placeId: "", top3: "", features: "", ambiance: "", newItems: "" };

  return {
    storeid: val(row[0]) || storeid,
    name:    val(row[1]) || val(row[0]) || storeid,
    placeId: val(row[2]),
    top3:    val(row[3]),
    features:val(row[4]),
    ambiance:val(row[5]),
    newItems:val(row[6]),
    // row[7] 是 LOGO，不在生成 prompt 中使用
  };
}

// 呼叫 OpenAI（你也可改成最新 chat/Responses API）
async function callOpenAI(system, user) {
  const t0 = Date.now();
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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
    const err = await resp.text().catch(() => "");
    throw new Error(`OpenAI ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  const usage = data?.usage || {};
  const latencyMs = Date.now() - t0;
  return { text, usage, latencyMs };
}

// 不同寫作「變體」風格
const FLAVORS = [
  "語氣自然親切、像對朋友分享；語序口語但不過度誇張。",
  "精簡俐落、重點清楚、不拖泥帶水，避免堆疊形容詞。",
  "溫暖帶感官：可點到香氣、口感、溫度、聲音等一兩個具體感受。",
  "中性理性，盡量避免形容詞泛濫與主觀斷言，仍保留可讀性。",
  "加入一個細微情境（排隊、上桌、店員提醒、座位動線）增添真實感。",
];

// 用輸入做雜湊，穩定地指派到某個 flavor
function pickStableVariant(storeid, selectedTags) {
  const seed = stableKey({ storeid, selectedTags });
  const h = hashStr(seed);
  return h % FLAVORS.length;
}

// ---------- Handler ----------
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
    const minChars = Math.max(40, parseInt(body.minChars || 90, 10));
    const maxChars = Math.max(minChars + 10, parseInt(body.maxChars || 180, 10));

    // variant：若未指定，使用穩定雜湊分配
    let variant = body.variant;
    if (variant == null || isNaN(parseInt(variant, 10))) {
      variant = pickStableVariant(storeid, selectedTags);
    } else {
      variant = Math.abs(parseInt(variant, 10)) % FLAVORS.length;
    }

    if (!storeid) return json({ error: "storeid required" }, 400);

    // 快取（key 加入 variant / 長度，避免不同需求互相覆蓋）
    const cacheKey = stableKey({ storeid, selectedTags, minChars, maxChars, variant });
    const cached = cacheGet(cacheKey);
    if (cached) return json(cached, 200);

    // 讀取店家擴充資訊
    const meta = await fetchStoreMetaFull(storeid);
    const storeName = meta.name || storeid;

    // 讓生成更不重複的小「微提示池」（也用穩定 hash 選一條）
    const MICRO = [
      "盡量使用不同的句型、換一種開場方式。",
      "嘗試把一個細節換成更具體的描述（例如醬汁稠度、茶香尾韻）。",
      "加入『和誰一起』或『當下情境』的一點點背景，但不要超過一個短片語。",
      "避免使用「真的」、「超級」、「讓我忍不住」等口頭禪；換成正常口語。",
    ];
    const microIdx = hashStr(storeName + selectedTags.join("|")) % MICRO.length;
    const microHint = MICRO[microIdx];

    // ---- Prompt ----
    const sys = [
      "你是專業在地向導，擅長把顧客體驗濃縮為『自然且可信』的一則繁體中文短評。",
      "輸出限制：只寫 1–2 句，不要列點、不要 emoji、不要 hashtag、避免多個驚嘆號。",
      "句子要順口但避免口頭禪與過度誇飾；可加入 1 個具體細節或情境提升真實感。",
      "若提供字數範圍，盡可能落在該範圍（以中文字數估算）。",
    ].join("\n");

    const lines = [];
    lines.push(`店名（中文）：${storeName}`);
    lines.push(`店家代號：${storeid}`);
    if (selectedTags.length) lines.push(`顧客關注重點：${selectedTags.join("、")}`);
    if (meta.top3)    lines.push(`熱門品項：${meta.top3}`);
    if (meta.features)lines.push(`服務與環境特色：${meta.features}`);
    if (meta.ambiance)lines.push(`氛圍：${meta.ambiance}`);
    if (meta.newItems)lines.push(`近期新品：${meta.newItems}`);
    lines.push(`風格變體：${FLAVORS[variant]}`);
    lines.push(`額外寫作提示：${microHint}`);
    lines.push(`長度：${minChars}–${maxChars} 字（繁體中文）。`);
    lines.push("請直接輸出最終短評文字本身，勿加任何前後說明。");

    const user = lines.join("\n");

    const { text, usage, latencyMs } = await callOpenAI(sys, user);

    const result = {
      reviewText: text,
      store: { name: storeName, placeId: meta.placeId || "" },
      usage,
      latencyMs,
      meta: {
        variant,
        minChars,
        maxChars,
        tags: selectedTags,
      },
    };

    cacheSet(cacheKey, result);
    return json(result, 200);
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};


