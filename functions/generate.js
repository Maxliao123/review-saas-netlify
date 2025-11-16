// functions/generate.js
// POST /.netlify/functions/generate
// Body: { storeid, positiveTags: string[], consTags: string[], lang?, minChars?, maxChars?, tagBuckets? }

const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
const SHEET_ID         = process.env.SHEET_ID;
const SHEET_NAME       = process.env.SHEET_NAME || "stores";
const CACHE_TTL_S      = parseInt(process.env.CACHE_TTL_S || "60", 10);
const CACHE_TTL_MS     = Math.max(10, CACHE_TTL_S) * 1000;

// 成本控管 / 節流
const DAILY_MAX_CALLS  = parseInt(process.env.DAILY_MAX_CALLS || "1000", 10);
const PER_IP_MAX       = parseInt(process.env.PER_IP_MAX || "30", 10);
const PER_IP_WINDOW_S  = parseInt(process.env.PER_IP_WINDOW_S || "900", 10); // 15 分鐘
const REVIEW_WEBHOOK   = process.env.REVIEW_WEBHOOK_URL || "";

console.log("DEBUG REVIEW_WEBHOOK_URL =", process.env.REVIEW_WEBHOOK_URL);

// 相似度門檻（pg_trgm similarity），超過就觸發 rewrite
const SIMILARITY_THRESHOLD = 0.5;

// ✅ 引入 pg 並建立 Supabase 連線池
const { Pool } = require("pg");
const pgPool = new Pool({
  connectionString: process.env.SUPABASE_PG_URL,
  ssl: { rejectUnauthorized: false }, // Supabase 需要 SSL
});

// ✅ 引入 Netlify Blobs API
const { getStore, connectLambda } = require("@netlify/blobs");

// —— in-memory stores（同一 Lambda 實例有效）——
const cache = new Map(); // key -> { expiresAt, data }
const dailyCounter = { date: dayStr(), count: 0 }; // 全域計數器

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
function dayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function stableKey(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

// cache
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}
function cacheSet(key, data) {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
}

// 小型 hash
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// 讀店家 row（A..G）
async function fetchStoreRow(storeidLower) {
  if (!SHEET_ID) return null;
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
  const tq = encodeURIComponent(
    `select A,B,C,D,E,F,G where lower(A)='${storeidLower}' limit 1`
  );
  const url = `${base}?sheet=${encodeURIComponent(SHEET_NAME)}&tq=${tq}`;
  const r = await fetch(url);
  const txt = await r.text();
  const jsonStr = txt
    .replace(/^[\s\S]*setResponse\(/, "")
    .replace(/\);?\s*$/, "");
  const obj = JSON.parse(jsonStr);
  const row = obj?.table?.rows?.[0]?.c;
  if (!row) return null;
  const val = (i) => ((row[i]?.v ?? "") + "").trim();
  return {
    storeid: val(0),
    name: val(1) || val(0),
    placeId: val(2),
    top3: val(3),
    features: val(4),
    ambiance: val(5),
    newItems: val(6),
  };
}

// 穩定隨機變體 + AB bucket
const FLAVORS = [
  "開頭直接點名今天最喜歡的品項 + 感受，語氣自然親切、像對朋友分享，但不要太浮誇。",
  "先一短句總結整體體驗，再補 1–2 個具體亮點，精簡俐落、重點清楚，少形容詞、多實際細節。",
  "加一點感官描寫：口感 / 香氣 / 溫度 / 份量擇一寫具體細節，讓畫面感更強。",
  "語氣偏中性理性，像在記錄心得：陳述體驗重點，避免誇飾與口頭禪。",
  "加入一個小情境（點餐 / 上桌 / 座位 / 排隊 / 結帳其中一項），但整體仍保持 1–2 句內完成。",
];
function pickVariant(seedA, seedB) {
  const h = hashStr(stableKey({ seedA, seedB }));
  return h % FLAVORS.length; // 0..4
}
function pickAB(storeid) {
  return (hashStr(storeid) % 2) === 0 ? "A" : "B";
}

