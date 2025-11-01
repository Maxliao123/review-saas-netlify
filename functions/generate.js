// functions/generate.js
// POST /api/generate
// Body: { storeid, selectedTags: string[], minChars?, maxChars? }

const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
const SHEET_ID         = process.env.SHEET_ID;
const SHEET_NAME       = process.env.SHEET_NAME || "stores";
const CACHE_TTL_S      = parseInt(process.env.CACHE_TTL_S || "60", 10);
const CACHE_TTL_MS     = Math.max(10, CACHE_TTL_S) * 1000;

// 成本控管 / 節流（簡易 in-memory 示範）
const DAILY_MAX_CALLS  = parseInt(process.env.DAILY_MAX_CALLS || "500", 10);
const PER_IP_MAX       = parseInt(process.env.PER_IP_MAX || "20", 10);
const PER_IP_WINDOW_S  = parseInt(process.env.PER_IP_WINDOW_S || "900", 10); // 15 分鐘
const REVIEW_WEBHOOK   = process.env.REVIEW_WEBHOOK_URL || "";

// —— in-memory stores（同一 Lambda 實例有效）——
const cache = new Map();                  // key -> { expiresAt, data }
const ngramMemory = new Map();            // (storeid|tags) -> [{text, ts}]
const ipWindows = new Map();              // ip -> [timestamps]
const dailyCounter = { date: dayStr(), count: 0 };

function json(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(data),
  };
}
function dayStr() { const d = new Date(); return d.toISOString().slice(0,10); }
function stableKey(obj) { return JSON.stringify(obj, Object.keys(obj).sort()); }

// cache
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { cache.delete(key); return null; }
  return hit.data;
}
function cacheSet(key, data) { cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data }); }

// 小型 hash（stable variant / AB）
function hashStr(s) { let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h); }

// 讀店家 row（A..G）
async function fetchStoreRow(storeidLower) {
  if (!SHEET_ID) return null;
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  const tq = encodeURIComponent(`select A,B,C,D,E,F,G where lower(A)='${storeidLower}' limit 1`);
  const url = `${base}?sheet=${encodeURIComponent(SHEET_NAME)}&tq=${tq}`;
  const r = await fetch(url);
  const txt = await r.text();
  const jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
  const obj = JSON.parse(jsonStr);
  const row = obj?.table?.rows?.[0]?.c;
  if (!row) return null;
  const val = (i) => ((row[i]?.v ?? "") + "").trim();
  return {
    storeid:  val(0),
    name:     val(1) || val(0),
    placeId:  val(2),
    top3:     val(3),
    features: val(4),
    ambiance: val(5),
    newItems: val(6),
  };
}

// 穩定隨機變體 + AB bucket
const FLAVORS = [
  "語氣自然親切、像對朋友分享；語序口語但不浮誇。",
  "精簡俐落、重點清楚；少形容詞、多實際細節。",
  "帶感官：口感/香氣/溫度/份量任一具體細節。",
  "中性理性、陳述體驗重點；避免誇飾與口頭禪。",
  "加入一個小情境（點餐/上桌/座位/排隊/結帳其中一項）。",
];
function pickVariant(storeid, selectedTags) {
  const seed = stableKey({ storeid, selectedTags });
  const h = hashStr(seed);
  return h % FLAVORS.length; // 0..4
}
function pickAB(storeid) {
  return (hashStr(storeid) % 2) === 0 ? "A" : "B";
}

// 內容去重：3-gram Jaccard
function ngrams(str, n=3) {
  const s = str.replace(/\s+/g, "");
  const arr = [];
  for (let i=0;i<=s.length-n;i++) arr.push(s.slice(i,i+n));
  return new Set(arr);
}
function jaccard(a,b) {
  const A = ngrams(a), B = ngrams(b);
  let inter=0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter/union : 0;
}
function keyOf(storeid, tags=[]) {
  return `${storeid}|${tags.slice().sort().join(",")}`;
}
function storeNgramPush(storeid, tags, text) {
  const now = Date.now();
  const k = keyOf(storeid, tags);
  if (!ngramMemory.has(k)) ngramMemory.set(k, []);
  const list = ngramMemory.get(k);
  list.push({ text, ts: now });
  while (list.length > 100) list.shift();
}
function isTooSimilar(storeid, tags, text, threshold=0.6) {
  const list = ngramMemory.get(keyOf(storeid, tags)) || [];
  for (const it of list) {
    if (jaccard(text, it.text) >= threshold) return true;
  }
  return false;
}

// 節流
function getIP(event) {
  return event.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || event.headers["client-ip"]
      || event.headers["x-real-ip"]
      || "0.0.0.0";
}
function checkGlobalDailyLimit() {
  const today = dayStr();
  if (dailyCounter.date !== today) { dailyCounter.date = today; dailyCounter.count = 0; }
  if (dailyCounter.count >= DAILY_MAX_CALLS) return false;
  dailyCounter.count++;
  return true;
}
function checkIpWindow(ip) {
  const now = Date.now();
  const winMs = PER_IP_WINDOW_S * 1000;
  if (!ipWindows.has(ip)) ipWindows.set(ip, []);
  const arr = ipWindows.get(ip).filter(t => now - t < winMs);
  if (arr.length >= PER_IP_MAX) return false;
  arr.push(now); ipWindows.set(ip, arr);
  return true;
}

