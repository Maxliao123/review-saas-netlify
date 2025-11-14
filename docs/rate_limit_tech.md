# 節流機制與成本控管 — 技術文件（中文版）

本文件說明本專案「AI 產生 Google 評論草稿」功能的完整節流邏輯、資料流程、環境變數設定與成本預估，  
適用於工程師、維運人員與未來開發者。

---

# 1. 整體節流機制概念

系統共有三層保護：

### **（1）每個 IP 的短時間節流（主要防濫用）**
- 使用 Netlify Blobs 作為持久化儲存  
- 限制「同一個 IP」在一段時間內可以生成多少次評論  
- 目前設定如下：

PER_IP_MAX = 30 # 同一 IP 15 分鐘最多 30 次請求
PER_IP_WINDOW_S = 900 # 時間窗 900 秒（15 分鐘）

markdown
複製程式碼

### **（2）全站每日使用上限（成本安全線）**

DAILY_MAX_CALLS = 1000 # 全網站一天最多 1000 次請求

yaml
複製程式碼

此限制用於避免成本暴衝，是全系統「所有店家」共享的安全線。

### **（3）資料庫相似度比對（去重）**

每次產生評論前會檢查資料庫，避免產生與以往過度相似的評論。

---

# 2. Environment Variables（環境變數）

在 Netlify → Site Settings → Build & Deploy → Environment 中設定。

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| PER_IP_MAX | 單一 IP 在時間窗內最多請求數 | `30` |
| PER_IP_WINDOW_S | 時間窗（秒） | `900` |
| DAILY_MAX_CALLS | 全站每日總上限 | `1000` |
| REVIEW_WEBHOOK_URL | 選填：用於通知等 | 空 |

`generate.js` 內使用方式：

```js
const DAILY_MAX_CALLS  = parseInt(process.env.DAILY_MAX_CALLS || "1000", 10);
const PER_IP_MAX       = parseInt(process.env.PER_IP_MAX || "30", 10);
const PER_IP_WINDOW_S  = parseInt(process.env.PER_IP_WINDOW_S || "900", 10);
3. 請求流程（技術邏輯）
Step 1：解析請求
取得店家名稱、選項、評論需求等

使用 getIP(event) 取得客戶端 IP

Step 2：每 IP 節流（Netlify Blobs）
connectLambda(event)

store = getStore("rate_limiting_ips")

key = ip_123_45_6_7（IP 轉純字元）

從 Blobs 讀取此 IP 的 timestamps

篩選出還在時間窗內的紀錄

若數量 >= PER_IP_MAX →
回應 HTTP 429（過度頻繁）

否則：新增 timestamp 並寫回 Blobs（TTL = 時間窗）

Step 3：全站每日上限（可選，但建議保留）
計算今天的 total call 次數，若超過 DAILY_MAX_CALLS →
直接回傳 HTTP 429（今日額度已用完）。

此限制為「所有 IP、所有店家共享」。

Step 4：資料庫去重檢查
使用 similarity()（PostgreSQL extension）比對是否過度相似：

sql
複製程式碼
SELECT 1 FROM generated_reviews
WHERE store_id = $1 
AND similarity(review_text, $2) >= $3
LIMIT 1;
若太相似，可視需求重新生成。

Step 5：呼叫 OpenAI 生成草稿
串接使用者勾選的標籤

建立 prompt

呼叫 OpenAI API 回傳完整評論內容

Step 6：寫入資料庫（持久化）
保存此筆評論，用於未來去重與統計。

Step 7：回傳給前端
回傳 JSON：

json
複製程式碼
{
  "review": "生成的評論內容...",
  "store": "店家名稱"
}
前端呈現在 textarea。

4. 節流類型範圍（Scope 對照）
節流類型	範圍	目的
每 IP 短時間限制	每個 IP 各自計算	避免單一店家 Wi-Fi 或惡意來源短時間內大量打 API
全站每日上限	所有店共同	成本上限預防（最高 1000 次/天）
去重檢查	依店家 store_id	實際內容品質保護

5. 成本估算（以單次 0.002 美金為示例）
假設：

bash
複製程式碼
每次生成 = $0.002 USD （示意）
情境一：輕量使用（測試期）
4 店 × 20 次/日 = 80 次/日

80 × 0.002 = $0.16/日

月成本 ≈ $5/月

情境二：正常穩定（中量）
4 店 × 50 次/日 = 200 次/日

200 × 0.002 = $0.40/日

月成本 ≈ $12/月

情境三：撞到每日上限（1000 次）
1000 × 0.002 = $2/日

月成本 ≈ $60/月

6. 可擴充方向（Future Enhancements）
依店家進行「店別節流」

建立節流 dashboard

寫入 audit log

為不同店家提供不同額度方案（分潤/付費）

