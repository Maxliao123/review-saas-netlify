// functions/generate.js
exports.handler = async (event) => {
  // --- CORS ---
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
      body: "",
    };
  }

  try {
    if (event.httpMethod !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const {
      OPENAI_API_KEY,
      SHEET_ID,
      SHEET_STORES = "stores",
      SHEET_HISTORY = "ReviewHistory",
      APPS_SCRIPT_APPEND_URL = "",
    } = process.env;

    const bodyIn = JSON.parse(event.body || "{}");
    const {
      storeid,
      selectedTags = [],
      lang = "zh-Hant",
      tone = "friendly",
      maxLen = 100,
    } = bodyIn;

    if (!storeid) return json({ error: "storeid required" }, 400);
    if (!OPENAI_API_KEY) return json({ error: "Missing OPENAI_API_KEY" }, 500);
    if (!SHEET_ID) return json({ error: "Missing SHEET_ID env" }, 500);

    // ---- helpers ----
    const csvParse = (text) => {
      const rows = [];
      let i = 0,
        cur = "",
        inQ = false,
        row = [];
      while (i < text.length) {
        const ch = text[i];
        if (inQ) {
          if (ch === '"' && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else if (ch === '"') {
            inQ = false;
          } else cur += ch;
        } else {
          if (ch === '"') inQ = true;
          else if (ch === ",") {
            row.push(cur);
            cur = "";
          } else if (ch === "\n") {
            row.push(cur);
            rows.push(row);
            row = [];
            cur = "";
          } else cur += ch;
        }
        i++;
      }
      if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
      }
      return rows;
    };

    const loadCsv = async (sheetName) => {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        sheetName
      )}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Sheet fetch failed " + res.status);
      const txt = await res.text();
      const rows = csvParse(txt);
      const headers = rows[0].map((h) => h.trim());
      return rows
        .slice(1)
        .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] || ""])));
    };

    const splitTags = (s) =>
      (s || "")
        .split(/[,、]/)
        .map((x) => x.trim())
        .filter(Boolean);
    const uniq = (a) => Array.from(new Set(a));

    // ---- load store row ----
    const stores = await loadCsv(SHEET_STORES);
    const row = stores.find(
      (d) =>
        (d.StoreID || "").toLowerCase() === String(storeid).toLowerCase()
    );
    if (!row) return json({ error: "store not found" }, 404);

    const storeName = row.StoreName || "";
    const placeId = row.PlaceID || "";
    const allTags = uniq([
      ...splitTags(row.Top3Items),
      ...splitTags(row.StoreFeatures),
      ...splitTags(row.Ambiance),
      ...splitTags(row["新品"] || row.tags_new),
    ]);

    // ---- load last sentences for de-dup ----
    let lastSentences = [];
    try {
      const history = await loadCsv(SHEET_HISTORY);
      const recent = history
        .filter(
          (h) =>
            (h.StoreID || "").toLowerCase() === String(storeid).toLowerCase()
        )
        .slice(-20);
      lastSentences = recent
        .map((h) => (h.GeneratedText || "").trim())
        .filter(Boolean);
    } catch (e) {
      // ignore if history sheet not found
    }

    // ---- build prompt ----
    const system =
      "你是專業在地美食寫手。請以第一人稱，寫出真誠、口語、自然的短評，總字數控制在 50 到 100 字之間。禁止條列與數字列點，避免浮誇與不實承諾。盡量融合使用者選擇的關鍵字，同時與近期評論避免重複。";

    const picked = selectedTags; // 直接使用來自前端的選擇
    const user = [
      `你是一位剛在「${storeName}」用餐完畢、感到非常滿意的顧客，正準備寫一篇 Google 評論。`,
      `你的任務是創作一段融合度極高的短評（50–100 字）。`,
      "",
      "【可用素材】（請融合成一段話，不要逐一列點）：",
      `- 菜品/產品/新品：${picked.join("、") || "（尚未選擇）"}`,
      "",
      "【寫作指令】",
      "1) 高度融合：請勿像清單一樣逐一提及素材；要自然地揉合在一句或幾句通順的話中，形成完整連貫的體驗。",
      "2) 格式要求：最終必須是一段流暢、完整的短文，嚴禁條列或數字列點。",
      "3) 視角：使用第一人稱「我」，語氣真誠、口語化，像一般顧客真心推薦。",
      lastSentences.length
        ? `【記憶參考（請避免雷同）】：${lastSentences.join(" / ")}`
        : "",
    ].join("\n");

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 160,
    };

    const t0 = Date.now();
    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!ai.ok) {
      const txt = await ai.text();
      throw new Error("OpenAI error " + ai.status + ": " + txt);
    }
    const result = await ai.json();
    const reviewText = (result.choices?.[0]?.message?.content || "").trim();
    const latency = Date.now() - t0;
    const usage = result.usage || {};

    // ---- append back to sheet by Apps Script (optional) ----
    if (APPS_SCRIPT_APPEND_URL) {
      try {
        await fetch(APPS_SCRIPT_APPEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            StoreID: storeid,
            GeneratedText: reviewText,
            SelectedTags: selectedTags,
            Lang: lang,
            Tone: tone,
            Model: payload.model,
            TokenUsage: usage,
            LatencyMs: latency,
            CreatedAt: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.warn("Append history failed:", e.message);
      }
    }

    return json(
      {
        reviewText,
        store: { name: storeName, placeId },
        usage,
        latencyMs: latency,
      },
      200
    );
  } catch (e) {
    console.error(e);
    return json({ error: e.message || "server error" }, 500);
  }
};

// ---- helper ----
function json(obj, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(obj),
  };
}

