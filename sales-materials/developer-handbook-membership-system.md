# 開發者手冊：AI 會員預約行銷系統

## Context

ReplyWise AI 已是成熟的 AI 評論管理 SaaS（481 測試通過、Vercel 部署、Stripe 付費、多租戶）。本次擴展是在現有基礎上加入「AI 數位員工」功能模組——會員系統、預約候補、核銷扣點、行銷自動化——打造一站式解決方案，主打加拿大美業/餐飲/修車/牙醫/保險等一人或小型工作坊。

核心理念：客戶全程只需要 SMS + Web Link，不需要下載 App。

---

## 系統完整生命週期

```
商家設定服務方案 + 點數/充值方案
         ↓
SMS 發送會員連結給客人
         ↓
客人點連結 → Web PWA 會員中心
         ↓
瀏覽方案 → 選擇時段 → 預約
         ↓
無空位？→ 加入候補 → 有位時 SMS 通知
         ↓
預約前 24hr → SMS 提醒 + 注意事項
         ↓
到店 → 客人出示驗證碼 → 技師輸入核銷
         ↓
系統扣除點數/堂數 → 記錄技師服務
         ↓
離店偵測（核銷後 1-2hr）→ SMS 評論邀請
         ↓
客人評價 Google Review → 送積分獎勵
         ↓
系統記錄：技師評分、客人活躍度、剩餘堂數
         ↓
自動化：沉睡提醒、回訪追蹤、到期通知
         ↓
商家 Dashboard：全局數據一目了然
```

---

## 一、新增資料庫表（12 張）

### 1.1 會員系統

```sql
-- 客戶會員（每個 store 獨立會員體系）
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  language TEXT DEFAULT 'en', -- en/zh/fr
  member_token TEXT UNIQUE NOT NULL, -- SMS 連結 token
  token_expires_at TIMESTAMPTZ, -- token 有效期（30 天滾動）
  points_balance INT DEFAULT 0, -- 積分餘額
  total_visits INT DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active', -- active/inactive/churned
  tags TEXT[], -- VIP, 新客, 沉睡等
  notes TEXT, -- 商家備註
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, phone)
);

-- 點數/充值方案
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL, -- 例：「美甲 10 堂」「基礎保養 5 次」
  description TEXT,
  package_type TEXT NOT NULL, -- 'sessions' (堂數) / 'credits' (點數) / 'amount' (儲值金)
  total_units INT NOT NULL, -- 總堂數/點數/金額
  price NUMERIC(10,2) NOT NULL, -- 售價
  valid_days INT DEFAULT 365, -- 有效天數
  services TEXT[], -- 適用的服務 ID 列表
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 會員持有的方案（購買記錄）
CREATE TABLE member_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  package_id UUID REFERENCES credit_packages(id),
  package_name TEXT NOT NULL, -- 冗餘存儲，防方案改名
  package_type TEXT NOT NULL,
  total_units INT NOT NULL,
  used_units INT DEFAULT 0,
  remaining_units INT GENERATED ALWAYS AS (total_units - used_units) STORED,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active', -- active/expired/exhausted
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 服務 + 技師

```sql
-- 服務項目
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
  price NUMERIC(10,2),
  credits_required INT DEFAULT 1, -- 扣幾堂/幾點
  category TEXT, -- 美甲/美髮/Spa/保養/檢查...
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 技師/服務人員
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'technician', -- technician/manager
  services TEXT[], -- 可服務的 service IDs
  working_hours JSONB, -- {"mon": ["09:00-12:00","14:00-18:00"], ...}
  commission_rate NUMERIC(4,2), -- 抽成比例 0.00-1.00
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 預約 + 候補

