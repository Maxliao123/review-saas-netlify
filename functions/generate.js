// functions/generate.js
// 說明：
// - POST /api/generate
// - body: { storeid: string, selectedTags: string[], variant?: string, nonce?: number }
// - 回傳：{ reviewText, store: { name, placeId }, usage, latencyMs }

exports.handler = async (event) => {
  const t0 = Date.now();

  // CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: cors(),
      body: "",
    };
  }
  if (event.httpMethod !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const SHEET_ID = process.env.SHEET_ID;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ""; // 可選，用來自動補店家照片/名稱

    if (!OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY env" }, 500);
    if (!SHEET_ID)       return json({ error: "Missing SHEET_ID env" }, 500);

    const body = JSON.parse(event.body || "{}");
    let { storeid, selectedTags = [], variant = "", nonce } = body;
    storeid = (storeid || "").trim().toLowerCase();

    if (!storeid) return json({ error: "storeid is required" }, 400);

    // 去重、過濾空白
    selectedTags = Array.from(new Set((selectedTags || [])
      .map(s => (s || "").toString().trim())
      .filter(Boolean)));

    // 讀取店家基本資料（中文名/Place ID），與 /functions/store.js 的邏輯一致
    const meta = await readStoreMetaFromSheet(SHEET_ID, storeid, GOOGLE_MAPS_API_KEY);
    const storeName = meta.name || storeid;
    const placeId   = meta.placeId || "";

    // --- Prompt 設計 ---
    // 讓模型生成「1小段自然中文短評」，避免把標籤逐字抄進去，並依 variant 微調風格
    const style = (variant || "").trim();
    const tagClause = selectedTags.length
      ? `參考重點（僅作靈感，不要逐字照抄）：${selectedTags.join("、")}。`
      : `自行選擇 1–2 個正向特色（環境、服務、招牌品項或整體感受）作為重點。`;

    const systemPrompt = [
      "你是專業的中文在地向導，擅長撰寫自然、真誠、口語化的餐飲短評。",
      "產出 1 段 1–3 句的中文短評（避免條列），不超過 120 字。",
      "避免過度浮誇、避免廣告語氣、避免連續多個驚嘆號；不要直接複製使用者提供的關鍵詞。",
      "可微量加入具體細節（口感、氛圍、服務感受），但不要捏造價格或虛假承諾。",
      "不要包含店家內部資訊或 AI/生成的描述；不要加標題與引用。",
    ].join("\n");

    const userPrompt = [
      `店名（內部參考）：${storeName}`,
      tagClause,
      style ? `希望風格：${style}。` : "風格：自然真誠。",
      "請輸出：短評正文（1 段）。",
    ].join("\n");

    // --- OpenAI 請求 ---
    const openaiPayload = {
      model: "gpt-4o-mini",          // 可視成本與品質調整
      temperature: 0.9,              // 提高多樣性
      top_p: 0.9,
      presence_penalty: 0.5,         // 減少重複表達
      frequency_penalty: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiPayload),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`OpenAI error: ${aiRes.status} ${errText}`);
    }

    const aiJson = await aiRes.json();
    const text =
      aiJson?.choices?.[0]?.message?.content?.trim() ||
      aiJson?.choices?.[0]?.text?.trim() ||
      "";

    const latencyMs = Date.now() - t0;

    return json({
      reviewText: text,
      store: {
        name: storeName,
        placeId: placeId,
      },
      usage: aiJson?.usage || null,
      latencyMs,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};

/* -------------------------- helpers -------------------------- */

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function json(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...cors(),
    },
    body: JSON.stringify(data),
  };
}

/**
 * 讀取店家基本資料（中文名 / placeId），
 * Google Sheet「stores」工作表欄位順序：A storeid, B name_zh, C place_id, D logo_url
 * 如無 name_zh，會 fallback storeid；如無 place_id，回傳空字串。
 * 若提供 GOOGLE_MAPS_API_KEY，且 place_id 缺失，可加上你要的延伸查詢（這版先不做正向查找，以免歧義）。
 */
async function readStoreMetaFromSheet(SHEET_ID, storeid, GOOGLE_MAPS_API_KEY = "") {
  try {
    const sheetName = "stores";
    const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq`;
    const tq = encodeURIComponent(`select A,B,C,D where lower(A)='${storeid}' limit 1`);
    const url = `${base}?sheet=${encodeURIComponent(sheetName)}&tq=${tq}`;

    const r = await fetch(url);
    const txt = await r.text();
    const jsonStr = txt.replace(/^[\s\S]*setResponse\(/, "").replace(/\);?\s*$/, "");
    const obj = JSON.parse(jsonStr);

    let name = "";
    let placeId = "";

    if (obj.table && obj.table.rows && obj.table.rows.length) {
      const row = obj.table.rows[0].c;
      name    = (row[1]?.v || "").toString();
      placeId = (row[2]?.v || "").toString();
      // D 欄是 logo_url，本函式暫不回傳；需要的話可補
    }

    return { name, placeId };
  } catch (e) {
    console.warn("readStoreMetaFromSheet failed:", e.message);
    return { name: "", placeId: "" };
  }
}