// OpenAI
async function callOpenAI(system, user) {
  const t0 = Date.now();
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text().catch(()=> "")}`);
  const data = await resp.json();
  return {
    text: data?.choices?.[0]?.message?.content?.trim() || "",
    usage: data?.usage || {},
    latencyMs: Date.now() - t0,
  };
}

// 微提示池（重試時替換）
const MICRO = [
  "換一種開場方式，避免常見模板；加上一個具體細節即可。",
  "調整句型與斷句，避免口頭禪；資訊密度略高一些。",
  "聚焦一個具體體驗（例如端上桌時的溫度或香氣），自然帶過。",
  "用更中性的語氣描述，避免『真的、超級』等強烈詞。",
];

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
  if (event.httpMethod !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY" }, 500);

    // 成本控管
    const ip = getIP(event);
    if (!checkGlobalDailyLimit()) return json({ error: "Daily quota reached" }, 429);
    if (!checkIpWindow(ip))       return json({ error: "Too many requests from this IP" }, 429);

    const body = JSON.parse(event.body || "{}");
    const storeid = (body.storeid || "").trim();
    const selectedTags = Array.isArray(body.selectedTags) ? body.selectedTags : [];
    const minChars = Math.max(60, parseInt(body.minChars || 90, 10));
    const maxChars = Math.max(minChars + 20, parseInt(body.maxChars || 160, 10));
    if (!storeid) return json({ error: "storeid required" }, 400);

    const variant = pickVariant(storeid, selectedTags);
    const abBucket = pickAB(storeid);

    const cacheKey = stableKey({ storeid, selectedTags, minChars, maxChars, v: variant });
    const cached = cacheGet(cacheKey);
    if (cached) return json(cached, 200);

    const meta = (await fetchStoreRow(storeid.toLowerCase())) || { name: storeid, placeId: "" };
    const storeName = meta.name || storeid;

    const sys = [
      "你是在地向導型寫手，擅長將真實用餐體驗濃縮為『可信、自然、短小精悍』的一段繁體中文評論。",
      "輸出限制：只寫 1–2 句；不要列點、不要 hashtag、不要 emoji、避免模板化句型與多個驚嘆號。",
      "語言風格需避免高度重複：盡量變換句式與開頭用詞，不使用口頭禪（例如真的、超級、讓我忍不住）。",
      "若有長度限制，盡量控制在範圍內（以中文字數粗略估計）。",
    ].join("\n");

    const lines = [];
    lines.push(`店名（中文）：${storeName}`);
    lines.push(`店家代號：${storeid}`);
    if (selectedTags.length) lines.push(`顧客關注重點：${selectedTags.join("、")}`);

    // ⤵ 門市 meta 僅作語氣參考，不得引入未勾選項目
    if (meta.top3)     lines.push(`（語氣參考）熱門：${meta.top3}`);
    if (meta.features) lines.push(`（語氣參考）服務/動線：${meta.features}`);
    if (meta.ambiance) lines.push(`（語氣參考）氛圍：${meta.ambiance}`);
    if (meta.newItems) lines.push(`（語氣參考）新品：${meta.newItems}`);

    // 🔒 嚴格規則：只允許出現勾選標籤
    lines.push(`【嚴格規則】只允許出現以下關鍵詞：${selectedTags.join("、")}。`);
    lines.push("不得加入未列出的餐點/飲品/形容詞或其他標籤；若需要連接詞，僅可使用一般敘述用語，不得捏造新名詞。");

    lines.push(`風格變體：${FLAVORS[variant]}`);
    lines.push(`長度：${minChars}–${maxChars} 字（繁體中文）。`);
    lines.push("請直接輸出最終短評文字本身，勿加任何前後說明。");
    let user = lines.join("\n");

    // 第一次生成
    let { text, usage, latencyMs } = await callOpenAI(sys, user);

    // 去重：若過像 -> 重試一次，換一條微提示
    if (isTooSimilar(storeid, selectedTags, text, 0.6)) {
      const hint = MICRO[hashStr(text) % MICRO.length];
      user = user + `\n（額外改寫提醒）${hint}`;
      const retry = await callOpenAI(sys, user);
      text = retry.text || text;
      usage = retry.usage || usage;
      latencyMs += retry.latencyMs || 0;
    }

    const result = {
      reviewText: text,
      store: { name: storeName, placeId: meta.placeId || "" },
      usage,
      latencyMs,
      meta: { variant, abBucket, minChars, maxChars, tags: selectedTags },
    };

    // 記憶最近輸出，用於去重（同店＋同標籤組合）
    storeNgramPush(storeid, selectedTags, text);

    // 寫回 ReviewHistory（若有設定 webhook）
    if (REVIEW_WEBHOOK) {
      try {
        await fetch(REVIEW_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            storeid,
            store: { name: storeName, placeId: meta.placeId || "" }, // 給接收端更彈性的解構
            storeName,
            placeId: meta.placeId || "",
            selectedTags,
            reviewText: text,
            variant,
            abBucket,
            latencyMs,
            usage,
            clientIp: ip,
            userAgent: (event.headers["user-agent"] || "")
          }),
        });
      } catch (_) {}
    }

    cacheSet(cacheKey, result);
    return json(result, 200);
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};


