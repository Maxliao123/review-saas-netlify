// functions/generate.js
// POST /api/generate
// Body: { storeid, selectedTags: string[], minChars?, maxChars?, lang? }

const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
const SHEET_ID         = process.env.SHEET_ID;
const SHEET_NAME       = process.env.SHEET_NAME || "stores";
const CACHE_TTL_S      = parseInt(process.env.CACHE_TTL_S || "60", 10);
const CACHE_TTL_MS     = Math.max(10, CACHE_TTL_S) * 1000;

const DAILY_MAX_CALLS  = parseInt(process.env.DAILY_MAX_CALLS || "500", 10);
const PER_IP_MAX       = parseInt(process.env.PER_IP_MAX || "20", 10);
const PER_IP_WINDOW_S  = parseInt(process.env.PER_IP_WINDOW_S || "900", 10);
const REVIEW_WEBHOOK   = process.env.REVIEW_WEBHOOK_URL || "";

// in-memory
const cache = new Map();
const ngramMemory = new Map();
const ipWindows = new Map();
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

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { cache.delete(key); return null; }
  return hit.data;
}
function cacheSet(key, data) { cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data }); }

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
  const v = (i) => ((row[i]?.v ?? "") + "").trim();
  return {
    storeid:  v(0),
    name:     v(1) || v(0),
    placeId:  v(2),
    top3:     v(3),
    features: v(4),
    ambiance: v(5),
    newItems: v(6),
  };
}

// 風格變體
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
  return h % FLAVORS.length;
}
function pickAB(storeid) { return (hashStr(storeid) % 2) === 0 ? "A" : "B"; }

// 去重
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
function keyOf(storeid, tags=[]) { return `${storeid}|${tags.slice().sort().join(",")}`; }
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
  for (const it of list) if (jaccard(text, it.text) >= threshold) return true;
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

// 不同語言的 System Prompt
const SYS = {
  zh: [
    "你是在地向導型寫手，擅長將真實用餐體驗濃縮為『可信、自然、短小精悍』的一段繁體中文評論。",
    "輸出限制：只寫 1–2 句；不要列點、不要 hashtag、不要 emoji、避免模板化與多個驚嘆號。",
    "若有長度限制，盡量控制在範圍內（以中文字數粗估）。",
  ].join("\n"),
  en: [
    "You are a local food writer who condenses real dining experiences into a short, natural, credible English review.",
    "Constraints: write only 1–2 sentences; no bullets, no hashtags, no emoji, avoid clichés and exclamation marks.",
    "Respect the requested length in characters as closely as possible.",
  ].join("\n"),
  ko: [
    "당신은 현지 맛집을 자연스럽고 신뢰감 있게 1~2문장으로 소개하는 리뷰 작가입니다.",
    "제약: 글머리표, 해시태그, 이모지 금지, 과도한 감탄사와 진부한 표현은 피하세요.",
  ].join("\n"),
  ja: [
    "あなたは地元の食のライターです。実体験に基づく短く自然で信頼できる日本語レビューを1〜2文で書いてください。",
    "箇条書き・ハッシュタグ・絵文字は使わず、誇張や定型表現は避けてください。",
  ].join("\n"),
  fr: [
    "Vous êtes un critique culinaire local. Rédigez un avis court, naturel et crédible en 1–2 phrases en français.",
    "Pas de listes, hashtags ni emojis ; évitez les clichés et les points d’exclamation.",
  ].join("\n"),
  es: [
    "Eres un redactor gastronómico local. Escribe una reseña breve, natural y creíble en 1–2 frases en español.",
    "Sin listas, hashtags ni emojis; evita los clichés y los signos de exclamación.",
  ].join("\n"),
};

// 按語言建立 User Prompt
function buildUserPrompt(lang, meta, storeid, selectedTags, minChars, maxChars, variant) {
  const name = meta?.name || storeid;
  const allow = selectedTags.join(lang === 'zh' ? "、" : ", ");
  const ref = [];

  if (meta?.top3)     ref.push(label(lang, 'Top picks') + ": " + meta.top3);
  if (meta?.features) ref.push(label(lang, 'Service/Flow') + ": " + meta.features);
  if (meta?.ambiance) ref.push(label(lang, 'Ambience') + ": " + meta.ambiance);
  if (meta?.newItems) ref.push(label(lang, 'New items') + ": " + meta.newItems);

  const flavor = FLAVORS[variant];
  const strictRule = hardRule(lang, allow);

  const lines = [];
  lines.push(titleLine(lang, name, storeid));
  if (ref.length) lines.push(ref.map(s => `(${softHint(lang)}) ${s}`).join("\n"));
  lines.push(strictRule);
  lines.push(styleLine(lang, flavor));
  lines.push(lengthLine(lang, minChars, maxChars));
  lines.push(finalOnly(lang));

  return lines.join("\n");
}

