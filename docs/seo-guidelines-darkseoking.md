# DarkSEOKing SEO 實戰準則 — Reputation Monitor 適用版

> 來源：DarkSEOKing (IG/Threads) 截圖整理（原始檔位於 vancouver-meal-logistics/darkseoking/）
> 原始整理：vancouver-meal-logistics/docs/seo-guidelines-darkseoking.md
> 本版適用於：reputationmonitor.ai（review-saas-netlify）
> 最後更新：2026-03-10

---

## 目錄

1. [品牌名 Entity Stacking](#1-品牌名-entity-stacking)
2. [Google 演算法核心：語意集群](#2-google-演算法核心語意集群)
3. [AI 生成內容的正確打法](#3-ai-生成內容的正確打法)
4. [Gemini / SynthID 與 Google 排名](#4-gemini--synthid-與-google-排名)
5. [權重操控三招](#5-權重操控三招)
6. [語意策略一句話總結](#6-語意策略一句話總結)
7. [對 Reputation Monitor 的行動建議](#7-對-reputation-monitor-的行動建議)

---

## 1. 品牌名 Entity Stacking

**核心觀點：** 如果在 Google 搜尋你的品牌名，第一名不是你的官網，那你根本不應該花錢做 SEO。

**Entity Stacking 實踐步驟：**

1. **GBP（Google Business Profile）是最重要的陣地**
   - 所有企業細節填滿、全網的 NAP（名稱、地址、電話）保持 100% 一致
   - 這是最基礎也是不能省的實體訊號

2. **社群平台是給 Google 爬蟲的活躍訊號**
   - LinkedIn、Twitter/X、Facebook 穩定更新內容
   - 每個平台都放官網連結
   - 這些都是爬蟲能追蹤的連結

3. **外部評價向 Google 證明品牌在真實運作**
   - 評價火力集中在 Google 商家頁
   - Product Hunt、G2、Capterra 等 SaaS 目錄也是強信任訊號

4. **把所有帳號互相串聯** — 官網放社群、社群放官網和其他平台，織成一張信任網

**對 Reputation Monitor 的意義：** 品牌名 "Reputation Monitor" 搜尋結果需要全版面控制。

---

## 2. Google 演算法核心：語意集群

**核心觀點：** Google 現在的演算法看的是「語意距離」。相關主題要全部整合，不是拆成獨立頁面各自搶流量。

**語意集群的執行框架：**

> 長尾文章不是拿來獨立排的，純粹是吸收權重用的

1. **透過內部連結，把權重強制灌進核心頁面** — 我們叫做 **Boss 頁面**
2. **Boss 頁面特性：**
   - 不能只是文字堆疊，必須是所有集群內容的精煉整理
   - 必須加入互動功能性元件（計算器、比較工具等）
   - **AI 時代直接 vibe coding 一個就好了**
   - 功能型內容是 Google 最喜歡的形式，也是最難被複製的競爭壁壘

**Reputation Monitor Boss 頁面架構：**

| Boss 頁面 | 路由 | 互動元件 | 集群文章數 |
|-----------|------|---------|-----------|
| **ROI Calculator** | `/tools/roi-calculator` | 投資回報計算器 | 6 篇（P0 核心） |
| **Google Review Guide** | `/blog/google-review-management-complete-guide` | 評論管理教程 | 8 篇（策略+回覆類） |
| **Local SEO Hub** | `/blog/local-seo-google-reviews-ranking-factor` | SEO 排名因素分析 | 10 篇（SEO/GEO 類） |
| **Industry Solutions** | `/pricing` | 方案比較+註冊 | 8 篇（行業垂直類） |

---

## 3. AI 生成內容的正確打法

**核心觀點：** 不是因為懶才用 AI，是因為不用 AI 暴力輸出，你玩不起現在 Google 的語意覆蓋打法。

**操作邏輯：**
- 用 AI 把沒人要的長尾冷門量全部精準導向你最暴利的頁面
- 用 AI 把一個主題上下左右的關聯知識全部覆蓋，形成完整的「主題地圖」
- Google 才會覺得你是這個領域的專家

**Reputation Monitor 的語意覆蓋策略：**
- 核心主題：Google Review Management
- 延伸軸 1：行業垂直（餐廳、飯店、診所、牙科、美容院、汽修、房地產、零售）
- 延伸軸 2：SEO/GEO 技術（Local SEO、Schema Markup、AI Overview、Voice Search）
- 延伸軸 3：功能策略（QR Code、SMS 跟進、情緒分析、Review Velocity）

---

## 4. Gemini / SynthID 與 Google 排名

**核心觀點：** 想做 Google SEO 排名，強烈建議不要直接用 Gemini 產出純文章。

**實戰結論：**

| 用途 | 工具建議 |
|------|---------|
| 主攻 Google 流量 | Gemini 負責分析，產文交給 DeepSeek / Claude / Kimi — 避開 SynthID |
| 圖片生成 | Flux Schnell（無 SynthID）— 已在使用 |
| 成本控制 | DeepSeek V3 是目前最划算的 API |

**Reputation Monitor 目前做法（已正確）：**
- 文章生成：DeepSeek V3 (`deepseek-chat`) ✅
- 圖片生成：Replicate Flux Schnell ✅
- 反 AI 偵測層：60+ 禁用詞自動清理 ✅

---

## 5. 權重操控三招

### 5.1 跑意圖矩陣

直接讓 AI 把目標主題的所有問題/場景全寫出來。不管有沒有搜索量，靠語意堆量蓋。

**Reputation Monitor 意圖矩陣：**

```
[行業實體] × [搜尋意圖] × [功能修飾]

行業：restaurant, hotel, clinic, dental, salon, auto-repair, real-estate, retail
意圖：how-to, strategy, guide, comparison, checklist, case-study
功能：QR code, AI response, sentiment analysis, review velocity, schema markup
```

### 5.2 微上下文的權重挾持

不要隨便找字當錨文本。在文章內文中自然插入連結，把整篇文章的語意主題強制導向你真正想排名的核心頁面。

**實作方式：** 每篇文章末尾 CTA 連到對應的 Boss 頁面（見 `src/config/article-guide-map.ts`）

### 5.3 洗出實體權威

寫大量支撐文章不是為了靠它們自己排名，而是強制告訴 Google「這個網站在某個領域是權威」。當實體訊號量到一定程度，Google 就會讓你的商業大詞排名直接推進。

---

## 6. 語意策略一句話總結

> **AI 集群建立語意權威 → Boss 頁面吃掉核心流量 → 功能工具建立護城河**

1. AI 集群建立語意權威 — 30 篇 SEO/GEO 文章覆蓋主題地圖
2. Boss 頁面吃掉核心流量 — ROI Calculator + 核心 Guide 頁面
3. 功能工具建立護城河 — QR Code 工具、AI 評論生成器、ROI 計算器
4. 外圍內容負責覆蓋主題地圖 — 行業垂直 + 技術深潛文章
5. 核心頁面負責接流量 — 所有文章內部連結灌向 Boss 頁面
6. 工具則把內容升級成「功能」— 讓 Google 看到的是完整的主題系統

---

## 7. 對 Reputation Monitor 的行動建議

### 已完成 ✅

- [x] 30 篇 SEO/GEO 文章生成（4 優先層級，DeepSeek V3）
- [x] 反 AI 偵測層（60+ 禁用詞清理）
- [x] 4 作者人設系統（Sarah Kim, David Chen, Rachel Torres, Marcus Liu）
- [x] 意圖路由（guide/comparison/industry/strategy/technical）
- [x] Flux Schnell 圖片生成（spec 完成，待執行）
- [x] ROI Calculator Boss 頁面（已有互動功能）

### 待執行 🔲

- [ ] **建立 article-guide-map.ts** — 30 篇文章對映到 4 個 Boss 頁面
- [ ] **建立 cross-domain-cta.ts** — 控制哪些文章有外部 CTA（避免 PBN 偵測）
- [ ] **Entity Stacking** — 在 Product Hunt、G2 等平台建立品牌頁面
- [ ] **GSC 意圖矩陣分析** — 部署後收集 GSC 數據，跑語意空缺分析
- [ ] **Bing SEO 佈局** — 考慮把部分內容針對 Bing 優化
- [ ] **圖片生成執行** — 跑 `scripts/generate-article-images.ts` 為每篇文章生成特色圖

---

*本文件為 Reputation Monitor 的 SEO 策略參考框架，所有操作應遵循此文件的指導原則。*
*原始理論來源：DarkSEOKing (IG/Threads)，經過適配轉化為具體的技術實作。*