// Supabase 去重檢查：回傳 tooSimilar + maxSim
async function isTooSimilarSupabase(store_id, review_text, threshold = SIMILARITY_THRESHOLD) {
  const query = `
    SELECT similarity(review_text, $2) AS sim
    FROM generated_reviews 
    WHERE store_id = $1
    ORDER BY sim DESC
    LIMIT 1;
  `;
  try {
    const { rows } = await pgPool.query(query, [
      store_id,
      review_text,
    ]);
    const maxSim = rows?.[0]?.sim ?? null;
    const tooSimilar =
      typeof maxSim === "number" && maxSim >= (threshold ?? SIMILARITY_THRESHOLD);
    return { tooSimilar, maxSim };
  } catch (e) {
    console.error("Supabase similarity check error:", e.message);
    return { tooSimilar: false, maxSim: null };
  }
}

// ⭐ 儲存評論到 Supabase，並回傳這一筆的 id（含標籤欄位）
async function storeReviewSupabase(store_id, review_text, tagBuckets = {}) {
  const {
    posTop3 = [],
    posFeatures = [],
    posAmbiance = [],
    posNewItems = [],
    customFood = null,
    cons = [],
    customCons = null,
  } = tagBuckets || {};

  const query = `
    INSERT INTO generated_reviews (
      store_id,
      review_text,
      pos_top3_tags,
      pos_features_tags,
      pos_ambiance_tags,
      pos_newitems_tags,
      custom_food_tag,
      cons_tags,
      custom_cons_tag
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id;
  `;

  const safeJoin = (val) =>
    Array.isArray(val) ? val.join(",") : (val == null ? null : String(val));

  const values = [
    store_id,
    review_text,
    safeJoin(posTop3),
    safeJoin(posFeatures),
    safeJoin(posAmbiance),
    safeJoin(posNewItems),
    customFood == null || customFood === "" ? null : String(customFood),
    safeJoin(cons),
    customCons == null || customCons === "" ? null : String(customCons),
  ];

  try {
    const { rows } = await pgPool.query(query, values);
    return rows?.[0]?.id || null;
  } catch (e) {
    console.error("Supabase insert error:", e.message);
    return null;
  }
}

// 節流：取得 IP
function getIP(event) {
  return (
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    event.headers["x-real-ip"] ||
    "0.0.0.0"
  );
}

// in-memory 全域計數器（當天累計）
function checkGlobalDailyLimit() {
  const today = dayStr();
  if (dailyCounter.date !== today) {
    dailyCounter.date = today;
    dailyCounter.count = 0;
  }
  if (dailyCounter.count >= DAILY_MAX_CALLS) return false;
  dailyCounter.count++;
  return true;
}

// Netlify Blobs 版本的 IP 節流
async function checkIpWindowBlob(ip, event) {
  connectLambda(event);
  const store = getStore("rate_limiting_ips");
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
      return false;
    }

    recentTimestamps.push(now);
    await store.set(key, JSON.stringify(recentTimestamps), {
      metadata: { updatedAt: now },
      ttl: PER_IP_WINDOW_S,
    });

    return true;
  } catch (e) {
    console.error("Netlify Blobs checkIpWindow error:", e.message);
    // 保守做法：出錯時先擋掉，避免被洗爆
    return false;
  }
}

// OpenAI
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
        { role: "user", content: user },
      ],
    }),
  });
  if (!resp.ok)
    throw new Error(
      `OpenAI ${resp.status}: ${await resp.text().catch(() => "")}`
    );
  const data = await resp.json();
  return {
    text: data?.choices?.[0]?.message?.content?.trim() || "",
    usage: data?.usage || {},
    latencyMs: Date.now() - t0,
  };
}