// 多語字串
function label(lang, en) {
  const map = {
    zh: { 'Top picks':'熱門', 'Service/Flow':'服務/動線', 'Ambience':'氛圍', 'New items':'新品' },
  };
  return map[lang]?.[en] || en;
}
function titleLine(lang, name, storeid) {
  const m = {
    zh: `店名：${name}\n店家代號：${storeid}`,
    en: `Restaurant: ${name}\nStore ID: ${storeid}`,
    ko: `가게명: ${name}\nStore ID: ${storeid}`,
    ja: `店名：${name}\nStore ID：${storeid}`,
    fr: `Nom du restaurant : ${name}\nStore ID : ${storeid}`,
    es: `Restaurante: ${name}\nStore ID: ${storeid}`,
  };
  return m[lang] || m.en;
}
function softHint(lang) {
  const m = { zh:'（語氣參考）', en:'(tone hint)', ko:'(톤 힌트)', ja:'（トーン参考）', fr:'(indice de ton)', es:'(pista de tono)' };
  return m[lang] || m.en;
}
function hardRule(lang, allowList) {
  const m = {
    zh: `【嚴格規則】只允許出現以下關鍵詞：${allowList}。不得加入未列出的餐點/飲品/形容詞或其他標籤；如需連接詞，只能使用一般敘述用語，不得捏造新名詞。`,
    en: `STRICT RULE: Only the following keywords may appear: ${allowList}. Do not invent items or adjectives not listed; use neutral connectors only.`,
    ko: `엄격한 규칙: 다음 키워드만 사용하세요: ${allowList}. 목록에 없는 항목/형용사/표현을 새로 만들지 마세요.`,
    ja: `厳格なルール：使用できるキーワードは次のみ：${allowList}。記載のない名詞・形容詞を作らず、接続には一般的な表現のみを用いてください。`,
    fr: `RÈGLE STRICTE : n’utilisez que ces mots-clés : ${allowList}. N’inventez pas d’éléments non listés ; utilisez seulement des connecteurs neutres.`,
    es: `REGLA ESTRICTA: solo se permiten estas palabras clave: ${allowList}. No inventes elementos no listados; usa conectores neutros.`,
  };
  return m[lang] || m.en;
}
function styleLine(lang, flavor) {
  const m = {
    zh: `風格變體：${flavor}`,
    en: `Style variant: ${flavor}`,
    ko: `스타일 변형: ${flavor}`,
    ja: `スタイルバリエーション：${flavor}`,
    fr: `Variante de style : ${flavor}`,
    es: `Variante de estilo: ${flavor}`,
  };
  return m[lang] || m.en;
}
function lengthLine(lang, minC, maxC) {
  const m = {
    zh: `長度：${minC}–${maxC} 字（以中文字數粗估）。`,
    en: `Length: about ${minC}–${maxC} characters.`,
    ko: `길이: 약 ${minC}–${maxC}자.`,
    ja: `長さ：約 ${minC}〜${maxC} 文字。`,
    fr: `Longueur : environ ${minC}–${maxC} caractères.`,
    es: `Longitud: unas ${minC}–${maxC} caracteres.`,
  };
  return m[lang] || m.en;
}
function finalOnly(lang) {
  const m = {
    zh: "請直接輸出最終短評文字本身，勿加任何前後說明。",
    en: "Output only the final review text, no preface or suffix.",
    ko: "최종 리뷰 문장만 출력하고, 앞뒤 설명은 쓰지 마세요.",
    ja: "最終的なレビュー文のみを出力し、前置きや補足は不要です。",
    fr: "Ne renvoyez que le texte final de l’avis, sans préambule ni postface.",
    es: "Devuelve solo el texto final de la reseña, sin prefacios ni añadidos.",
  };
  return m[lang] || m.en;
}

// 微提示池
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
    const lang = (body.lang || "en").toLowerCase();  // ✅ 新增
    if (!storeid) return json({ error: "storeid required" }, 400);

    const variant = pickVariant(storeid, selectedTags);
    const abBucket = pickAB(storeid);

    // ✅ Cache key 納入語言
    const cacheKey = stableKey({ storeid, selectedTags, minChars, maxChars, v: variant, lang });
    const cached = cacheGet(cacheKey);
    if (cached) return json(cached, 200);

    const meta = (await fetchStoreRow(storeid.toLowerCase())) || { name: storeid, placeId: "" };
    const sys = SYS[lang] || SYS.en;                                       // ✅ 按語言
    const user = buildUserPrompt(lang, meta, storeid, selectedTags, minChars, maxChars, variant); // ✅ 按語言

    // 第一次生成
    let { text, usage, latencyMs } = await callOpenAI(sys, user);

    // 去重：若過像 -> 重試
    if (isTooSimilar(storeid, selectedTags, text, 0.6)) {
      const hint = MICRO[hashStr(text) % MICRO.length];
      const retry = await callOpenAI(sys, user + `\n${hint}`);
      text = retry.text || text;
      usage = retry.usage || usage;
      latencyMs += retry.latencyMs || 0;
    }

    const result = {
      reviewText: text,
      store: { name: meta.name || storeid, placeId: meta.placeId || "" },
      usage,
      latencyMs,
      meta: { variant, abBucket, minChars, maxChars, tags: selectedTags, lang }, // ✅ 回傳語言
    };

    storeNgramPush(storeid, selectedTags, text);

    if (REVIEW_WEBHOOK) {
      try {
        await fetch(REVIEW_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            storeid,
            store: { name: meta.name || storeid, placeId: meta.placeId || "" },
            selectedTags,
            reviewText: text,
            variant,
            abBucket,
            latencyMs,
            usage,
            lang,
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



