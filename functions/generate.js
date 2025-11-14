// functions/generate.js
// POST /api/generate
// Body: { storeid, positiveTags: string[], consTags: string[], lang?, minChars?, maxChars? }

const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
const SHEET_ID         = process.env.SHEET_ID;
const SHEET_NAME       = process.env.SHEET_NAME || "stores";
const CACHE_TTL_S      = parseInt(process.env.CACHE_TTL_S || "60", 10);
const CACHE_TTL_MS     = Math.max(10, CACHE_TTL_S) * 1000;

// 成本控管 / 節流
const DAILY_MAX_CALLS  = parseInt(process.env.DAILY_MAX_CALLS || "500", 10);
const PER_IP_MAX       = parseInt(process.env.PER_IP_MAX || "2", 10);
const PER_IP_WINDOW_S  = parseInt(process.env.PER_IP_WINDOW_S || "60", 10); // 15 分鐘
const REVIEW_WEBHOOK   = process.env.REVIEW_WEBHOOK_URL || "";

// ✅ [新增] 引入 pg 並建立 Supabase 連線池
const { Pool } = require('pg');
const pgPool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
  ssl: {
    rejectUnauthorized: false // Supabase 需要 SSL
  }
});

// ✅ [新增] 引入 Netlify Blobs API
const { getStore, connectLambda } = require("@netlify/blobs");


// —— in-memory stores（同一 Lambda 實例有效）——
const cache = new Map();                  // key -> { expiresAt, data }
// ❌ [移除] const ngramMemory = new Map(); (已移除)
// ❌ [移除] const ipWindows = new Map();
const dailyCounter = { date: dayStr(), count: 0 }; // ✅ [保留] in-memory 全域計數器 (如討論)

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

// Supabase 去重檢查
async function isTooSimilarSupabase(store_id, review_text, threshold = 0.6) {
  const query = `
    SELECT 1 
    FROM generated_reviews 
    WHERE store_id = $1 AND similarity(review_text, $2) >= $3
    LIMIT 1;
  `;
  try {
    const { rows } = await pgPool.query(query, [store_id, review_text, threshold]);
    return rows.length > 0;
  } catch (e) {
    console.error("Supabase similarity check error:", e.message);
    return false;
  }
}

// 儲存評論到 Supabase
async function storeReviewSupabase(store_id, review_text) {
  const query = `
    INSERT INTO generated_reviews (store_id, review_text) 
    VALUES ($1, $2);
  `;
  try {
    await pgPool.query(query, [store_id, review_text]);
  } catch (e) {
    console.error("Supabase insert error:", e.message);
  }
}


// 節流
function getIP(event) {
  return event.headers["x-forwarded-for"]?.split(",")[0]?.trim()
      || event.headers["client-ip"]
      || event.headers["x-real-ip"]
      || "0.0.0.0";
}

// ✅ [保留] in-memory 全域計數器
function checkGlobalDailyLimit() {
  const today = dayStr();
  if (dailyCounter.date !== today) { dailyCounter.date = today; dailyCounter.count = 0; }
  if (dailyCounter.count >= DAILY_MAX_CALLS) return false;
  dailyCounter.count++;
  return true;
}

// ❌ [移除] 舊的 in-memory checkIpWindow()

