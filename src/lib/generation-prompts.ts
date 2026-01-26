export const FLAVORS = [
    "開頭直接點名今天最喜歡的品項 + 感受，語氣自然親切、像對朋友分享，但不要太浮誇。",
    "先一短句總結整體體驗，再補 1–2 個具體亮點，精簡俐落、重點清楚，少形容詞、多實際細節。",
    "加一點感官描寫：口感 / 香氣 / 溫度 / 份量擇一寫具體細節，讓畫面感更強。",
    "語氣偏中性理性，像在記錄心得：陳述體驗重點，避免誇飾與口頭禪。",
    "加入一個小情境（點餐 / 上桌 / 座位 / 排隊 / 結帳其中一項），但整體仍保持 1–2 句內完成。",
];

export const PERSONAS = [
    {
        key: "family_foodie",
        enLabel: "family customer",
        enHint: "Warm and friendly tone, may mention good vibe for coming with family or friends.",
        zhLabel: "家庭客",
        zhHint: "語氣溫暖自然，適合提到一起用餐、分享的感覺，讓人覺得很適合聚餐與團聚。"
    },
    {
        key: "busy_professional",
        enLabel: "busy professional",
        enHint: "Direct and efficient tone, cares about speed, convenience and value.",
        zhLabel: "上班族 / 午餐客",
        zhHint: "語氣俐落，重點放在出餐速度、方便性和CP值。"
    },
    {
        key: "detail_lover",
        enLabel: "detail-oriented foodie",
        enHint: "Enjoys describing texture, flavour, portion size and small details.",
        zhLabel: "細節控 / 美食控",
        zhHint: "會多描述口感、香氣、份量等細節，讓畫面感更強。"
    }
];

export const MICRO_TIERS = [
    "改成第一人稱的口吻，像是在跟朋友分享今日用餐經驗，加入一個具體的小細節。",
    "開頭不要用『整體來說』或『這次用餐』，換成直接描述最有印象的亮點，再補一句感受。",
    "自然提到一次店名或所在區域（例如某某路、某某商圈）即可，不要硬塞太多關鍵字。",
    "加入一個關於服務、出菜速度或環境氛圍的具體描寫，但保持語氣輕鬆友善。",
    "避免連續使用一樣的形容詞，例如『非常好吃』『真的很好吃』，換成不同描述方式。",
    "可以稍微提到份量、價格或 CP 值，但不要像廣告文案，要像客人真實的心得。",
    "如果有改進建議，用一兩個字帶過，例如『如果…會更好』，整體仍維持正向。",
];

interface PromptContext {
    lang: string;
    storeid: string;
    storeName: string;
    meta: any;
    positiveTags: string[];
    consTags: string[];
    minChars?: number;
    maxChars?: number;
    variant: number;
    persona?: typeof PERSONAS[0] | null;
}

export function buildPrompt({
    lang,
    storeid,
    storeName,
    meta,
    positiveTags,
    consTags,
    minChars,
    maxChars,
    variant,
    persona,
}: PromptContext) {
    const ref = [];
    if (meta.top3) ref.push(`Top: ${meta.top3}`);
    if (meta.features) ref.push(`Service/Flow: ${meta.features}`);
    if (meta.ambiance) ref.push(`Ambience: ${meta.ambiance}`);
    if (meta.newItems) ref.push(`New: ${meta.newItems}`);

    const joinedPosTags = (positiveTags || []).join(", ");
    const joinedConsTags = (consTags || []).join(", ");
    const rangeText = `${minChars}-${maxChars}`;

    const personaLineEn = persona
        ? `Write in the voice of a ${persona.enLabel} customer: ${persona.enHint}`
        : "";
    const personaLineZh = persona
        ? `請用「${persona.zhLabel || persona.enLabel}」的口吻來寫：${persona.zhHint || persona.enHint}`
        : "";

    const T: Record<string, { sys: string; user: string }> = {
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
                personaLineEn,
                `Positive keywords: ${joinedPosTags || "(none provided)"}`,
                consTags.length > 0
                    ? `Improvement keywords (use 1–2 as mild suggestions): ${joinedConsTags}`
                    : "",
                ref.length
                    ? `Reference only (tone/angle only, do not add new items): ${ref.join(" | ")}`
                    : "",
                `Style variant: ${FLAVORS[variant] || ''}`,
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
                personaLineZh,
                `正面關鍵詞：${joinedPosTags || "（無）"}`,
                consTags.length > 0
                    ? `改進建議（溫和帶出 1–2 項即可）：${joinedConsTags}`
                    : "",
                ref.length
                    ? `（僅作語氣與方向參考，不得新增品項）${ref.join("｜")}`
                    : "",
                `風格變體：${FLAVORS[variant] || ''}`,
                `字數範圍：${rangeText}（概略即可）`,
                "只輸出最終短評文字。",
            ]
                .filter(Boolean)
                .join("\n"),
        },
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
                personaLineEn,
                `긍정적 키워드: ${joinedPosTags || "(없음)"}`,
                consTags.length > 0
                    ? `개선 제안 (1-2개, 부드럽게): ${joinedConsTags}`
                    : "",
                ref.length
                    ? `참고(새 항목 추가 금지): ${ref.join(" | ")}`
                    : "",
                `스타일 변형: ${FLAVORS[variant] || ''}`,
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
                personaLineEn,
                `ポジティブキーワード：${joinedPosTags || "（なし）"}`,
                consTags.length > 0
                    ? `改善提案 (1-2点、穏やかに)：${joinedConsTags}`
                    : "",
                ref.length
                    ? `参考（新規項目の追加は禁止）：${ref.join("｜")}`
                    : "",
                `文体バリアント：${FLAVORS[variant] || ''}`,
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
                personaLineEn,
                `Mots-clés positifs : ${joinedPosTags || "(aucun)"}`,
                consTags.length > 0
                    ? `Suggestions d'amélioration (1–2, avec tact) : ${joinedConsTags}`
                    : "",
                ref.length
                    ? `Références (ton uniquement, ne rien ajouter) : ${ref.join(" | ")}`
                    : "",
                `Variante de style : ${FLAVORS[variant] || ''}`,
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
                personaLineEn,
                `Palabras clave positivas: ${joinedPosTags || "(ninguna)"}`,
                consTags.length > 0
                    ? `Sugerencias de mejora (1–2, con tacto): ${joinedConsTags}`
                    : "",
                ref.length
                    ? `Referencia (solo tono, no añadir ítems): ${ref.join(" | ")}`
                    : "",
                `Variante de estilo: ${FLAVORS[variant] || ''}`,
                `Objetivo de longitud: ${rangeText} caracteres (orientativo).`,
                "Devuelve SOLO el texto final de la reseña.",
            ]
                .filter(Boolean)
                .join("\n"),
        },
    };

    return T[lang] || T["en"];
}
