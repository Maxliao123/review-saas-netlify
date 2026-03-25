# ReplyWise AI — $5M ARR Strategic Roadmap (2026)

> Domain: replywiseai.com
> Target: $5M ARR within 12 months
> Created: 2026-03-25

---

## 市場定位

**目標客群：** 北美 + 亞太地區中小型服務業商家（餐廳、飯店、診所、美容院）
**核心價值：** 評論自動化 → 即時監控回覆 → Google Maps 營運洞察
**競爭壁壘：** AI 多語系生成 + LINE/WeChat 整合 + 亞洲市場差異化

---

## 收入模型設計（三層漏斗）

### Free Tier — 評論增量引擎（獲客）
- QR Code 掃碼 → AI 生成五星好評 → 一鍵發布
- 限制：50 次/月 AI 生成
- 目的：**零摩擦獲客**，讓商家先體驗價值

### Starter $49/mo — 評論監控與自動回覆（核心付費）
- 即時 Google 評論監控通知
- AI 自動草擬回覆（owner 一鍵確認）
- 負評預警 + 轉介私訊處理
- 每週評論摘要報告
- **這是主要營收層** — 解決商家最大痛點：漏回覆、負評處理

### Pro $149/mo — Google Maps 營運智能（高 ARPU）
- Google Business Profile 完整分析
- 路線導航人數、來電數、網站點擊追蹤
- 競爭對手評論監控（同區域）
- 月度 ROI 報告（評論增長 ↔ 營收關聯）
- 多店面統一管理
- White-label 品牌客製

### Enterprise $499/mo — 連鎖品牌（鯨魚客戶）
- 無限店面
- API 存取
- 專屬客戶經理
- 自定義整合

---

## ARR 數學模型

| 指標 | 數字 |
|------|------|
| 目標 ARR | $5,000,000 |
| 月收入目標 | $416,667 |
| Starter 客戶（$49/mo） | 4,000 |
| Pro 客戶（$149/mo） | 1,200 |
| Enterprise（$499/mo） | 100 |
| **混合 ARPU** | **~$83/mo** |
| **需要付費客戶** | **~4,200** |
| Free → Paid 轉換率 | 8-12% |
| **需要 Free 用戶** | **~42,000** |

---

## 四階段執行計劃

### Phase 1: Foundation（Month 1-2）✅ 進行中
**目標：** 產品 market-ready + 域名品牌建立

- [x] Domain: replywiseai.com → Vercel
- [x] Brand: Reputation Monitor → ReplyWise AI
- [ ] 更新 Stripe 定價為新 3 層結構
- [ ] Google Business API 整合（OAuth + 評論拉取）
- [ ] 即時評論通知系統（webhook / polling）
- [ ] AI 自動回覆草擬功能
- [ ] Landing page A/B test（英文 + 中文）
- [ ] Onboarding flow 優化（5 分鐘內完成設定）
- [ ] 基礎 SEO：10 篇核心關鍵字文章

**KPI:** 100 Free 註冊, 10 付費客戶

### Phase 2: Growth Engine（Month 3-5）
**目標：** PMF 驗證 + 自然增長飛輪啟動

- [ ] Google Maps 營運報告功能（Pro tier 核心功能）
  - 路線人數、來電數、網站點擊
  - 競爭對手追蹤
- [ ] Referral program：商家推薦商家，雙方免費 1 個月
- [ ] Integration marketplace：
  - Yelp 評論監控
  - TripAdvisor 整合
  - LINE Official Account 深度整合
- [ ] Content marketing 加速：
  - 50 篇 SEO 文章
  - YouTube 教學影片（中英雙語）
  - 「餐廳評論管理指南」電子書（lead magnet）
- [ ] Product Hunt launch
- [ ] 餐飲業展會 / 商會合作
- [ ] Affiliate program 啟動

**KPI:** 1,000 Free, 100 付費, MRR $8K

### Phase 3: Scale（Month 6-9）
**目標：** 加速付費轉換 + 擴大市場