```sql
-- 預約
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID NOT NULL REFERENCES members(id),
  service_id UUID NOT NULL REFERENCES services(id),
  staff_id UUID REFERENCES staff(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'confirmed', -- confirmed/completed/cancelled/no_show
  verification_code TEXT NOT NULL, -- 4-6 位核銷碼
  verified_at TIMESTAMPTZ, -- 核銷時間
  verified_by UUID REFERENCES staff(id), -- 哪個技師核銷
  credits_deducted INT DEFAULT 0,
  member_credit_id UUID REFERENCES member_credits(id), -- 扣哪個方案
  reminder_sent_at TIMESTAMPTZ,
  review_invited_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 候補佇列
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  member_id UUID NOT NULL REFERENCES members(id),
  service_id UUID NOT NULL REFERENCES services(id),
  preferred_staff_id UUID REFERENCES staff(id),
  preferred_date DATE,
  preferred_time_range TEXT, -- "morning"/"afternoon"/"evening" 或 "14:00-16:00"
  position INT NOT NULL,
  status TEXT DEFAULT 'waiting', -- waiting/notified/booked/expired/cancelled
  notified_at TIMESTAMPTZ,
  response_deadline TIMESTAMPTZ, -- 通知後 15 分鐘內回覆
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.4 核銷 + 積分

```sql
-- 服務成果照片（技師上傳，客人可看）
CREATE TABLE service_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  booking_id UUID REFERENCES bookings(id), -- 關聯到哪次預約
  member_id UUID REFERENCES members(id),   -- 哪位客人
  staff_id UUID NOT NULL REFERENCES staff(id), -- 哪位技師
  service_id UUID REFERENCES services(id),
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  thumbnail_url TEXT, -- 壓縮縮圖
  caption TEXT, -- 說明文字
  is_portfolio BOOLEAN DEFAULT true, -- 是否展示在技師作品集
  is_visible_to_member BOOLEAN DEFAULT true, -- 客人是否可見
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 技師排班
CREATE TABLE staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  date DATE NOT NULL, -- 具體日期
  start_time TIME NOT NULL, -- 開始時間
  end_time TIME NOT NULL,   -- 結束時間
  is_day_off BOOLEAN DEFAULT false, -- 當天休假
  note TEXT, -- 備註（請假原因等）
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, date, start_time)
);

-- 積分交易記錄
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  amount INT NOT NULL, -- 正=獲得 負=扣除
  type TEXT NOT NULL, -- 'earn_review'/'earn_referral'/'earn_purchase'/'redeem'/'expire'/'admin_adjust'
  description TEXT,
  reference_id UUID, -- 關聯的 booking_id 或 review_id
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 核銷記錄（詳細審計）
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  member_id UUID NOT NULL REFERENCES members(id),
  staff_id UUID NOT NULL REFERENCES staff(id),
  verification_code TEXT NOT NULL,
  credits_deducted INT NOT NULL,
  member_credit_id UUID REFERENCES member_credits(id),
  service_name TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.5 行銷自動化

