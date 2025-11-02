// functions/generate.js
// POST /api/generate
// Body: { storeid, selectedTags: string[], lang?: "en"|"zh"|"ko"|"ja"|"fr"|"es", minChars?, maxChars? }

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
function pickVariant(seedA, seedB) {
  const h = hashStr(stableKey({ seedA, seedB }));
  return h % FLAVORS.length; // 0..4
}
function pickAB(storeid) {
  return (hashStr(storeid) % 2) === 0 ? "A" : "B";
}

// 內容去重：3-gram Jaccard
function ngrams(str, n=3) {
  const s = String(str || "").replace(/\s+/g, "");
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

// —— 多語系 system/user 模板 —— //
function buildPrompt({ lang, storeid, storeName, meta, selectedTags, minChars, maxChars, variant }) {
  // 將共同資訊（熱門/服務/氛圍/新品）作為「語氣參考」，但不允許引入未勾選的關鍵字
  const ref = [];
  if (meta.top3)     ref.push(`Top: ${meta.top3}`);
  if (meta.features) ref.push(`Service/Flow: ${meta.features}`);
  if (meta.ambiance) ref.push(`Ambience: ${meta.ambiance}`);
  if (meta.newItems) ref.push(`New: ${meta.newItems}`);

  const joinedTags = selectedTags.join(", ");
  const rangeText = `${minChars}-${maxChars}`;

  // 各語言文案
  const T = {
    en: {
      sys: [
        "You are a local-savvy food reviewer.",
        "Write 1–2 compact sentences in natural English; no hashtags, no emojis, no bullet points, no excessive exclamation marks.",
        "Avoid templates and filler words. Vary sentence openings. Keep it trustworthy and specific.",
        `Respect allowed keywords only: the review must not invent items beyond the selected tags.`,
      ].join("\n"),
      user: [
        `Store: ${storeName} (id: ${storeid})`,
        selectedTags.length ? `Allowed keywords: ${joinedTags}` : "Allowed keywords: (none provided)",
        ref.length ? `Reference only (do not introduce new items): ${ref.join(" | ")}` : "",
        `Style variant: ${FLAVORS[variant]}`,
        `Length target: ${rangeText} characters (rough guidance).`,
        "Return ONLY the final review text."
      ].filter(Boolean).join("\n"),
    },
    zh: {
      sys: [
        "你是懂在地口味的美食短評寫手。",
        "請用繁體中文撰寫 1–2 句，語氣自然可信、不要列點、不要 hashtag、不要 emoji、避免過度誇飾與口頭禪。",
        "僅能使用勾選的關鍵詞，不得捏造未被選中的餐點/形容詞。",
      ].join("\n"),
      user: [
        `店名：${storeName}（id: ${storeid}）`,
        selectedTags.length ? `允許關鍵詞：${joinedTags}` : "允許關鍵詞：（無）",
        ref.length ? `（僅作語氣參考）${ref.join("｜")}` : "",
        `風格變體：${FLAVORS[variant]}`,
        `字數範圍：${rangeText}（概略）`,
        "只輸出最終短評文字。"
      ].filter(Boolean).join("\n"),
    },
    ko: {
      sys: [
        "당신은 현지에 밝은 음식 리뷰어입니다.",
        "자연스러운 한국어로 1–2문장만 작성하세요. 해시태그/이모지/불릿포인트/과도한 감탄사는 사용하지 마세요.",
        "선택한 키워드만 사용하고, 그 밖의 항목을 새로 만들어내지 마세요.",
      ].join("\n"),
      user: [
        `매장: ${storeName} (id: ${storeid})`,
        selectedTags.length ? `허용 키워드: ${joinedTags}` : "허용 키워드: (없음)",
        ref.length ? `참고(새 항목 추가 금지): ${ref.join(" | ")}` : "",
        `스타일 변형: ${FLAVORS[variant]}`,
        `길이 가이드: ${rangeText}자`,
        "최종 리뷰 문장만 반환하세요."
      ].filter(Boolean).join("\n"),
    },
    ja: {
      sys: [
        "あなたは土地勘のあるフードレビュアーです。",
        "自然な日本語で1〜2文。ハッシュタグ・絵文字・箇条書き・過度な感嘆符は使わないでください。",
        "選択したキーワードのみ使用し、それ以外の項目を新たに作らないでください。",
      ].join("\n"),
      user: [
        `店名：${storeName}（id: ${storeid}）`,
        selectedTags.length ? `使用可キーワード：${joinedTags}` : "使用可キーワード：（なし）",
        ref.length ? `参考（新規項目の追加は禁止）：${ref.join("｜")}` : "",
        `文体バリアント：${FLAVORS[variant]}`,
        `文字数目安：${rangeText}`,
        "最終のレビュー文のみを出力してください。"
      ].filter(Boolean).join("\n"),
    },
    fr: {
      sys: [
        "Vous êtes un critique culinaire local crédible.",
        "Rédigez 1–2 phrases naturelles en français; pas de hashtags, pas d’emojis, pas de listes, évitez les exclamations excessives.",
        "N’utilisez que les mots-clés sélectionnés; n’inventez pas d’éléments non choisis.",
      ].join("\n"),
      user: [
        `Établissement : ${storeName} (id : ${storeid})`,
        selectedTags.length ? `Mots-clés autorisés : ${joinedTags}` : "Mots-clés autorisés : (aucun)",
        ref.length ? `Références (ton uniquement, ne rien ajouter) : ${ref.join(" | ")}` : "",
        `Variante de style : ${FLAVORS[variant]}`,
        `Longueur visée : ${rangeText} caractères (indicatif).`,
        "Retournez UNIQUEMENT le texte final de l’avis."
      ].filter(Boolean).join("\n"),
    },
    es: {
      sys: [
        "Eres un reseñista gastronómico con conocimiento local.",
        "Escribe 1–2 frases naturales en español; sin hashtags, sin emojis, sin viñetas, evita signos de exclamación excesivos.",
        "Usa solo las palabras clave seleccionadas; no inventes elementos no elegidos.",
      ].join("\n"),
      user: [
        `Lugar: ${storeName} (id: ${storeid})`,
        selectedTags.length ? `Palabras clave permitidas: ${joinedTags}` : "Palabras clave permitidas: (ninguna)",
        ref.length ? `Referencia (solo tono, no añadir ítems): ${ref.join(" | ")}` : "",
        `Variante de estilo: ${FLAVORS[variant]}`,
        `Objetivo de longitud: ${rangeText} caracteres (orientativo).`,
        "Devuelve SOLO el texto final de la reseña."
      ].filter(Boolean).join("\n"),
    }
  };

  return T[lang] || T["en"];
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
    const lang = (body.lang || "en").toLowerCase(); // ⬅ 由前端傳入
    const minChars = Math.max(60, parseInt(body.minChars || 90, 10));
    const maxChars = Math.max(minChars + 20, parseInt(body.maxChars || 160, 10));
    if (!storeid) return json({ error: "storeid required" }, 400);

    const variant = pickVariant(storeid, selectedTags);
    const abBucket = pickAB(storeid);

    const cacheKey = stableKey({ storeid, selectedTags, minChars, maxChars, v: variant, lang });
    const cached = cacheGet(cacheKey);
    if (cached) return json(cached, 200);

    const meta = (await fetchStoreRow(storeid.toLowerCase())) || { name: storeid, placeId: "" };
    const storeName = meta.name || storeid;

    const { sys, user } = buildPrompt({
      lang, storeid, storeName, meta, selectedTags, minChars, maxChars, variant
    });

    // 第一次生成
    let { text, usage, latencyMs } = await callOpenAI(sys, user);

    // 去重：若過像 -> 重試一次，換一條微提示
    if (isTooSimilar(storeid, selectedTags, text, 0.6)) {
      const hint = MICRO[hashStr(text) % MICRO.length];
      const retry = await callOpenAI(sys, user + `\n[Rewrite hint] ${hint}`);
      text = retry.text || text;
      usage = retry.usage || usage;
      latencyMs += retry.latencyMs || 0;
    }

    const result = {
      reviewText: text,
      store: { name: storeName, placeId: meta.placeId || "" },
      usage,
      latencyMs,
      meta: { variant, abBucket, minChars, maxChars, tags: selectedTags, lang },
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
            store: { name: storeName, placeId: meta.placeId || "" },
            storeName,
            placeId: meta.placeId || "",
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


