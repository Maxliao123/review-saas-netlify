export const LANGS: Record<string, any> = {
    en: {
        label: 'EN',
        ui: {
            title: 'How was your experience at "{name}"?',
            sub: 'Select the tags that best match your feelings, and they will be automatically compiled into a Google Review draft for you.',
            gen: '✍️ Generate & Claim Reward',
            open: 'Copy & Open Google',
            placeholder: 'Your summarized review will appear here…'
        },
        customPlaceholder: 'Or type here...',
        customConsPlaceholder: 'Or type another suggestion...'
    },
    zh: {
        label: '中',
        ui: {
            title: '「{name}」的用餐體驗如何？',
            sub: '請點選幾個最符合您感受的標籤，將自動為您彙整成一份 Google 評論草稿。',
            gen: '✍️ 產生評論並領取獎勵',
            open: '📋 複製並開啟google評論',
            placeholder: '這裡會顯示整理後的一段短評…'
        },
        customPlaceholder: '或輸入其他餐點...',
        customConsPlaceholder: '或輸入其他建議...'
    },
    ko: {
        label: '한국어',
        ui: {
            title: '“{name}”에서의 경험은 어떠셨나요?',
            sub: '느끼신 점과 가장 일치하는 태그를 선택하시면, Google 리뷰 초안으로 자동 취합됩니다.',
            gen: '✍️ 작성 및 리워드 받기',
            open: '📋 복사 및 Google 열기',
            placeholder: '요약된 리뷰가 여기에 표시됩니다…'
        },
        customPlaceholder: '직접 입력...',
        customConsPlaceholder: '다른 제안을 입력...'
    },
    ja: {
        label: '日本語',
        ui: {
            title: '「{name}」でのご体験はいかがでしたか？',
            sub: 'ご感想に最も近いタグをいくつか選択してください。Google レビューの下書きが自動的に作成されます。',
            gen: '✍️ 作成して特典を受け取る',
            open: '📋 コピーして Google を開く',
            placeholder: '要約したレビューが表示されます…'
        },
        customPlaceholder: 'その他を入力...',
        customConsPlaceholder: 'ほかの提案を入力...'
    },
    fr: {
        label: 'FR',
        ui: {
            title: 'Comment était votre expérience chez « {name} » ?',
            sub: 'Sélectionnez les points qui correspondent à votre ressenti, et ils seront automatiquement compilés en un brouillon d\'avis Google.',
            gen: '✍️ Rédiger & Récompense',
            open: '📋 Copier & Ouvrir Google',
            placeholder: 'Votre avis synthétisé s’affichera ici…'
        },
        customPlaceholder: 'Ou tapez ici...',
        customConsPlaceholder: 'Ou écrivez une autre suggestion...'
    },
    es: {
        label: 'ES',
        ui: {
            title: '¿Qué tal tu experiencia en «{name}»?',
            sub: 'Elige las etiquetas que mejor describan tu experiencia y se compilarán automáticamente en un borrador de reseña de Google.',
            gen: '✍️ Redactar y Reclamar',
            open: '📋 Copier y Abrir Google',
            placeholder: 'Aquí aparecerá tu reseña…'
        },
        customPlaceholder: 'O escriba aquí...',
        customConsPlaceholder: 'O escriba otra sugerencia...'
    }
};

export const CHIP_GROUPS_CONFIG = [
    {
        id: 'food',
        keys: ['top3', 'newItems'],
        title: {
            zh: "今天最有印象的餐點？",
            en: "What did you enjoy most about the food?",
            ko: "오늘 가장 인상 깊었던 메뉴는 무엇인가요?",
            ja: "今日最も印象に残ったお料理は？",
            fr: "Qu'avez-vous le plus apprécié dans les plats ?",
            es: "¿Qué fue lo que más le gustó de la comida?"
        }
    },
    {
        id: 'features',
        keys: ['features'],
        title: {
            zh: "有哪些讓你印象深刻的特色？",
            en: "What features stood out to you?",
            ko: "인상 깊었던 특징이 있나요?",
            ja: "印象に残った特徴はありますか？",
            fr: "Quelles caractéristiques vous ont marqué ?",
            es: "¿Qué características le parecieron notables?"
        }
    },
    {
        id: 'occasion',
        keys: ['ambiance'],
        title: {
            zh: "這次的用餐場合是？",
            en: "What was the occasion for this visit?",
            ko: "이번 방문 목적은 무엇이었나요?",
            ja: "今回の利用シーンは？",
            fr: "Quelle était l'occasion de cette visite ?",
            es: "¿Cuál fue el motivo de su visita?"
        }
    },
    {
        id: 'suggestions',
        keys: ['cons'],
        isConsGroup: true,
        title: {
            zh: "有什麼我們可以做得更好的地方？(選填)",
            en: "Anything we can do better? (Optional)",
            ko: "개선할 점이 있을까요? (선택 사항)",
            ja: "改善できる点はありますか？ (任意)",
            fr: "Pouvons-nous nous améliorer ? (Optionnel)",
            es: "¿Hay algo que podamos mejorar? (Opcional)"
        }
    }
];