```sql
-- 自動化規則（可擴展）
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  rule_type TEXT NOT NULL,
  -- 'pre_visit_reminder' : 預約前 24hr 提醒
  -- 'post_visit_review'  : 離店後評論邀請
  -- 'post_visit_care'    : 離店後關懷
  -- 'dormant_alert'      : 沉睡客戶喚醒 (30/60/90天)
  -- 'credit_expiry'      : 方案到期提醒
  -- 'birthday'           : 生日祝福
  -- 'follow_up'          : 定期追蹤（保險/牙醫/修車）
  config JSONB NOT NULL DEFAULT '{}',
  -- pre_visit: { hours_before: 24, include_notes: true }
  -- dormant:  { days: [30, 60, 90], offer_text: "..." }
  -- follow_up: { interval_days: 90, message: "..." }
  sms_template TEXT, -- SMS 內容模板，支持 {{name}} {{service}} {{date}} 變數
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 二、新增 API Routes

### 2.1 會員 API

| Route | Method | 說明 | Auth |
|-------|--------|------|------|
| `/api/admin/members` | GET | 列出所有會員（分頁、搜尋、篩選） | tenant |
| `/api/admin/members` | POST | 新增會員（手動或批量匯入） | tenant |
| `/api/admin/members/[id]` | GET/PATCH | 查看/編輯會員 | tenant |
| `/api/admin/members/[id]/credits` | GET | 查看會員所有方案+餘額 | tenant |
| `/api/admin/members/[id]/history` | GET | 查看消費/預約歷史 | tenant |
| `/api/admin/members/send-link` | POST | SMS 發送會員連結 | tenant |
| `/api/admin/members/import` | POST | 批量匯入會員（CSV） | tenant |

### 2.2 預約 + 候補 + 排班 API

| Route | Method | 說明 | Auth |
|-------|--------|------|------|
| `/api/admin/bookings` | GET | 列出預約（日曆/列表） | tenant |
| `/api/admin/bookings` | POST | 商家建立預約 | tenant |
| `/api/admin/bookings/[id]` | PATCH | 修改/取消預約 | tenant |
| `/api/admin/bookings/[id]/photos` | POST | 上傳服務成果照 | tenant |
| `/api/admin/waitlist` | GET | 候補列表 | tenant |
| `/api/admin/services` | GET/POST | 服務項目 CRUD | tenant |
| `/api/admin/staff` | GET/POST | 技師 CRUD | tenant |
| `/api/admin/staff/[id]/stats` | GET | 技師績效（評分、核銷、佣金） | tenant |
| `/api/admin/staff/[id]/schedule` | GET/POST | 技師排班（查詢+設定） | tenant |
| `/api/admin/staff/[id]/portfolio` | GET | 技師作品集 | tenant |
| `/api/admin/photos/upload` | POST | 上傳照片到 Supabase Storage | tenant |

### 2.3 核銷 API

| Route | Method | 說明 | Auth |
|-------|--------|------|------|
| `/api/admin/verify` | POST | 技師輸入驗證碼核銷 | tenant |
| `/api/admin/credits` | GET | 方案+點數總覽 | tenant |
| `/api/admin/credit-packages` | GET/POST | 方案 CRUD | tenant |
| `/api/admin/credits/purchase` | POST | 幫會員購買方案 | tenant |

### 2.4 公開 API（客人端，token 認證）

| Route | Method | 說明 | Auth |
|-------|--------|------|------|
| `/api/member/[token]` | GET | 會員中心資料（方案、點數、預約） | token |
| `/api/member/[token]/book` | POST | 客人預約 | token |
| `/api/member/[token]/book` | GET | 可用時段 | token |
| `/api/member/[token]/waitlist` | POST | 加入候補 | token |
| `/api/member/[token]/waitlist` | DELETE | 取消候補 | token |
| `/api/member/[token]/history` | GET | 消費歷史 | token |
| `/api/member/[token]/photos` | GET | 我的歷次成果照 | token |
| `/api/member/[token]/staff/[id]/portfolio` | GET | 技師作品集（公開） | token |

### 2.5 Webhook + Cron

| Route | Method | 說明 |
|-------|--------|------|
| `/api/webhooks/sms` | POST | Twilio SMS inbound webhook |
| `/api/cron/booking-reminders` | GET | 預約前 24hr 提醒 |
| `/api/cron/post-visit` | GET | 離店後評論邀請+關懷 |
| `/api/cron/waitlist-notify` | GET | 候補空位通知 |
| `/api/cron/dormant-check` | GET | 沉睡客戶檢查+喚醒 |
| `/api/cron/credit-expiry` | GET | 方案到期提醒 |
| `/api/cron/follow-up` | GET | 定期追蹤提醒 |

---

## 三、客人端 Web PWA

### 路由結構

```
/m/[token]                   → 會員中心首頁
/m/[token]/book              → 預約（選服務→選技師→看作品集→選時段→確認）
/m/[token]/book/[id]         → 預約詳情（含驗證碼）
/m/[token]/waitlist          → 我的候補
/m/[token]/credits           → 我的方案+剩餘堂數
/m/[token]/history           → 消費歷史
/m/[token]/photos            → 我的歷次成果照片
/m/[token]/points            → 積分明細
/m/[token]/chat              → AI 客服
/m/[token]/review/[bid]      → 評論頁（完成後送積分）
/m/[token]/staff/[id]        → 技師作品集（公開）
```

### 會員中心首頁 UI

```
┌─────────────────────────────────┐
│  [店名 Logo]                     │
│  Hi, Mary! 👋                    │
├─────────────────────────────────┤
│                                 │
│  📅 下次預約                     │
│  ┌───────────────────────────┐  │
│  │ 4/10 (四) 15:00           │  │
│  │ 美甲凝膠 — Lisa            │  │
│  │ 驗證碼：8 3 7 2            │  │
│  │ [查看詳情]  [改時間]       │  │
│  └───────────────────────────┘  │
│                                 │
│  🎫 我的方案                     │
│  ┌───────────────────────────┐  │
│  │ 美甲 10 堂卡               │  │
│  │ ████████░░ 剩餘 7 堂       │  │
│  │ 到期：2026-12-31           │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 儲值金                     │  │
│  │ 餘額：$350                 │  │
│  └───────────────────────────┘  │
│                                 │
│  ⭐ 積分：350 pts               │
│                                 │
│  📸 上次成果                     │
│  ┌───────────────────────────┐  │
│  │ [照片1] [照片2] [照片3]    │  │
│  │ 4/1 美甲凝膠 by Lisa      │  │
│  │ [查看全部歷次成果]         │  │
│  └───────────────────────────┘  │
│                                 │
│  [📅 預約]  [💬 客服]  [📋 歷史] │
└─────────────────────────────────┘
```

### Token 認證機制

```
SMS: "Hi Mary, 查看您的會員資訊: https://app.co/m/a8x3k2f9"