// ✅ [新增] Netlify Blobs 版本的節流 (IP)
async function checkIpWindowBlob(ip, event) {
  // 1. 初始化 Blobs 環境（Lambda 模式必須這一步）
  connectLambda(event);

  // 2. 再取得 / 建立 store
  const store = getStore("rate_limiting_ips"); // 不用再傳 context / siteID / token

  const key = `ip_${ip.replace(/[:.]/g, "_")}`;
  try {
    const now = Date.now();
    const winMs = PER_IP_WINDOW_S * 1000;

    const rawTimestamps = await store.get(key);
    let timestamps = [];
    if (rawTimestamps) {
      try {
        timestamps = JSON.parse(rawTimestamps);
        if (!Array.isArray(timestamps)) timestamps = [];
      } catch {
        timestamps = [];
      }
    }

    const recentTimestamps = timestamps.filter((t) => now - t < winMs);

    if (recentTimestamps.length >= PER_IP_MAX) {
      // 已超過上限 → 擋掉
      return false;
    }

    recentTimestamps.push(now);

    await store.set(
      key,
      JSON.stringify(recentTimestamps),
      {
        metadata: { updatedAt: now },
        ttl: PER_IP_WINDOW_S, // seconds
      }
    );

    return true;
  } catch (e) {
    console.error("Netlify Blobs checkIpWindow error:", e.message);
    // 這裡你可以選擇擋掉(false)或放行(true)，看你要「安全」還是「體驗」
    // 建議：保守一點就 return false;
    return false;
  }
}