- [ ] Paid acquisition:
  - Google Ads（「google review management」長尾詞）
  - Facebook/IG 精準投放（餐飲業主）
  - LinkedIn（診所/飯店決策者）
- [ ] Sales team（1-2 人）outbound 開發連鎖品牌
- [ ] Agency/Reseller program
  - 行銷公司可以白標轉售
  - 30% 分潤
- [ ] 多語系完整化：日本、韓國市場
- [ ] Mobile app（React Native）
- [ ] AI 功能升級：
  - 情感分析趨勢圖
  - 評論關鍵字雲
  - 競爭對手評論情感對比

**KPI:** 5,000 Free, 500 付費, MRR $40K

### Phase 4: Dominate（Month 10-12）
**目標：** 衝刺 $5M ARR run rate

- [ ] Enterprise sales pipeline
  - 連鎖餐飲（鼎泰豐、Earls、Cactus Club 等級）
  - 飯店集團
  - 醫療診所連鎖
- [ ] Strategic partnerships:
  - POS 系統整合（Square, Toast, Clover）
  - CRM 整合（HubSpot, Salesforce）
  - Google Partner 認證
- [ ] 國際擴張：
  - 台灣市場全面啟動（LINE 生態系）
  - 日本市場（Google Maps 使用率極高）
  - 東南亞（泰國、越南餐飲爆發市場）
- [ ] Series A 準備（如果需要）

**KPI:** 42,000 Free, 4,200 付費, MRR $416K

---

## 關於你的問題分析

### vancouver-meal-logistic 共用 vs 獨立建置？

**建議：獨立建置，共用可移植模組**

原因：
1. **不同商業模型** — 物流 vs SaaS，用戶流程完全不同
2. **多租戶衝突** — 物流是 B2C 平台，ReplyWise 是 B2B SaaS，RLS 邏輯不同
3. **部署風險** — 共用 codebase 一個 bug 影響兩個產品
4. **估值考量** — 獨立產品更容易融資/併購

**但可以移植這些模組：**
- SEO 文章生成邏輯 → 直接複製 scripts/
- GA4 設定邏輯 → 環境變數抽換即可
- Supabase 架構模式 → 參考但獨立 schema
- Stripe 整合模式 → 已有，可優化

### 域名設定會衝突嗎？

**不會衝突。**
- replywiseai.com → Vercel (review-saas-netlify project) ✅ 已完成
- ourfoodfix.com → Vercel (vancouver-meal-logistics project)
- 兩個完全獨立的 Vercel 項目，獨立 DNS，零衝突

### 商業模型建議

你的直覺方向是對的，我的建議：

| 功能 | 定價 | 理由 |
|------|------|------|
| 評論增量（QR → AI 生成） | **Free** | 零摩擦獲客，讓商家先嚐到甜頭 |
| 評論監控 + AI 自動回覆 | **$49/mo** | 商家最大痛點，願意付費 |
| Google Maps 營運報告 | **$149/mo** | 高價值數據，低競爭，高毛利 |

關鍵洞察：**免費的評論生成是你的「毒品」** — 商家用了就離不開。然後監控回覆是「必需品」— 不回覆差評等於放棄客戶。最後營運報告是「決策工具」— 證明 ROI 讓商家不會退訂。

---

## 月度檢視節點

| 日期 | 檢視項目 |
|------|---------|
| 2026-04-25 | Phase 1 進度：Google Business API 整合完成？ |
| 2026-05-25 | Phase 1 完成：首批 10 個付費客戶？ |
| 2026-06-25 | Phase 2 啟動：Growth engine 指標追蹤 |
| 2026-08-25 | Phase 2 完成：100 付費客戶達標？ |
| 2026-09-25 | Phase 3 啟動：Paid acquisition ROI |
| 2026-12-25 | Phase 3 完成：500 付費客戶？ |
| 2027-03-25 | Phase 4 完成：$5M ARR run rate？ |