token = crypto.randomBytes(8).toString('hex')  // 16 字元
存在 members.member_token
有效期 30 天，每次訪問自動續期
不需要帳號密碼

安全性：
- Token 不包含任何可猜測的資訊
- HTTPS 傳輸
- 30 天自動過期
- 可由商家隨時重置
```

---

## 四、商家端 Dashboard 新頁面

### 側邊欄新增項目

```
原有：
├── Dashboard
├── Reviews（評論管理）
├── QR Codes
├── ...

新增（插入「Core Flow」區塊下方）：
├── 👥 Members（會員管理）
├── 📅 Bookings（預約日曆）
├── 🎫 Packages（方案管理）
├── 👨‍💼 Staff（技師管理）
├── ✅ Verify（核銷）
├── 📊 Performance（績效分析）
```

### 關鍵頁面

**會員管理 `/admin/members`**
- 列表：姓名、電話、方案餘額、積分、上次到訪、狀態
- 篩選：活躍/沉睡/流失、有餘額/無餘額
- 操作：發送 SMS 連結、新增方案、調整積分
- 匯入：CSV 批量匯入

**預約日曆 `/admin/bookings`**
- 週/日視圖（按技師分列）
- 拖拉調整時間
- 候補佇列側邊欄
- 今日預約快速核銷按鈕

**核銷頁面 `/admin/verify`**
- 大字型輸入框（適合平板/手機）
- 輸入 4 位碼 → 顯示客人+服務+方案
- 一鍵核銷 → 扣點/扣堂
- 核銷成功動畫 + 剩餘堂數

**績效分析 `/admin/performance`**
- 技師排名（好評率、核銷數、佣金）
- 客人活躍度熱力圖
- 方案消耗趨勢
- 沉睡客戶清單 + 一鍵喚醒
- 到期方案預警

---

## 五、SMS 自動化流程

### 5.1 預約前提醒

```
觸發：預約前 24 小時
Cron：/api/cron/booking-reminders（每小時跑一次）

SMS 內容：
"Hi {{name}}，提醒您明天 {{time}} 在 {{store}} 有 {{service}} 預約。
注意事項：{{pre_visit_notes}}
查看詳情：{{link}}
回覆 C 取消預約"

邏輯：
1. 查詢 bookings WHERE start_time BETWEEN now+23h AND now+25h
   AND reminder_sent_at IS NULL AND status='confirmed'
2. 發送 SMS + 更新 reminder_sent_at
3. 如果客人回覆 "C" → webhook 取消預約 → 觸發候補通知
```

### 5.2 離店後評論邀請

```
觸發：核銷後 2 小時
Cron：/api/cron/post-visit（每小時跑一次）

SMS 內容：
"Hi {{name}}，感謝今天來 {{store}}！
您的體驗如何？留下評論可獲 {{points}} 積分！
{{review_link}}
"

邏輯：
1. 查詢 bookings WHERE verified_at BETWEEN now-3h AND now-1h
   AND review_invited_at IS NULL AND status='completed'
2. 生成評論連結（複用現有 QR 評論流程）
3. 發送 SMS + 更新 review_invited_at
4. 客人完成評論 → 觸發 points_transactions +積分
```

### 5.3 離店後關懷

```
觸發：核銷後 24-48 小時
Cron：複用 /api/cron/post-visit

SMS 內容（AI 生成，根據服務類型）：
美甲："Hi {{name}}，您的新指甲還習慣嗎？前幾天避免接觸清潔劑喔！"
牙醫："Hi {{name}}，術後如有不適請隨時聯繫我們。記得 {{care_notes}}"
修車："Hi {{name}}，您的車保養完成後如有異音請回廠檢查。"
保險："Hi {{name}}，您的保單已更新，下次審核日 {{next_date}}。"
```

### 5.4 沉睡客戶喚醒

```
觸發：30/60/90 天沒到訪
Cron：/api/cron/dormant-check（每天跑一次）