// —— 多語系 system/user 模板 —— //
function buildPrompt({
  lang,
  storeid,
  storeName,
  meta,
  positiveTags,
  consTags,
  minChars,
  maxChars,
  variant,
}) {
  const ref = [];
  if (meta.top3) ref.push(`Top: ${meta.top3}`);
  if (meta.features) ref.push(`Service/Flow: ${meta.features}`);
  if (meta.ambiance) ref.push(`Ambience: ${meta.ambiance}`);
  if (meta.newItems) ref.push(`New: ${meta.newItems}`);

  const joinedPosTags = (positiveTags || []).join(", ");
  const joinedConsTags = (consTags || []).join(", ");
  const rangeText = `${minChars}-${maxChars}`;

  const T = {
    en: {
      sys: [
        "You are a credible local food reviewer.",
        "Write 1–2 compact sentences in natural English; no hashtags, no emojis, no bullet points, and avoid excessive exclamation marks.",
        "Vary the opening so reviews do not always start the same way; avoid generic templates and filler phrases.",
        "Naturally mention the restaurant name or neighbourhood once (if it fits), so it sounds like a real local review, but do not keyword-stuff.",
        "Focus on the 'Positive keywords' and describe concrete details such as flavour, texture, portion size, service attitude, atmosphere, or value for money.",
        "If 'Improvement keywords' are provided, you may use at most 1–2 of them as mild, constructive suggestions near the end.",
        "If **no** 'Improvement keywords' are provided, the review must be **100% positive**. Do NOT invent any suggestions or criticisms (for example: 'it would be perfect if...', 'I hope they can…').",
        "Respect the selected keywords only; do not invent dishes or features that the user did not choose.",
      ].join("\n"),
      user: [
        `Store: ${storeName} (id: ${storeid})`,
        `Positive keywords: ${joinedPosTags || "(none provided)"}`,
        consTags.length > 0
          ? `Improvement keywords (use 1–2 as mild suggestions): ${joinedConsTags}`
          : "",
        ref.length
          ? `Reference only (tone/angle only, do not add new items): ${ref.join(
              " | "
            )}`
          : "",
        `Style variant: ${FLAVORS[variant]}`,
        `Length target: ${rangeText} characters (rough guidance).`,
        "Return ONLY the final review text.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    zh: {
      sys: [
        "你是懂在地口味的美食短評寫手。",
        "請用繁體中文撰寫 1–2 句，語氣自然可信、像在跟朋友分享用餐心得，不要列點、不要 hashtag、不要 emoji、避免過度誇飾與制式開頭。",
        "可以在文字中『自然地』帶到一次店名或地區名稱（例如：某某路、某某商圈），讓評論更有在地感，但不要刻意堆疊關鍵字。",
        "評論整體以「正面關鍵詞」為主，盡量描述具體體驗，例如味道、口感、份量、環境、服務態度、出菜速度或 CP 值。",
        "若有「改進建議」關鍵字，最多挑 1–2 個，在結尾用溫和、建設性的方式帶過，例如『如果…會更好』，整體語氣仍以正面為主。",
        "若【沒有】提供「改進建議」關鍵字，請給予【100% 全正面好評】，嚴禁無中生有、捏造任何建議或期待（例如：『如果…就更好了』、『希望未來…』等）。",
        "只允許使用已勾選的關鍵詞，不得捏造未被選中的餐點、服務或形容詞。",
      ].join("\n"),
      user: [
        `店名：${storeName}（id: ${storeid}）`,
        `正面關鍵詞：${joinedPosTags || "（無）"}`,
        consTags.length > 0
          ? `改進建議（溫和帶出 1–2 項即可）：${joinedConsTags}`
          : "",
        ref.length
          ? `（僅作語氣與方向參考，不得新增品項）${ref.join("｜")}`
          : "",
        `風格變體：${FLAVORS[variant]}`,
        `字數範圍：${rangeText}（概略即可）`,
        "只輸出最終短評文字。",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    // 其他語言維持原本邏輯
    ko: {
      sys: [
        "당신은 현지에 밝은 음식 리뷰어입니다.",
        "자연스러운 한국어로 1–2문장만 작성하세요. 해시태그/이모지/불릿포인트/과도한 감탄사는 사용하지 마세요.",
        "'긍정적 키워드'에 집중하세요.",
        "'개선 제안' 키워드가 있다면, 마지막에 1-2개 정도만 부드러운 제안으로 포함하세요.",
        "'개선 제안' 키워드가【없다면】, 리뷰는【100% 긍정적】이어야 합니다. 어떠한 제안이나 비판도 절대 만들어내지 마세요 (예: '...라면 완벽할 것이다').",
        "선택한 키워드만 사용하고, 그 밖의 항목을 새로 만들어내지 마세요.",
      ].join("\n"),
      user: [
        `매장: ${storeName} (id: ${storeid})`,
        `긍정적 키워드: ${joinedPosTags || "(없음)"}`,
        consTags.length > 0
          ? `개선 제안 (1-2개, 부드럽게): ${joinedConsTags}`
          : "",
        ref.length
          ? `참고(새 항목 추가 금지): ${ref.join(" | ")}`
          : "",
        `스타일 변형: ${FLAVORS[variant]}`,
        `길이 가이드: ${rangeText}자`,
        "최종 리뷰 문장만 반환하세요.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    ja: {
      sys: [
        "あなたは土地勘のあるフードレビュアーです。",
        "自然な日本語で1〜2文。ハッシュタグ・絵文字・箇条書き・過度な感嘆符は使わないでください。",
        "「ポジティブキーワード」を中心に記述してください。",
        "「改善提案」がある場合、最後に1〜2点ほど、穏やかな提案として含めてください。",
        "「改善提案」キーワードが【ない】場合は、【100%肯定的な】レビューにしてください。提案や批判（例：「...すればもっと良い」）を捏造することは固く禁じます。",
        "選択したキーワードのみ使用し、それ以外の項目を新たに作らないでください。",
      ].join("\n"),
      user: [
        `店名：${storeName}（id: ${storeid}）`,
        `ポジティブキーワード：${joinedPosTags || "（なし）"}`,
        consTags.length > 0
          ? `改善提案 (1-2点、穏やかに)：${joinedConsTags}`
          : "",
        ref.length
          ? `参考（新規項目の追加は禁止）：${ref.join("｜")}`
          : "",
        `文体バリアント：${FLAVORS[variant]}`,
        `文字数目安：${rangeText}`,
        "最終のレビュー文のみを出力してください。",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    fr: {
      sys: [
        "Vous êtes un critique culinaire local crédible.",
        "Rédigez 1–2 phrases naturelles en français; pas de hashtags, pas d’emojis, pas de listes, évitez les exclamations excessives.",
        "Concentrez-vous sur les 'Mots-clés positifs'.",
        "Si des 'Suggestions d'amélioration' sont fournies, incluez-en 1 ou 2 maximum à la fin comme suggestions constructives.",
        "Si **aucune** 'Suggestion d'amélioration' n'est fournie, l’avis doit être **100% positif**. N'inventez aucune suggestion ni critique (par ex: 'ce serait parfait si...').",
        "N’utilisez que les mots-clés sélectionnés; n’inventez pas d’éléments non choisis.",
      ].join("\n"),
      user: [
        `Établissement : ${storeName} (id : ${storeid})`,
        `Mots-clés positifs : ${joinedPosTags || "(aucun)"}`,
        consTags.length > 0
          ? `Suggestions d'amélioration (1–2, avec tact) : ${joinedConsTags}`
          : "",
        ref.length
          ? `Références (ton uniquement, ne rien ajouter) : ${ref.join(" | ")}`
          : "",
        `Variante de style : ${FLAVORS[variant]}`,
        `Longueur visée : ${rangeText} caractères (indicatif).`,
        "Retournez UNIQUEMENT le texte final de l’avis.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    es: {
      sys: [
        "Eres un reseñista gastronómico con conocimiento local.",
        "Escribe 1–2 frases naturales en español; sin hashtags, sin emojis, sin viñetas, evita signos de exclamación excesivos.",
        "Céntrate en las 'Palabras clave positivas'.",
        "Si se proporcionan 'Sugerencias de mejora', incluye 1 o 2 como sugerencias constructivas al final.",
        "Si **no** se proporcionan 'Sugerencias de mejora', la reseña debe ser **100% positiva**. NO inventes ninguna sugerencia o crítica (ejemplo: 'sería perfecto si...').",
        "Usa solo las palabras clave seleccionadas; no inventes elementos no elegidos.",
      ].join("\n"),
      user: [
        `Lugar: ${storeName} (id: ${storeid})`,
        `Palabras clave positivas: ${joinedPosTags || "(ninguna)"}`,
        consTags.length > 0
          ? `Sugerencias de mejora (1–2, con tacto): ${joinedConsTags}`
          : "",
        ref.length
          ? `Referencia (solo tono, no añadir ítems): ${ref.join(" | ")}`
          : "",
        `Variante de estilo: ${FLAVORS[variant]}`,
        `Objetivo de longitud: ${rangeText} caracteres (orientativo).`,
        "Devuelve SOLO el texto final de la reseña.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  };

  return T[lang] || T["en"];
}

// 微提示池
const MICRO = [
  "改成第一人稱的口吻，像是在跟朋友分享今日用餐經驗，加入一個具體的小細節。",
  "開頭不要用『整體來說』或『這次用餐』，換成直接描述最有印象的亮點，再補一句感受。",
  "自然提到一次店名或所在區域（例如某某路、某某商圈）即可，不要硬塞太多關鍵字。",
  "加入一個關於服務、出菜速度或環境氛圍的具體描寫，但保持語氣輕鬆友善。",
  "避免連續使用一樣的形容詞，例如『非常好吃』『真的很好吃』，換成不同描述方式。",
  "可以稍微提到份量、價格或 CP 值，但不要像廣告文案，要像客人真實的心得。",
  "如果有改進建議，用一兩個字帶過，例如『如果…會更好』，整體仍維持正向。",
];

// ⭐ 若沒選 consTags，卻寫出「如果…就更好」這類句子，再做一次重寫成純好評
async function enforceNoImprovementIfNoCons(text, lang, hasCons) {
  if (hasCons) return text;

  const zhPattern = /(如果|若是|要是).+更好|希望|期待|改進|改进/;
  const enPattern =
    /\bwould be (even )?better\b|\bhope\b|\bwish\b|\bif\b.+\b(could|would)\b/i;

  const needRewrite =
    (lang.startsWith("zh") && zhPattern.test(text)) ||
    (lang.startsWith("en") && enPattern.test(text));

  if (!needRewrite) return text;

  const sys =
    "You are an editor for customer reviews. Rewrite the review to keep all positive content, but remove any suggestions, wishes, or 'if..., it would be better' style sentences. Keep the same language as the original and return only the final revised review.";
  const user = `Language: ${lang}\nOriginal review:\n${text}`;

  try {
    const rewritten = await callOpenAI(sys, user);
    return rewritten.text || text;
  } catch (e) {
    console.error("enforceNoImprovementIfNoCons error:", e.message);
    return text;
  }
}

// handler
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
  if (event.httpMethod !== "POST")
    return json({ error: "Method not allowed" }, 405);

  // 提前判斷語言（方便回錯誤訊息）
  let currentLang = "en";
  try {
    const bodyCheck = JSON.parse(event.body || "{}");
    currentLang = (bodyCheck.lang || "en").toLowerCase();
  } catch {}

  try {
    if (!OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY" }, 500);

    const ip = getIP(event);

    // 1. 全域每日上限
    if (!checkGlobalDailyLimit()) {
      return json({ error: "Daily quota reached" }, 429);
    }

    // 2. IP 節流（Netlify Blobs）
    const ipCheckPassed = await checkIpWindowBlob(ip, event);
    if (!ipCheckPassed) {
      const errorMsg =
        {
          en: "Too many requests from this IP. Please try again later.",
          zh: "您的請求過於頻繁，請稍後再試。",
        }[currentLang] || "Too many requests from this IP.";
      return json({ error: errorMsg }, 429);
    }

    const body = JSON.parse(event.body || "{}");
    const storeid = (body.storeid || "").trim();

    const positiveTags = Array.isArray(body.positiveTags)
      ? body.positiveTags
      : [];
    const consTags = Array.isArray(body.consTags) ? body.consTags : [];
    const tagBuckets = body.tagBuckets || {};

    let selectedTags;
    const useNewFormat = positiveTags.length > 0 || consTags.length > 0;

    if (useNewFormat) {
      selectedTags = [...positiveTags, ...consTags].sort();
    } else {
      selectedTags = Array.isArray(body.selectedTags)
        ? body.selectedTags.sort()
        : [];
    }

    const minChars = Math.max(60, parseInt(body.minChars || 90, 10));
    const maxChars = Math.max(
      minChars + 20,
      parseInt(body.maxChars || 160, 10)
    );

    if (!storeid) return json({ error: "storeid required" }, 400);
    if (selectedTags.length === 0)
      return json({ error: "No tags selected" }, 400);

    const variant = pickVariant(storeid, selectedTags);
    const abBucket = pickAB(storeid);

    const cacheKey = stableKey({
      storeid,
      selectedTags,
      minChars,
      maxChars,
      v: variant,
      lang: currentLang,
    });
    // const cached = cacheGet(cacheKey);
    // if (cached) return json(cached, 200);

    const meta =
      (await fetchStoreRow(storeid.toLowerCase())) || {
        name: storeid,
        placeId: "",
      };
    const storeName = meta.name || storeid;

    const { sys, user } = buildPrompt({
      lang: currentLang,
      storeid,
      storeName,
      meta,
      positiveTags: useNewFormat ? positiveTags : selectedTags,
      consTags: useNewFormat ? consTags : [],
      minChars,
      maxChars,
      variant,
    });

    // 第一次生成
    let { text, usage, latencyMs } = await callOpenAI(sys, user);

    // ✅ 若「沒有選改進建議」，但文字裡出現疑似建議語氣，用一次改寫把它變成全正向
    if (consTags.length === 0) {
      const suspicious = /如果|建議|希望|更好/g;
      if (suspicious.test(text)) {
        const fixHint =
          currentLang === "zh"
            ? "請把上面的評論改寫成『完全正向的好評』，移除所有「如果…就更好」、「建議」、「希望」這類句子，只保留喜歡與讚美的重點。"
            : "Rewrite the review so that it is 100% positive only. Remove any suggestions, 'if ... it would be better', or wishes. Keep only praise and positive experience.";

        const retry = await callOpenAI(
          sys,
          user + `\n[Rewrite constraint]\n${fixHint}`
        );
        text = retry.text || text;
        usage = retry.usage || usage;
        latencyMs += retry.latencyMs || 0;
      }
    }

    // ✅ 呼叫 Supabase 進行去重檢查 + 監控
    const similarityCheck = await isTooSimilarSupabase(
      storeid,
      text,
      SIMILARITY_THRESHOLD
    );
    const similarityInfo = {
      thresholdUsed: SIMILARITY_THRESHOLD,
      maxSimBefore: similarityCheck?.maxSim ?? null,
      maxSimAfter: null,
      rewroteForSimilarity: false,
    };

    if (similarityCheck?.tooSimilar) {
      similarityInfo.rewroteForSimilarity = true;
      const hint = MICRO[hashStr(text) % MICRO.length];
      const retry = await callOpenAI(sys, user + `\n[Rewrite hint] ${hint}`);
      text = retry.text || text;
      usage = retry.usage || usage;
      latencyMs += retry.latencyMs || 0;

      // 重寫後再看一次實際相似度，純做監控用途
      const afterCheck = await isTooSimilarSupabase(
        storeid,
        text,
        SIMILARITY_THRESHOLD
      );
      similarityInfo.maxSimAfter = afterCheck?.maxSim ?? null;
    }

    // 再確保：沒有 consTags 時，不要出現「如果…更好」這類句子
    text = await enforceNoImprovementIfNoCons(
      text,
      currentLang,
      (useNewFormat ? consTags : []).length > 0
    );

    // ⭐ 先寫入 DB，拿到這一筆的 id（含標籤欄位）
    const reviewId = await storeReviewSupabase(storeid, text, tagBuckets);

    const result = {
      reviewText: text,
      store: { name: storeName, placeId: meta.placeId || "" },
      usage,
      latencyMs,
      reviewId,
      meta: {
        variant,
        abBucket,
        minChars,
        maxChars,
        tags: selectedTags,
        positiveTags,
        consTags,
        lang: currentLang,
        tagBuckets,
        similarityInfo,
      },
    };

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
            positiveTags,
            consTags,
            tagBuckets,
            similarityInfo,
            reviewText: text,
            variant,
            abBucket,
            latencyMs,
            usage,
            lang: currentLang,
            reviewId,
            clientIp: ip,
            userAgent: event.headers["user-agent"] || "",
          }),
        });
      } catch (_) {}
    }

    // cacheSet(cacheKey, result);
    return json(result, 200);
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};