// OpenAI
async function callOpenAI(system, user) {
  const t0 = Date.now(); // (已修復為 Date.now())
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

// —— ✅ [修改] 多語系 system/user 模板 (全面更新) —— //
function buildPrompt({ lang, storeid, storeName, meta, positiveTags, consTags, minChars, maxChars, variant }) {
  // 將共同資訊（熱門/服務/氛圍/新品）作為「語氣參考」，但不允許引入未勾選的關鍵字
  const ref = [];
  if (meta.top3)     ref.push(`Top: ${meta.top3}`);
  if (meta.features) ref.push(`Service/Flow: ${meta.features}`);
  if (meta.ambiance) ref.push(`Ambience: ${meta.ambiance}`);
  if (meta.newItems) ref.push(`New: ${meta.newItems}`);

  const joinedPosTags = (positiveTags || []).join(", ");
  const joinedConsTags = (consTags || []).join(", ");
  const rangeText = `${minChars}-${maxChars}`;

  // 各語言文案
  const T = {
    en: {
      sys: [
        "You are a local-savvy food reviewer.",
        "Write 1–2 compact sentences in natural English; no hashtags, no emojis, no bullet points, no excessive exclamation marks.",
        "Avoid templates and filler words. Vary sentence openings. Keep it trustworthy and specific.",
        "Focus on the 'Positive keywords'.",
        "If 'Improvement keywords' are provided, include at most 1-2 as mild, constructive suggestions near the end.",
        // ✅ [新增] 嚴格的「封口令」
        "If **no** 'Improvement keywords' are provided, the review must be **100% positive**. Do NOT invent any suggestions or criticisms (e.g., 'would be perfect if...', 'hope to see...').",
        "Respect allowed keywords only: the review must not invent items beyond the selected tags.",
      ].join("\n"),
      user: [
        `Store: ${storeName} (id: ${storeid})`,
        `Positive keywords: ${joinedPosTags || "(none provided)"}`,
        consTags.length > 0 ? `Improvement keywords (use 1-2 as mild suggestions): ${joinedConsTags}` : "",
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
        "評論整體以「正面關鍵詞」為主。",
        "若有「改進建議」關鍵字，最多挑 1–2 個，在結尾用溫和、建設性的方式提出。",
        // ✅ [新增] 嚴格的「封口令」
        "若【沒有】提供「改進建議」關鍵字，請給予【100% 全正面好評】，嚴禁無中生有、捏造任何建議或期待（例如：如果...就更好了）。",
        "僅能使用勾選的關鍵詞，不得捏造未被選中的餐點/形容詞。",
      ].join("\n"),
      user: [
        `店名：${storeName}（id: ${storeid}）`,
        `正面關鍵詞：${joinedPosTags || "（無）"}`,
        consTags.length > 0 ? `改進建議 (溫和提出 1-2 項)：${joinedConsTags}` : "",
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
        "'긍정적 키워드'에 집중하세요.",
        "'개선 제안' 키워드가 있다면, 마지막에 1-2개 정도만 부드러운 제안으로 포함하세요.",
        // ✅ [新增] 嚴格的「封口令」
        "'개선 제안' 키워드가【없다면】, 리뷰는【100% 긍정적】이어야 합니다. 어떠한 제안이나 비판도 절대 만들어내지 마세요 (예: '...라면 완벽할 것이다').",
        "선택한 키워드만 사용하고, 그 밖의 항목을 새로 만들어내지 마세요.",
      ].join("\n"),
      user: [
        `매장: ${storeName} (id: ${storeid})`,
        `긍정적 키워드: ${joinedPosTags || "(없음)"}`,
        consTags.length > 0 ? `개선 제안 (1-2개, 부드럽게): ${joinedConsTags}` : "",
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
        "「ポジティブキーワード」を中心に記述してください。",
        "「改善提案」がある場合、最後に1〜2点ほど、穏やかな提案として含めてください。",
        // ✅ [新增] 嚴格的「封口令」
        "「改善提案」キーワードが【ない】場合は、【100%肯定的な】レビューにしてください。提案や批判（例：「...すればもっと良い」）を捏造することは固く禁じます。",
        "選択したキーワードのみ使用し、それ以外の項目を新たに作らないでください。",
      ].join("\n"),
      user: [
        `店名：${storeName}（id: ${storeid}）`,
        `ポジティブキーワード：${joinedPosTags || "（なし）"}`,
        consTags.length > 0 ? `改善提案 (1-2点、穏やかに)：${joinedConsTags}` : "",
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
        "Concentrez-vous sur les 'Mots-clés positifs'.",
        "Si des 'Suggestions d'amélioration' sont fournies, incluez-en 1 ou 2 maximum à la fin comme suggestions constructives.",
        // ✅ [新增] 嚴格的「封口令」
        "Si **aucune** 'Suggestion d'amélioration' n'est fournie, l'avis doit être **100% positif**. N'inventez AUCUNE suggestion ou critique (par ex: 'ce serait parfait si...').",
        "N’utilisez que les mots-clés sélectionnés; n’inventez pas d’éléments non choisis.",
      ].join("\n"),
      user: [
        `Établissement : ${storeName} (id : ${storeid})`,
        `Mots-clés positifs : ${joinedPosTags || "(aucun)"}`,
        consTags.length > 0 ? `Suggestions d'amélioration (1-2, avec tact) : ${joinedConsTags}` : "",
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
        "Céntrate en las 'Palabras clave positivas'.",
        "Si se proporcionan 'Sugerencias de mejora', incluye 1 o 2 como sugerencias constructivas al final.",
        // ✅ [新增] 嚴格的「封口令」
        "Si **no** se proporcionan 'Sugerencias de mejora', la reseña debe ser **100% positiva**. NO inventes ninguna sugerencia o crítica (ej: 'sería perfecto si...').",
        "Usa solo las palabras clave seleccionadas; no inventes elementos non elegidos.",
      ].join("\n"),
      user: [
        `Lugar: ${storeName} (id: ${storeid})`,
        `Palabras clave positivas: ${joinedPosTags || "(ninguna)"}`,
        consTags.length > 0 ? `Sugerencias de mejora (1-2, con tacto): ${joinedConsTags}` : "",
        ref.length ? `Referencia (solo tono, no añadir ítems): ${ref.join(" | ")}` : "",
        `Variante de style : ${FLAVORS[variant]}`,
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

// ✅ [修改] ！！！把 context 參數加回來 ！！！
exports.handler = async (event, context) => {
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

  // 語言檢測 (提前)
  let currentLang = 'en';
  try {
    const bodyCheck = JSON.parse(event.body || "{}");
    currentLang = (bodyCheck.lang || "en").toLowerCase();
  } catch {}

  try {
    if (!OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY" }, 500);

    // ✅ [修改] 成本控管 (混合 in-memory 和 Netlify Blobs)
    const ip = getIP(event);
    
    // 1. 檢查 (in-memory) 全域計數器
    if (!checkGlobalDailyLimit()) {
      return json({ error: "Daily quota reached" }, 429);
    }
    
    // 2. 檢查 (Blobs) IP 節流 (注意 await)
    //    (因為 context 存在，`getStore` 現在可以正常運作)
const ipCheckPassed = await checkIpWindowBlob(ip, event);
    
    if (!ipCheckPassed) {
      // 區分是「節流」還是「配置錯誤」
      // 由於 checkIpWindowBlob 內部會印出 console.error，我們這裡統一回傳 429
      const errorMsg = {
        en: "Too many requests from this IP. Please try again later.",
        zh: "您的請求過於頻繁，請稍後再試。"
      }[currentLang] || "Too many requests from this IP.";
      
      return json({ error: errorMsg }, 429);
    }

    const body = JSON.parse(event.body || "{}");
    const storeid = (body.storeid || "").trim();
    
    // ✅ [修改] 讀取新的 tags 格式
    const positiveTags = Array.isArray(body.positiveTags) ? body.positiveTags : [];
    const consTags = Array.isArray(body.consTags) ? body.consTags : [];
    let selectedTags; // 用於 cache key 和 ngram
    const useNewFormat = positiveTags.length > 0 || consTags.length > 0;

    if (useNewFormat) {
      selectedTags = [...positiveTags, ...consTags].sort();
    } else {
      // 舊格式回退
      selectedTags = Array.isArray(body.selectedTags) ? body.selectedTags.sort() : [];
    }

    // const lang = (body.lang || "en").toLowerCase(); // ⬅ 已在上面提前
    const minChars = Math.max(60, parseInt(body.minChars || 90, 10));
    const maxChars = Math.max(minChars + 20, parseInt(body.maxChars || 160, 10));
    if (!storeid) return json({ error: "storeid required" }, 400);
    // ✅ [修改] 檢查 selectedTags (組合後的)
    if (selectedTags.length === 0) return json({ error: "No tags selected" }, 400);

    const variant = pickVariant(storeid, selectedTags);
    const abBucket = pickAB(storeid);

    // ✅ [修改] cacheKey 使用 selectedTags (組合後的)
    const cacheKey = stableKey({ storeid, selectedTags, minChars, maxChars, v: variant, lang: currentLang });
    //const cached = cacheGet(cacheKey);
    //if (cached) return json(cached, 200);

    const meta = (await fetchStoreRow(storeid.toLowerCase())) || { name: storeid, placeId: "" };
    const storeName = meta.name || storeid;

    // ✅ [修改] 傳遞 new/old tags 給 buildPrompt
    const { sys, user } = buildPrompt({
      lang: currentLang, storeid, storeName, meta,
      positiveTags: useNewFormat ? positiveTags : selectedTags, // 如果是舊格式，把 selectedTags 全當 positive
      consTags: useNewFormat ? consTags : [], // 舊格式沒有 cons
      minChars, maxChars, variant
    });

    // 第一次生成
    let { text, usage, latencyMs } = await callOpenAI(sys, user);

    // ✅ [修改] 呼叫 Supabase 進行去重檢查 (注意 await)
    if (await isTooSimilarSupabase(storeid, text, 0.6)) {
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
      // ✅ [修改] meta 也回傳 new/old tags
      meta: { variant, abBucket, minChars, maxChars, tags: selectedTags, positiveTags, consTags, lang: currentLang },
    };

    // ✅ [修改] 寫入 Supabase (注意 await)
    await storeReviewSupabase(storeid, text);

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
            // ✅ [修改] webhook 傳送 new/old tags
            selectedTags,
            positiveTags,
            consTags,
            reviewText: text,
            variant,
            abBucket,
            latencyMs,
            usage,
            lang: currentLang,
            clientIp: ip,
            userAgent: (event.headers["user-agent"] || "")
          }),
        });
      } catch (_) {}
    }

    //cacheSet(cacheKey, result);
    return json(result, 200);
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};