30 天：
"Hi {{name}}，好久不見！您的 {{package}} 還剩 {{remaining}} 堂。
預約：{{link}}"

60 天：
"Hi {{name}}，我們想念您！送您 {{points}} 積分，歡迎回來。
預約：{{link}}"

90 天：
"Hi {{name}}，您的 {{package}} 將在 {{expiry}} 到期，
還有 {{remaining}} 堂未使用。把握時間預約：{{link}}"
```

### 5.5 方案到期提醒

```
觸發：方案到期前 30/7/1 天
Cron：/api/cron/credit-expiry（每天跑一次）

SMS：
"Hi {{name}}，您的「{{package}}」將在 {{days}} 天後到期，
還剩 {{remaining}} 堂。立即預約：{{link}}"
```

### 5.6 定期追蹤（保險/牙醫/修車）

```
觸發：上次到訪後 N 天（商家自訂）
Cron：/api/cron/follow-up（每天跑一次）

修車（90 天）：
"Hi {{name}}，距離上次保養已 90 天，建議進行定期檢查。預約：{{link}}"

牙醫（180 天）：
"Hi {{name}}，距離上次洗牙已 6 個月，建議預約檢查。{{link}}"

保險（365 天）：
"Hi {{name}}，您的保單即將到期，聯繫 {{agent}} 續保。"
```

---

## 六、核心技術實作要點

### 6.1 複用現有基礎設施

| 需求 | 現有模組 | 改動 |
|------|---------|------|
| SMS 發送 | `lib/notifications/channels/whatsapp.ts` | 複製改為 SMS channel |
| AI 回覆 | `lib/generation-prompts.ts` + OpenAI | 新增預約/客服 prompt |
| Token 認證 | `review_approve_tokens` 模式 | 複用 pattern 給 member_token |
| Cron 架構 | `/api/cron/*` + CRON_SECRET | 新增 5 個 cron routes |
| 通知日誌 | `notification_log` 表 | 直接複用 |
| 多租戶 | `getUserTenantContext()` | 所有新 API 都用 |
| Stripe | `plan-limits.ts` | 新增 booking 功能 gate |
| 評論邀請 | `lib/invites.ts` | 複用 SMS 發送 + tracking pattern |

### 6.2 排班 + 可用時段計算

```typescript
// 計算某技師某天的可預約時段
async function getAvailableSlots(staffId: string, date: string, serviceDuration: number) {
  // 1. 取得排班
  const schedule = await supabase
    .from('staff_schedules')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', date)
    .single();

  // 如果休假 → 返回空
  if (!schedule || schedule.is_day_off) return [];

  // 2. 如果沒有排班記錄 → 用預設 working_hours（staff 表的 JSONB）
  const dayOfWeek = getDayOfWeek(date); // 'mon','tue'...
  const staff = await supabase.from('staff').select('working_hours').eq('id', staffId).single();
  const hours = schedule
    ? [{ start: schedule.start_time, end: schedule.end_time }]
    : staff.working_hours[dayOfWeek] || [];

  // 3. 取得已有預約
  const existingBookings = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('staff_id', staffId)
    .gte('start_time', `${date}T00:00:00`)
    .lte('start_time', `${date}T23:59:59`)
    .in('status', ['confirmed']);

  // 4. 從工作時段中減去已預約 → 得到可用時段
  // 以 serviceDuration 為單位切割
  return calculateAvailableSlots(hours, existingBookings, serviceDuration);
}
```

### 6.3 照片上傳 + 作品集

```typescript
// 上傳照片到 Supabase Storage
// Bucket: 'service-photos'
// Path: {tenant_id}/{store_id}/{staff_id}/{timestamp}.jpg

POST /api/admin/photos/upload
- 接收 FormData（多張照片）
- 壓縮/resize（max 1200px width）
- 生成縮圖（300px）
- 上傳到 Supabase Storage
- 寫入 service_photos 表
- 關聯 booking_id, member_id, staff_id

客人端預約流程中：
1. 選服務 → 2. 選技師（顯示作品集縮圖+評分）→ 3. 選時段 → 4. 確認

技師作品集頁面 /m/[token]/staff/[id]：
- 瀑布流照片牆
- 按服務類別篩選
- 顯示客人評價
- 「預約此技師」CTA 按鈕
```

### 6.4 驗證碼機制

```typescript
// 生成 4 位數驗證碼
const code = Math.floor(1000 + Math.random() * 9000).toString();

// 核銷流程
POST /api/admin/verify
body: { code: "8372" }

1. 查詢 bookings WHERE verification_code = code
   AND status = 'confirmed'
   AND start_time::date = today
2. 驗證成功 → 扣除堂數/點數
3. 更新 booking: status='completed', verified_at=now()
4. 新增 verifications 記錄
5. 新增 points_transactions（如果有積分活動）
6. 更新 member: total_visits++, last_visit_at=now()
7. 排程 2hr 後的評論邀請 SMS
```

### 6.3 候補通知邏輯

```typescript
// 取消預約時觸發
async function onBookingCancelled(booking) {
  // 1. 找候補名單
  const waiters = await supabase
    .from('waitlist')
    .select('*')
    .eq('store_id', booking.store_id)
    .eq('service_id', booking.service_id)
    .eq('status', 'waiting')
    .order('position', { ascending: true })
    .limit(1);

  if (waiters.length === 0) return;

  const waiter = waiters[0];

  // 2. SMS 通知
  await sendSMS(waiter.phone,
    `有空位了！${booking.start_time} 可預約 ${service.name}。
     15 分鐘內確認：${link}
     回覆 YES 確認，或忽略此訊息。`
  );

  // 3. 更新候補狀態
  await supabase.from('waitlist').update({
    status: 'notified',
    notified_at: new Date(),
    response_deadline: new Date(Date.now() + 15 * 60 * 1000)
  }).eq('id', waiter.id);

  // 4. 15 分鐘後檢查（cron 處理）
  // 如果沒回應 → 通知下一位
}
```

### 6.4 AI 客服 prompt

```typescript
const systemPrompt = `你是 ${storeName} 的 AI 助理。
語言：自動偵測客戶語言回覆。
你可以幫客戶：
1. 查詢可預約時段
2. 預約服務
3. 查詢方案餘額
4. 回答店家相關問題

店家資訊：
- 營業時間：${workingHours}
- 服務項目：${services}
- 注意事項：${notes}

規則：
- 回覆要簡潔（SMS 限制）
- 如果無法處理，告知客戶會轉給真人
- 不要編造資訊`;
```

---

## 七、開發順序（3 週）

### Week 1：會員 + 預約核心
```
Day 1: DB migration（12 張表）+ RLS 政策
Day 2: 會員 API（CRUD + SMS 發連結）
Day 3: 服務 + 技師 API + Dashboard 頁面
Day 4: 預約 API + 客人端預約流程（/m/[token]/book）
Day 5: 核銷 API + 驗證碼頁面 + 扣點邏輯 + 排班表 + 可用時段計算
```

### Week 2：候補 + 自動化
```
Day 1: 候補佇列 API + 通知邏輯
Day 2: SMS webhook（inbound）+ AI 客服
Day 3: 照片上傳（Supabase Storage）+ 作品集頁面
Day 4: Cron: 預約提醒 + 離店評論邀請 + 沉睡喚醒 + 方案到期
Day 5: 離店關懷（AI 生成）+ 積分系統 + 定期追蹤
```

### Week 3：Dashboard + 行銷
```
Day 1: 會員管理頁面（列表+篩選+匯入）
Day 2: 預約日曆頁面（週/日視圖）
Day 3: 績效分析頁面（技師+客人+方案）
Day 4: 方案管理 + 積分設定頁面
Day 5: Landing Page（加拿大 SEO）+ 新定價方案 + 測試
```

---

## 八、關鍵檔案路徑

### 現有檔案（需修改）
```
src/app/admin/AdminSidebar.tsx          → 新增 sidebar 項目
src/lib/notifications/channels/         → 新增 sms.ts channel
src/lib/plan-limits.ts                  → 新增 booking 功能 gate
src/middleware.ts                       → 新增 /m/* 公開路由
supabase/migrations/                    → 新增 migration 檔案
```

### 新增檔案
```
-- API Routes --
src/app/api/admin/members/route.ts
src/app/api/admin/members/[id]/route.ts
src/app/api/admin/members/[id]/credits/route.ts
src/app/api/admin/members/send-link/route.ts
src/app/api/admin/bookings/route.ts
src/app/api/admin/bookings/[id]/route.ts
src/app/api/admin/services/route.ts
src/app/api/admin/staff/route.ts
src/app/api/admin/staff/[id]/stats/route.ts
src/app/api/admin/verify/route.ts
src/app/api/admin/credit-packages/route.ts
src/app/api/admin/credits/purchase/route.ts
src/app/api/admin/waitlist/route.ts
src/app/api/admin/automation-rules/route.ts
src/app/api/member/[token]/route.ts
src/app/api/member/[token]/book/route.ts
src/app/api/member/[token]/waitlist/route.ts
src/app/api/member/[token]/history/route.ts
src/app/api/webhooks/sms/route.ts
src/app/api/cron/booking-reminders/route.ts
src/app/api/cron/post-visit/route.ts
src/app/api/cron/waitlist-notify/route.ts
src/app/api/cron/dormant-check/route.ts
src/app/api/cron/credit-expiry/route.ts
src/app/api/cron/follow-up/route.ts

-- 客人端 PWA --
src/app/m/[token]/page.tsx              → 會員中心首頁
src/app/m/[token]/layout.tsx            → 會員 layout
src/app/m/[token]/book/page.tsx         → 預約流程
src/app/m/[token]/book/[id]/page.tsx    → 預約詳情+驗證碼
src/app/m/[token]/credits/page.tsx      → 方案餘額
src/app/m/[token]/history/page.tsx      → 消費歷史
src/app/m/[token]/points/page.tsx       → 積分明細
src/app/m/[token]/chat/page.tsx         → AI 客服
src/app/m/[token]/review/[bid]/page.tsx → 評論頁

-- 商家端 Dashboard --
src/app/admin/members/page.tsx
src/app/admin/members/actions.ts
src/app/admin/bookings/page.tsx
src/app/admin/bookings/actions.ts
src/app/admin/bookings/CalendarView.tsx
src/app/admin/packages/page.tsx
src/app/admin/packages/actions.ts
src/app/admin/staff-mgmt/page.tsx       (避免跟現有 staff role 混淆)
src/app/admin/staff-mgmt/actions.ts
src/app/admin/verify/page.tsx
src/app/admin/verify/VerifyForm.tsx
src/app/admin/performance/page.tsx
src/app/admin/performance/StaffStats.tsx
src/app/admin/performance/CustomerActivity.tsx
src/app/admin/automation/page.tsx

-- Lib --
src/lib/sms.ts                          → Twilio SMS 收發
src/lib/booking-utils.ts                → 時段計算、衝突檢查
src/lib/verification.ts                 → 驗證碼生成+核銷
src/lib/member-token.ts                 → Token 生成+驗證
src/lib/automation-engine.ts            → 自動化規則引擎
src/lib/schedule-utils.ts               → 排班+可用時段計算
src/lib/photo-upload.ts                 → 照片壓縮+上傳 Supabase Storage

-- 新增 API Routes --
src/app/api/admin/staff/[id]/schedule/route.ts
src/app/api/admin/staff/[id]/portfolio/route.ts
src/app/api/admin/bookings/[id]/photos/route.ts
src/app/api/admin/photos/upload/route.ts
src/app/api/member/[token]/photos/route.ts
src/app/api/member/[token]/staff/[id]/portfolio/route.ts

-- 新增客人端頁面 --
src/app/m/[token]/photos/page.tsx       → 我的歷次成果照
src/app/m/[token]/staff/[id]/page.tsx   → 技師作品集

-- 新增商家端頁面 --
src/app/admin/staff-mgmt/schedule/page.tsx → 排班管理
src/app/admin/staff-mgmt/ScheduleGrid.tsx  → 排班表 UI
```

---

## 九、驗證計劃

### 單元測試
```
1. 驗證碼生成 → 4 位數、不重複
2. 核銷邏輯 → 正確扣堂、不能重複核銷、過期方案不能扣
3. 候補排序 → position 正確、通知順序對
4. 積分計算 → 評論送分、扣分、過期
5. Token 認證 → 有效/過期/不存在
6. 時段衝突 → 同技師不能重疊預約
```

### E2E 測試
```
1. 完整流程：建會員→發 SMS→預約→核銷→評論→送積分
2. 候補流程：預約滿→候補→取消→通知→確認
3. 沉睡喚醒：模擬 30 天未訪→檢查 SMS 觸發
4. 方案到期：模擬到期前提醒
```

### 手動測試
```
1. 用兩支手機測試 SMS 收發
2. 客人端 PWA 在 iPhone + Android 測試
3. 核銷頁面在平板上測試
4. 預約日曆拖拉操作
```
