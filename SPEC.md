# Reputation Monitor — 产品与工程规范 v1.0

> **状态**: 活文档（宪法级别）
> **最后更新**: 2026-03-08
> **负责人**: 创始团队
> **规则**: 所有开发决策必须符合本规范。偏离需先修订规范。

---

## 目录

1. [使命与第一性原理](#1-使命与第一性原理)
2. [北极星指标](#2-北极星指标)
3. [产品定义](#3-产品定义)
4. [技术架构](#4-技术架构)
5. [数据库架构](#5-数据库架构)
6. [功能规范](#6-功能规范)
7. [API 规范](#7-api-规范)
8. [套餐与定价模型](#8-套餐与定价模型)
9. [安全与隐私](#9-安全与隐私)
10. [开发路线图](#10-开发路线图)
11. [质量标准](#11-质量标准)
12. [代码规范与模式](#12-代码规范与模式)
13. [修订日志](#13-修订日志)

---

## 1. 使命与第一性原理

### 1.1 使命

**让每一家中小企业的线上口碑成为增长引擎，由 AI 全自动驱动。**

我们不做"评论监控工具"——我们构建的系统，以最快速度、最大规模，将客户满意度转化为数字社会证明。

### 1.2 第一性原理（马斯克框架）

这些原则不可动摇。每一个功能、架构决策和优先级都必须通过以下过滤器：

| # | 原则 | 含义 |
|---|------|------|
| **P1** | 如果一个步骤需要人工介入，那就是 bug，不是 feature | 一切自动化。手动审批只是 AI 信心不足时的默认方案。 |
| **P2** | 速度就是产品 | Google 奖励快速回复。每一秒延迟都影响排名。目标：评论 → 发布回复 < 5 分钟。 |
| **P3** | 店主的时间是神圣的 | 店主每天花在评论上的时间 < 2 分钟。看板展示 ROI，而非任务清单。 |
| **P4** | 数据积累形成护城河 | 每一条评论、情感分数、行业基准都构建竞争对手无法复制的数据集。 |
| **P5** | 10x，而非 10% | 我们不改进现有流程，我们消灭它。Podium 回复需要 15 次点击，我们需要 0 次。 |

### 1.3 店主真正想要什么

```
1. 更多客人进门         → Google 排名更高 → 需要更多好评 + 更快回复
2. 差评别伤害我         → 即时提醒 + 60 秒内 AI 自动回复
3. 别浪费我时间         → 全自动，我只看周报
4. 证明投资回报         → 展示评分趋势、评论数增长、客流量关联
```

### 1.4 竞争定位

| 维度 | Podium ($3B) | Birdeye ($1B) | 我们（目标） |
|------|-------------|---------------|-------------|
| 核心模式 | 监控 + 手动回复 | 监控 + 模板 | AI 生成 + 自动回复 |
| 回复速度 | 数小时（手动） | 数小时（模板） | < 5 分钟（自动） |
| 评论生成 | 无 | 无 | AI 驱动（QR → 5 星评论） |
| 部署时间 | 数天 | 数天 | 15 分钟 |
| 目标价格 | $400+/月 | $300+/月 | $79/月 (Pro) |
| AI 深度 | 基础情感分析 | 基础情感分析 | 完整情感 + 情绪 + 话题 + 预测 |

**我们的切入点**：从第一天起就是 AI 原生。不是后期加装的。产品本身就是 AI。

---

## 2. 北极星指标

### 2.1 三年目标

| 指标 | 第一年 (2026) | 第二年 (2027) | 第三年 (2028) |
|------|---------------|---------------|---------------|
| **年度经常性收入 (ARR)** | $1.2M | $12M | $60M+ |
| **净利率** | -20%（增长投资） | 15% | 35%+ |
| **付费客户数** | 1,000 | 10,000 | 50,000+ |
| **月度 AI 评论生成量** | 50K | 2M | 20M+ |
| **AI 自动回复率** | 60% | 85% | 95%+ |
| **客户平均 Google 评分提升** | +0.3★ | +0.5★ | +0.8★ |
| **客户年度留存率** | 85% | 90% | 95%+ |
| **NPS** | 50 | 65 | 75+ |

### 2.2 "#1"的定义

**中小企业评论管理世界第一**意味着：
- 该细分市场（餐饮 + 医疗 + 酒店，50 个门店以下的企业）中最高 ARR
- 最高客户数
- 最高 AI 自动化率（无需人工干预处理的评论百分比）

### 2.3 每周跟踪指标（内部看板）

| 类别 | 指标 | 目标 |
|------|------|------|
| 增长 | 每周新注册数 | 50 → 200 → 1000 |
| 增长 | 免费 → 付费转化率 | > 15% |
| 激活 | 首次 AI 回复发布的时间 | < 24 小时 |
| 激活 | 完成引导流程的百分比 | > 70% |
| 参与度 | WAU/MAU 比率 | > 60% |
| 参与度 | 每店每月平均生成评论数 | > 20 |
| 营收 | MRR 增长率 | > 15% MoM |
| 营收 | 流失率（月度） | < 3% |
| 质量 | AI 回复审批通过率（手动模式） | > 90% |
| 质量 | 客户使用 90 天后评分提升 | > +0.3★ |

---

## 3. 产品定义

### 3.1 核心用户流程

```
                        ┌──────────────────────────────────────────┐
                        │              客户旅程                     │
                        │                                          │
                        │  1. 在店内扫描 QR/NFC                     │
                        │  2. 选择标签（美食、服务、场合）             │
                        │  3. AI 生成个性化 5★ 评论                  │
                        │  4. 一键 → 发布到 Google                   │
                        │  5. 可选：留下私人反馈                      │
                        │                                          │
                        └──────────────────┬───────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                        自动化后端                                   │
│                                                                    │
│  实时处理: Google Pub/Sub → Webhook → <30秒 内处理                   │
│    → 验证 Pub/Sub 令牌                                              │
│    → 从 Google API 获取评论                                         │
│    → AI 生成回复草稿 (GPT-4o-mini)                                  │
│    → 自动审批检查（置信度 + 套餐权限）                                │
│    → 审批通过: 立即发布到 Google                                     │
│    → 未通过: 通过首选渠道通知店主                                     │
│                                                                    │
│  备用定时任务: 获取 Google 新评论（每 5 分钟）                         │
│    → 同 webhook 处理流程（通过 google_review_id 去重）                │
│                                                                    │
│  每周: 汇总指标 → 生成报告 → 发送邮件给店主                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────────┐
                        │             店主后台                      │
                        │                                          │
                        │  • KPI 概览（评分、评论、扫描量）          │
                        │  • 评论收件箱（审批/编辑/发布）            │
                        │  • 情感分析                               │
                        │  • 扫描分析（QR 表现）                     │
                        │  • 周报                                   │
                        │  • 门店设置（自动回复、标签等）             │
                        │  • 通知偏好                               │
                        │  • 计费与套餐管理                          │
                        │                                          │
                        └──────────────────────────────────────────┘
```

### 3.2 用户角色

| 角色 | 权限 | 适用人群 |
|------|------|----------|
| **Owner（所有者）** | 完整访问：计费、成员、所有门店、所有设置 | 企业主/加盟商 |
| **Manager（经理）** | 评论管理、分析、通知、指定门店 | 门店经理 |
| **Staff（员工）** | 仅查看看板、指定门店的扫描分析 | 前台员工 |

### 3.3 支持的平台

| 平台 | 状态 | 集成方式 | 可用数据 |
|------|------|----------|----------|
| Google Business Profile | **主要** | OAuth 2.0 + API v4 | 完整评论、回复功能 |
| Facebook | **已上线** | OAuth 2.0 + Graph API v19 | 推荐（二值 → 5.0/1.0） |
| Yelp | **已上线** | API Key + Fusion v3 | 摘要统计 + 3 条评论摘录 |
| TripAdvisor | **计划中** | 受限（需申请访问） | 待定 |

### 3.4 支持的语言

`EN` `ZH` `KO` `JA` `FR` `ES`

AI 评论生成和回复草稿支持全部 6 种语言。自动语言检测计划于 2026 年 Q3 上线。

---

## 4. 技术架构

### 4.1 技术栈（已锁定）

| 层级 | 技术 | 版本 | 选择理由 |
|------|------|------|----------|
| 框架 | Next.js (App Router) | 16.x | React 服务端组件, API 路由, ISR |
| 运行时 | Vercel 无服务器 | Edge + Node | 自动扩缩容，全球 CDN |
| 数据库 | Supabase (PostgreSQL) | 最新版 | 认证 + RLS + 存储 + 实时推送一体化 |
| AI | OpenAI GPT-4o-mini | 最新版 | 高并发场景下的性价比之选 |
| 支付 | Stripe | 最新版 | Checkout、订阅、Webhook |
| 短信 | Twilio | 最新版 | 评论邀请发送 |
| 邮件 | Resend | 最新版 | 事务邮件 + 邀请邮件 |
| 样式 | Tailwind CSS | 4.x | 实用优先，无 CSS-in-JS 开销 |
| 图标 | Lucide React | 最新版 | 统一图标库 |
| 测试 | Vitest | 4.x | 快速、ESM 原生、兼容 Next.js |

### 4.2 架构图

```
                    ┌─────────────────────────────────────┐
                    │           Vercel Edge CDN            │
                    │  （静态页面、ISR、中间件）              │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────┐
                    │        Next.js App Router            │
                    │                                      │
                    │  ┌──────────┐  ┌──────────────────┐  │
                    │  │ 页面     │  │ API 路由          │  │
                    │  │ (RSC +   │  │ (无服务器函数)     │  │
                    │  │  Client) │  │                    │  │
                    │  └────┬─────┘  └────┬───────────────┘  │
                    │       │             │                   │
                    └───────┼─────────────┼───────────────────┘
                            │             │
              ┌─────────────▼─────────────▼───────────────────┐
              │                                                │
    ┌─────────▼─────────┐  ┌──────────▼──────────┐  ┌────────▼────────┐
    │  Supabase          │  │  外部 API            │  │  定时任务       │
    │  ┌──────────────┐  │  │  ┌────────────────┐  │  │  (Vercel Cron)  │
    │  │ PostgreSQL   │  │  │  │ Google Biz API │  │  │                 │
    │  │ (RLS + UUID) │  │  │  │ OpenAI API     │  │  │  • fetch-reviews│
    │  │              │  │  │  │ Stripe API     │  │  │  • publish      │
    │  ├──────────────┤  │  │  │ Facebook API   │  │  │  • weekly-report│
    │  │ 认证          │  │  │  │ Yelp API       │  │  │  • fetch-plat.  │
    │  ├──────────────┤  │  │  │ Twilio API     │  │  │  • data-audit   │
    │  │ 存储          │  │  │  │ Resend API     │  │  │                 │
    │  │ （图片）       │  │  │  └────────────────┘  │  └─────────────────┘
    │  └──────────────┘  │  │                      │
    └────────────────────┘  └──────────────────────┘

              ┌─────────────────────────────────────────┐
              │   Google Cloud Pub/Sub（推送模式）         │
              │   → /api/webhooks/google-reviews         │
              │   → 实时评论处理（<30秒）                  │
              │   → 与定时任务互为去重备份                  │
              └─────────────────────────────────────────┘
```

### 4.3 多租户模型

```
租户（企业）─── 1:N ──→ 门店（门店地址）
       │                            │
       │── 1:N ──→ 成员              │── 1:N ──→ 评论
       │           (Owner/Mgr/Staff) │── 1:N ──→ 扫描事件
       │                            │── 1:N ──→ 生成器标签
       │── 1:N ──→ 平台凭据          │── 1:N ──→ 通知渠道
       │── 1:N ──→ 周报              │── 1:N ──→ 评论邀请
       │── 1:N ──→ 月度用量          │
       │                            │
       │── Stripe Customer ID       │
       │── 套餐 (free/starter/pro/enterprise)
```

### 4.4 关键数据库类型（重要）

这些是实际生产环境的类型。**永远不要对 tenant_id 使用 INTEGER 或对 id 字段使用 SERIAL。**

| 表 | 列 | 类型 | 备注 |
|---|---|------|------|
| tenants | id | UUID | 主键，来自 auth |
| stores | id | BIGINT | 自增 |
| reviews_raw | id | UUID | 主键 |
| 所有表 | tenant_id | UUID | 外键指向 tenants.id |
| 所有表 | store_id | BIGINT | 外键指向 stores.id |
| tenant_members | store_ids | BIGINT[] | 门店 ID 数组 |

### 4.5 定时任务调度 (vercel.json)

| 任务 | 调度 | 路径 | 用途 |
|------|------|------|------|
| 获取评论 | 每日 8:00 UTC | `/api/cron/fetch-reviews` | 获取评论、AI 草稿、自动审批、发布 |
| 发布回复 | 每日 9:00 UTC | `/api/cron/publish-replies` | 发布剩余已审批回复 |
| 周报 | 周一 17:00 UTC | `/api/cron/weekly-report` | 汇总 + 邮件发送周度指标 |
| 获取平台数据 | 待定 | `/api/cron/fetch-platforms` | 同步 Facebook/Yelp 评论 |
| 数据审计 | 待定 | `/api/cron/data-audit` | 数据一致性检查 |

### 4.6 所需环境变量

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Google Business Profile OAuth
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=

# Facebook OAuth
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
NEXT_PUBLIC_FACEBOOK_APP_ID=

# Yelp
YELP_API_KEY=

# 通信服务
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# 定时任务安全
CRON_SECRET=

# Google Pub/Sub Webhook
PUBSUB_VERIFICATION_TOKEN=

# 应用
NEXT_PUBLIC_BASE_URL=
```

---

## 5. 数据库架构

### 5.1 迁移历史

| # | 名称 | 用途 | 状态 |
|---|------|------|------|
| 001 | auth_multi_tenancy | 用户配置、租户、成员、门店、评论、草稿 | 生产环境 |
| 002 | notifications | 通知渠道 + 发送记录 | 生产环境 |
| 003 | scan_events | QR/NFC 扫描追踪（设备/地理数据） | 生产环境 |
| 004 | weekly_reports | 周度聚合报告存储 | 生产环境 |
| 005 | customer_feedback | 调查中的差评反馈收集 | 生产环境 |
| 006 | store_images_bucket | 门店主图/Logo 的 Supabase 存储桶 | 生产环境 |
| 007 | stripe_billing | 租户表上的 Stripe ID + 月度用量表 | 生产环境 |
| 008 | multi_platform_sentiment_invites | 平台凭据、情感字段、评论邀请 | 生产环境 |
| 009 | auto_reply | 门店的 auto_reply_mode + auto_reply_min_rating | 生产环境 |
| 010 | review_approve_tokens | 通知链接的一键审批令牌 | 生产环境 |
| 011 | vertical_templates | 垂直行业 AI 模板 + 语言检测 | 生产环境 |
| 012 | competitor_analysis | 竞品追踪表 + 对比数据 | 生产环境 |
| 013 | team_inbox_assignments | 团队收件箱、评论分配、内部备注 | 生产环境 |
| 014 | ab_experiments | 回复风格 A/B 测试框架 | 生产环境 |
| 015 | api_keys_webhooks | API 密钥、Webhook、Webhook 推送记录、AI 训练数据 | 生产环境 |
| 016 | pos_whitelabel | POS 集成、白标配置、硬件设备 | 生产环境 |
| 017 | marketplace | 专家市场：specialists、orders、assignments 三表 | 待部署 |

### 5.2 核心表概览

**`tenants`** — 企业实体
- `id` UUID 主键
- `name`、`plan` (free/starter/pro/enterprise)
- `stripe_customer_id`、`stripe_subscription_id`

**`stores`** — 实体门店
- `id` BIGINT 主键（自增）
- `tenant_id` UUID 外键
- `name`、`slug`、`place_id`
- 设施标记：`can_dine_in`、`can_takeout`、`has_restroom` 等
- AI 设置：`tone_setting`、`custom_handbook_overrides`
- 自动回复：`auto_reply_mode`、`auto_reply_min_rating`
- 图片：`hero_url`、`logo_url`

**`reviews_raw`** — 所有平台的评论
- `id` UUID 主键
- `store_id` BIGINT 外键
- `google_review_id`、`platform`、`external_review_id`
- `author_name`、`rating`、`content`、`full_json`
- 回复：`reply_draft`、`reply_status` (pending/drafted/approved/published)、`published_at`
- 情感：`sentiment_score`、`sentiment_label`、`emotion_tags`、`key_topics`、`sentiment_analyzed_at`
- `normalized_rating`（跨平台标准化 1-5）

**`platform_credentials`** — 每个平台每个租户的 OAuth 令牌
- `tenant_id` UUID 外键
- `platform` (google/facebook/yelp/tripadvisor)
- `access_token`、`refresh_token`、`token_expiry`
- `platform_account_id`、`metadata`

**`review_invites`** — 短信/邮件邀请追踪
- `tenant_id` UUID 外键、`store_id` BIGINT 外键
- `channel` (sms/email)、`recipient`、`recipient_name`
- `token`（唯一，用于追踪）、`status` (sent/delivered/opened/completed/failed/bounced)

**`scan_events`** — QR/NFC 扫描分析
- `store_id` BIGINT 外键
- `scan_type` (qr/nfc/link)、`device_type`、`browser`、`os`
- `latitude`、`longitude`、`city`、`country`

**`usage_monthly`** — 套餐限额追踪
- `tenant_id` UUID、`store_id` BIGINT、`year_month` TEXT
- `reviews_generated`、`scans_count`、`invites_sent`
- 通过 `increment_usage()` RPC 递增

### 5.3 迁移规则

1. **tenant_id 永远用 UUID，store_id 永远用 BIGINT** — 参见第 4.4 节
2. **永远使用 `IF NOT EXISTS`** — 迁移必须具有幂等性
3. **新列必须添加注释**
4. **默认启用 RLS** — 新表必须有 RLS 策略
5. **索引策略** — 对高频表中 WHERE/JOIN 使用的列添加索引

---

## 6. 功能规范

### 6.1 AI 评论生成（核心产品）

**流程**: 客户扫描 QR → 选择标签 → AI 生成评论 → 发布到 Google

**技术细节**:
- 模型：GPT-4o-mini（成本：约 $0.001/条评论）
- 提示词：包含门店信息、标签、语气设置的动态模板
- 输出：JSON `{ draft: string, category: string }`
- 语言：支持 6 种（EN、ZH、KO、JA、FR、ES）
- Temperature：0.7（平衡创造力）

**质量要求**:
- 生成的评论必须唯一（同一门店不能有两条相同评论）
- 评论必须自然地融入所选标签
- 评论必须匹配门店的语气设置
- 评论长度应为 2-4 句（Google 最佳长度）

### 6.2 AI 回复草稿

**触发条件**: 通过 fetch-reviews 定时任务导入新评论
**模型**: 使用 EXPERT_SYSTEM_PROMPT 的 GPT-4o-mini
**输入**: 评论内容、评分、门店信息、语气设置、手册覆盖
**输出**: JSON `{ draft: string, category: string }`

**回复质量规则**:
- 好评（4-5 星）：感谢客户、提及具体细节、邀请再次光临
- 差评（1-2 星）：道歉、回应关切、提供解决方案并附上支持邮箱
- 中评（3 星）：感谢、请求具体反馈、承诺改进

### 6.3 自动回复模式 *（已实现 — 迁移 009）*

**目的**: 消除高置信度回复的手动审批步骤

**门店设置**:
| 设置 | 列 | 可选值 | 默认值 |
|------|---|--------|--------|
| 回复模式 | `auto_reply_mode` | manual / auto_positive / auto_all | manual |
| 最低评分 | `auto_reply_min_rating` | 1-5 | 4 |

**行为矩阵**:
| 模式 | 评分 >= 最低评分 | 评分 < 最低评分 |
|------|-----------------|-----------------|
| manual | 草稿 → 等待审批 | 草稿 → 等待审批 |
| auto_positive | 草稿 → 自动审批 → 发布 | 草稿 → 等待审批 |
| auto_all | 草稿 → 自动审批 → 发布 | 草稿 → 自动审批 → 发布 |

**套餐限制**: 仅 Pro 和 Enterprise
**性能**: 并行 AI 草稿生成（并发数 5），审批后内联发布

### 6.4 情感分析

**引擎**: GPT-4o-mini（无 API 密钥时使用基于评分的回退方案）
**每条评论的输出**:
| 字段 | 类型 | 示例 |
|------|------|------|
| score | float (-1 到 1) | 0.7 |
| label | 枚举 | positive / neutral / negative |
| emotions | string[] | ["satisfaction", "delight"] |
| topics | string[] | ["food quality", "service speed"] |

**回退启发式**（无 API 密钥）:
| 评分 | 分数 | 标签 | 默认情绪 |
|------|------|------|----------|
| 5 | 0.7 | positive | satisfaction |
| 4 | 0.4 | positive | contentment |
| 3 | 0.0 | neutral | indifference |
| 2 | -0.3 | negative | frustration |
| 1 | -0.6 | negative | disappointment |

**批处理**: 每次定时任务最多处理 30 条评论，并发数 5

### 6.5 实时 Webhook（Google Pub/Sub）*（已实现）*

**目的**: 用即时推送通知取代 5 分钟定时轮询

**架构**:
```
Google Business Profile → Cloud Pub/Sub 主题 → 推送订阅
  → POST /api/webhooks/google-reviews（我们的端点）
  → 验证令牌 → 获取评论 → AI 草稿 → 自动审批 → 发布
  → 目标：端到端 < 30 秒
```

**处理管线**:
1. **验证** — 校验 `Authorization: Bearer <token>` 与 `PUBSUB_VERIFICATION_TOKEN`
2. **解析** — 解码 base64 Pub/Sub 消息 → 提取 account、location、reviewId、changeType
3. **租户匹配** — 通过 `google_credentials` 中的 Google 账户 ID 查找租户
4. **获取评论** — 调用 Google My Business API 获取完整评论数据
5. **去重** — 检查 `reviews_raw` 中的 `google_review_id`（防止与定时任务重复处理）
6. **插入** — 将评论存入 `reviews_raw`，`reply_status = 'pending'`
7. **AI 草稿** — 使用门店上下文 + 手册通过 GPT-4o-mini 生成回复
8. **自动审批** — 应用 `auto_reply_mode` + 置信度评分
9. **发布** — 若自动审批通过且置信度高，立即发布回复到 Google
10. **通知** — 对需要人工审核的差评提醒店主

**与定时任务的去重**: Webhook 和 Cron 都在插入前检查 `google_review_id`。先到先处理，后到跳过并返回 `status: 'duplicate'`。

**错误处理**: 即使发生不可重试的错误，也返回 HTTP 200，以防止 Pub/Sub 无限重试循环。

**健康指标**（内存中）:
- 接收总数 / 已处理 / 错误数
- 平均处理时间（毫秒）
- 在线率百分比
- 最后接收 / 处理时间戳

**管理后台**: `/admin/settings/realtime` — 状态、速度对比、指标、接入指南

### 6.6 评论邀请（短信 + 邮件）

**目的**: 主动邀请客户留下评论
**渠道**: 短信 (Twilio) + 邮件 (Resend)
**套餐限制**: Pro (500条/月) + Enterprise (无限)

**流程**:
1. 店主上传收件人名单或手动输入
2. 系统为每个邀请生成唯一追踪令牌
3. 通过所选渠道发送带有个性化链接的邀请
4. 追踪状态：已发送 → 已送达 → 已打开 → 已完成/退回/失败

**追踪端点**: `/api/invite/track`（公开，匿名更新）

### 6.7 多平台评论同步

**Facebook**:
- 使用 `pages_read_user_content` 权限的 OAuth 2.0
- 推荐（二值）标准化：positive → 5.0，negative → 1.0
- 存入 `reviews_raw`，`platform = 'facebook'`

**Yelp**:
- 基于 API 密钥（无需 OAuth）
- 仅限摘要统计 + 3 条评论摘录
- 存入 `platform_summaries` 表

**套餐限制**: Starter、Pro、Enterprise

### 6.8 通知系统

**事件**:
| 事件 | 触发条件 | 渠道 |
|------|----------|------|
| new_review | 导入任何新评论 | 全部 |
| negative_review | 1-2 星评论 | 全部（优先） |
| weekly_report | 周一汇总 | 邮件 |

**渠道实现**:
| 渠道 | 服务商 | 套餐 |
|------|--------|------|
| Email | Resend | 全部套餐 |
| Slack | Webhook | Starter+ |
| LINE | Messaging API | Pro+ |
| WhatsApp | Twilio | Pro+ |

### 6.9 周报

**调度**: 每周一 17:00 UTC
**内容**: 过去 7 天汇总指标
- 评论总数、平均评分、评分分布
- 最佳/最差评论 Top
- 扫描分析（QR/NFC 表现）
- 情感摘要（可选）
**发送方式**: 邮件发送给店主 + 可选 Slack/LINE

### 6.10 QR/NFC 扫描分析

**每次扫描追踪的数据**:
- 扫描类型（QR/NFC/链接）
- 设备类型、浏览器、操作系统
- 地理位置（城市、国家、经纬度）
- 时间戳、UTM 参数

**看板**: 扫描量趋势、设备分布、地理分布、转化漏斗

---

## 7. API 规范

### 7.1 公开 API（无需认证）

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/scan` | 记录 QR/NFC 扫描事件 |
| POST | `/api/track` | 记录页面访问 |
| POST | `/api/generate` | 根据标签生成 AI 评论 |
| POST | `/api/confirm` | 确认评论已发布 |
| POST | `/api/feedback` | 提交客户私人反馈 |
| GET | `/api/store?slug=xxx` | 获取门店公开信息 |
| GET | `/api/invite/track?token=xxx&event=xxx` | 追踪邀请交互 |
| GET | `/api/reviews/approve?token=xxx` | 一键审批并发布（来自通知链接） |

### 7.2 管理 API（需要认证）

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/admin/analytics/scans` | 扫描分析数据 |
| GET | `/api/admin/analytics/sentiment` | 情感分析结果 |
| POST | `/api/admin/invites` | 发送评论邀请 |
| GET | `/api/admin/invites` | 查看邀请历史 |
| POST | `/api/admin/sync-reviews` | 手动触发评论同步 |
| GET | `/api/admin/google-locations` | 列出 Google 商家地点 |
| POST | `/api/admin/notifications/test` | 测试通知渠道 |
| GET | `/api/admin/hardware` | 列出所有硬件设备 |
| POST | `/api/admin/hardware` | 注册新设备 |
| PATCH | `/api/admin/hardware/[id]` | 更新设备（开关状态、编辑字段） |
| DELETE | `/api/admin/hardware/[id]` | 删除设备 |
| GET | `/api/admin/marketplace/specialists` | 列出可用专家 |
| GET | `/api/admin/marketplace/orders` | 列出市场订单 |
| POST | `/api/admin/marketplace/orders` | 创建市场订单（雇用专家） |

### 7.3 计费 API

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/billing/checkout` | 创建 Stripe 结账会话 |
| POST | `/api/billing/portal` | 打开 Stripe 客户门户 |
| POST | `/api/billing/webhook` | 处理 Stripe Webhook |

### 7.4 OAuth API

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/auth/google-business` | 启动 Google OAuth 流程 |
| GET | `/api/auth/google-business/callback` | Google OAuth 回调 |
| GET | `/api/auth/facebook` | 启动 Facebook OAuth 流程 |
| GET | `/api/auth/facebook/callback` | Facebook OAuth 回调 |

### 7.5 Webhook API

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/webhooks/google-reviews` | Google Pub/Sub 推送端点 — 实时评论处理 |
| GET | `/api/admin/webhook-status` | Webhook 健康指标、延迟对比、接入说明 |

### 7.6 定时任务 API（需要 CRON_SECRET）

| 方法 | 路径 | 调度 | 用途 |
|------|------|------|------|
| GET | `/api/cron/fetch-reviews` | 每 5 分钟 | 获取 + 草稿 + 自动审批 + 发布 + 紧急提醒 |
| GET | `/api/cron/publish-replies` | 每 10 分钟 | 发布剩余已审批回复 |
| GET | `/api/cron/weekly-report` | 周一 17:00 UTC | 生成 + 发送周报 |
| GET | `/api/cron/fetch-platforms` | 待定 | 同步 Facebook/Yelp 数据 |
| GET | `/api/cron/data-audit` | 待定 | 数据一致性检查 |

---

## 8. 套餐与定价模型

### 8.1 套餐定义

| | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| **价格** | 永久免费 | $29/月 | $79/月 | 定制 |
| **门店数** | 1 | 3 | 10 | 无限 |
| **AI 评论/月** | 50 | 500 | 无限 | 无限 |
| **邀请/月** | 0 | 0 | 500 | 无限 |

### 8.2 功能矩阵

| 功能 | Free | Starter | Pro | Enterprise |
|------|:----:|:-------:|:---:|:----------:|
| AI 评论生成 | Y | Y | Y | Y |
| 基础分析 | Y | Y | Y | Y |
| AI 回复草稿 | - | Y | Y | Y |
| 周报 | - | Y | Y | Y |
| 高级分析 | - | Y | Y | Y |
| 多平台评论 | - | Y | Y | Y |
| 情感分析 | - | Y | Y | Y |
| 自动发布回复 | - | - | Y | Y |
| **自动回复模式** | - | - | Y | Y |
| 评论邀请（短信/邮件） | - | - | Y | Y |
| 自定义 AI 手册/语气 | - | - | Y | Y |
| 全渠道通知 | - | - | Y | Y |
| 优先支持 | - | - | Y | Y |
| **硬件设备管理** | - | - | Y | Y |
| API 访问 | - | - | - | Y |
| SSO / SAML | - | - | - | Y |
| 白标 | - | - | - | Y |

### 8.3 通知渠道按套餐

| 渠道 | Free | Starter | Pro | Enterprise |
|------|:----:|:-------:|:---:|:----------:|
| Email | Y | Y | Y | Y |
| Slack | - | Y | Y | Y |
| LINE | - | - | Y | Y |
| WhatsApp | - | - | Y | Y |

### 8.4 定价策略

- **Free**: 获客。让他们看到价值。达到限额时自动提示升级。
- **Starter**: "我需要这个"层级。多平台 + 情感分析 = 明显的价值。
- **Pro**: "我需要自动化"层级。自动回复 + 邀请 = 节省时间。这是**目标层级**。
- **Enterprise**: 销售驱动。定制定价。API + SSO + 白标，面向连锁企业。

**Stripe 集成**: Checkout 会话、客户门户、订阅生命周期 Webhook。

---

## 9. 安全与隐私

### 9.1 认证

- Supabase Auth（邮箱 + OAuth）
- 通过 HTTP-only Cookie 的会话令牌
- 中间件对所有 `/admin/*` 和 `/api/admin/*` 路由强制认证

### 9.2 授权

- 所有数据表启用行级安全（RLS）
- `auth.uid()` 通过 `tenant_members` 映射到租户
- 服务端操作和 API 路由中进行角色检查
- 通过 `tenant_members.store_ids` 进行门店级访问控制

### 9.3 API 安全

- 定时任务路由通过 `CRON_SECRET` 查询参数保护
- Stripe Webhook 通过 `stripe.webhooks.constructEvent()` 验证
- 公开端点的速率限制（内存方式，规模化时升级到 Redis）

### 9.4 数据隐私

- 客户 PII（邮箱、邀请用电话）静态加密（Supabase 默认）
- OAuth 令牌存储在启用 RLS 的 `platform_credentials` 中
- 跨租户无数据共享（RLS 强制执行）
- GDPR 考虑：添加数据导出/删除端点（路线图 2026 Q4）

### 9.5 密钥管理

- 所有密钥存放在环境变量中（永远不写入代码）
- 泄露后立即轮换
- Service Role Key：仅服务端使用，永不暴露给客户端

---

## 10. 开发路线图

### 第一阶段：速度壁垒（2026 Q2）— ✅ 已完成

**主题**: 让回复速度成为我们的第一竞争优势

| 优先级 | 功能 | 状态 | 影响 |
|--------|------|------|------|
| P0 | 4-5 星自动回复 + 即时发布 | **完成** | 48 小时 → <5 分钟回复时间 |
| P0 | 并行 AI 草稿生成（5 倍并发） | **完成** | 20 秒 → 4 秒草稿生成 |
| P0 | **实时 Pub/Sub Webhook（取代定时轮询）** | **完成** | 5 分钟 → <30 秒评论检测 |
| P1 | 高频评论轮询（每 5 分钟）+ 发布（每 10 分钟） | **完成** | 准实时评论检测（定时备份） |
| P1 | 差评 <60 秒紧急提醒 + AI 草稿 + 一键审批 | **完成** | 声誉保护 |
| P2 | 自动回复置信度评分 | **完成** | 向店主展示 AI 为何自动审批 |
| P2 | A/B 测试回复风格 | **完成** | 数据驱动的语气优化 |

### 第二阶段：规模壁垒（2026 Q3-Q4）— ✅ 已完成

**主题**: 拓展到更多垂直行业和市场

| 优先级 | 功能 | 状态 | 影响 |
|--------|------|------|------|
| P0 | 多垂直 AI 模板（医疗、酒店、汽修） | **完成** | 3 倍可触达市场 |
| P0 | 多语言自动检测 + 母语回复 | **完成** | 国际化扩张 |
| P1 | 竞品对比报告 | **完成** | "你的评分 vs 附近竞品" |
| P1 | 回复模板库 | **完成** | 降低常见模式的 AI 成本 |
| P2 | 批量导入（CSV）评论邀请 | **完成** | 企业级入驻 |
| P2 | 团队收件箱（含分配） | **完成** | 多门店管理 |

### 第三阶段：数据壁垒（2027）— ✅ 已完成

**主题**: 将积累的数据转化为可防御的护城河

| 优先级 | 功能 | 状态 | 影响 |
|--------|------|------|------|
| P0 | 行业基准平台 | **完成** | "你的餐厅排名前 20%" |
| P0 | 预测分析 | **完成** | "评分下降趋势 12%，建议..." |
| P1 | CRM 集成（Webhook 事件系统） | **完成** | 企业留存 |
| P1 | 按垂直行业微调 AI 模型 | **完成** | 更好的回复质量 |
| P2 | 异常检测（虚假评论警报） | **完成** | 信任与安全 |
| P2 | 客户旅程映射（扫描 → 评论 → 回访） | **完成** | ROI 证明 |

### 第四阶段：生态壁垒（2028）— ✅ 已完成（P0+P1+P2）

**主题**: 成为平台，而不仅是工具

| 优先级 | 功能 | 状态 | 影响 |
|--------|------|------|------|
| P0 | 开放 API + 合作伙伴生态 | **完成** | 开发者采用 |
| P0 | POS 集成（Toast、Clover、Square） | **完成** | 结账时自动邀评 |
| P1 | 白标方案 | **完成** | 其他 SaaS 嵌入我们获取收入 |
| P1 | AI 评论审计（检测竞品操控） | **完成** | 信任护城河 |
| P2 | 评论回复专家市场 | **完成** | 平台收入 |
| P2 | 实体硬件管理（NFC 立牌、桌卡、QR 展架） | **完成** | 垂直整合 |

### 优先级决策框架

每个功能需求按以下公式评估：

```
得分 = (营收影响 x 3) + (用户节省时间 x 2) + (竞争护城河 x 2) + (实现速度 x 1)
                                                                    （工作量的倒数）
```

得分 < 5 进入待办池。得分 > 8 立即执行。

---

## 11. 质量标准

### 11.1 代码质量

- **TypeScript**: 严格模式，不允许 `any` 类型（优先使用 `unknown` + 类型守卫）
- **构建**: 合并前 `npm run build` 必须 0 错误通过
- **测试**: `npx vitest run` 必须 0 失败通过
- **覆盖率目标**: `/src/lib/` > 70%，整体 > 50%（跟踪但不阻塞）

### 11.2 测试策略

| 层级 | 工具 | 测试内容 |
|------|------|----------|
| 单元测试 | Vitest | 纯函数（plan-limits、sentiment、rate-limit、normalizer） |
| 集成测试 | Vitest + Mock | API 路由处理器、服务端操作、定时任务逻辑 |
| 端到端测试 | （计划：Playwright） | 关键流程：QR 扫描 → 评论 → 发布 |

**当前测试套件**（461 项测试，27 个文件）:
- `plan-limits.test.ts` — 16 项测试
- `plan-limits-features.test.ts` — 7 项测试
- `auto-reply.test.ts` — 15 项测试
- `urgent-alert.test.ts` — 24 项测试
- `verticals.test.ts` — 14 项测试
- `template-matcher.test.ts` — 21 项测试
- `csv-parser.test.ts` — 19 项测试
- `confidence.test.ts` — 14 项测试
- `ab-testing.test.ts` — 14 项测试
- `predictive.test.ts` — 19 项测试
- `benchmarking.test.ts` — 14 项测试
- `anomaly-detection.test.ts` — 21 项测试
- `journey-analytics.test.ts` — 17 项测试
- `api-keys.test.ts` — 19 项测试
- `webhooks.test.ts` — 11 项测试
- `training-data.test.ts` — 16 项测试
- `pos-integration.test.ts` — 21 项测试
- `whitelabel.test.ts` — 17 项测试
- `review-auditor.test.ts` — 22 项测试
- `review-webhook.test.ts` — 31 项测试 *（实时 Pub/Sub Webhook）*
- `hardware.test.ts` — 46 项测试 *（NFC/QR 设备管理）*
- `marketplace.test.ts` — 40 项测试 *（评论回复专家市场）*
- `rate-limit.test.ts` — 4 项测试
- `rate-limit-helpers.test.ts` — 6 项测试
- `pricing-display.test.ts` — 7 项测试
- `sentiment.test.ts` — 4 项测试
- `facebook-normalize.test.ts` — 2 项测试

### 11.3 性能目标

| 指标 | 目标 | 测量方式 |
|------|------|----------|
| 页面加载（LCP） | < 2.5 秒 | Vercel Analytics |
| API 响应（p95） | < 500 毫秒 | Vercel Logs |
| AI 草稿生成（每条评论） | < 3 秒 | 定时任务日志 |
| 定时任务总运行时间 | < 60 秒 | Vercel 函数超时 |
| 构建时间 | < 120 秒 | CI/CD |

### 11.4 监控与告警

- **Vercel Analytics**: Core Web Vitals、流量
- **Supabase Dashboard**: 数据库查询、存储、认证
- **定时任务日志**: 评论获取数、草稿成功率、发布结果
- **Stripe Dashboard**: MRR、流失率、支付失败
- **未来**: Sentry 错误追踪、自定义看板

---

## 12. 代码规范与模式

### 12.1 Supabase 客户端使用

```typescript
// 公开 API 路由（允许匿名访问）：
import { supabase } from '@/lib/db';

// 需认证的管理页面（服务端组件/操作）：
import { createSupabaseServerClient } from '@/lib/supabase/server';
const supabase = await createSupabaseServerClient();

// 定时任务 & Webhook（绕过 RLS）：
import { supabaseAdmin } from '@/lib/supabase/admin';
```

### 12.2 文件命名

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 路由文件 | `route.ts`、`page.tsx` | `src/app/api/admin/invites/route.ts` |
| 组件 | PascalCase | `SentimentDashboard.tsx` |
| 库文件 | camelCase 或 kebab-case | `plan-limits.ts`、`db.ts` |
| SQL | snake_case + 数字前缀 | `009_auto_reply.sql` |
| 测试 | `*.test.ts` | `auto-reply.test.ts` |

### 12.3 数据库命名

- 表名：`snake_case` 复数（`reviews_raw`、`scan_events`）
- 列名：`snake_case`（`auto_reply_mode`、`tenant_id`）
- 索引：`idx_{表名}_{列名}`（`idx_stores_auto_reply_mode`）
- 函数：`snake_case` 动词（`increment_usage`）

### 12.4 API 响应模式

```typescript
// 成功
return NextResponse.json({ data: result });
return NextResponse.json({ success: true, count: 5 });

// 错误
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
return NextResponse.json({ error: 'Store not found' }, { status: 404 });
return NextResponse.json({ error: error.message }, { status: 500 });
```

### 12.5 错误处理

- API 路由：try/catch → `console.error()` → 结构化 JSON 错误响应
- 服务端操作：try/catch → `{ success: boolean, error?: string }`
- 客户端组件：ErrorBoundary 包裹，toast 消息提供用户反馈
- 定时任务：按租户 try/catch（单个失败不影响其他）

### 12.6 导入路径别名

```typescript
import { ... } from '@/lib/...';       // 库代码
import { ... } from '@/components/...'; // 共享组件
// 始终使用 @/ 别名，不使用相对路径如 ../../../
```

### 12.7 功能门控模式

```typescript
import { hasFeature, getPlanLimits } from '@/lib/plan-limits';

// 检查布尔功能
if (!hasFeature(tenant.plan, 'autoReplyMode')) {
  return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
}

// 检查数值限额
const limits = getPlanLimits(tenant.plan);
if (currentCount >= limits.maxInvitesPerMonth) {
  return NextResponse.json({ error: 'Limit reached' }, { status: 429 });
}
```

### 12.8 Git 提交规范

```
<类型>: <简短描述>

类型: feat, fix, refactor, test, docs, chore, perf
示例: feat: add auto-reply mode for 4-5 star reviews
```

---

## 13. 修订日志

| 日期 | 版本 | 变更 | 原因 |
|------|------|------|------|
| 2026-03-08 | 1.0 | 初始规范创建 | 建立开发宪法 |
| 2026-03-08 | 1.1 | 第一阶段 P1 完成：5 分钟轮询、紧急提醒、一键审批 | 速度壁垒执行 |
| 2026-03-08 | 1.2 | 第二阶段全部完成：垂直模板、语言检测、竞品、模板、CSV 导入、团队收件箱 | 规模壁垒执行 |
| 2026-03-08 | 1.3 | 第一阶段 P2 完成：置信度评分、A/B 测试。第三阶段 P0 完成：基准、预测分析。200 项测试 / 16 文件。 | 完整第一阶段 + 第三阶段 P0 执行 |
| 2026-03-08 | 1.4 | 第三阶段 P2 完成：异常检测（虚假评论警报）、客户旅程映射（扫描→评论→发布漏斗）。238 项测试 / 18 文件。 | 数据壁垒 P2 执行 |
| 2026-03-08 | 1.5 | 第三阶段 P1 完成：Webhook 事件系统（CRM 集成）、AI 训练数据收集。第四阶段 P0：开放 API（密钥管理 + 公共 REST）。迁移 015。284 项测试 / 21 文件。 | 生态壁垒 P0 + 数据壁垒 P1 |
| 2026-03-08 | 1.6 | 第四阶段 P0+P1 完成：POS 集成（Toast/Clover/Square/Lightspeed/Shopify）、白标品牌、AI 评论审计。迁移 016。344 项测试 / 24 文件。 | 生态壁垒 P0+P1 执行 |
| 2026-03-08 | 1.7 | 实时 Webhook 系统：Google Pub/Sub 推送端点替代定时轮询，实现即时评论检测（<30 秒 vs 5 分钟）。迁移 015+016 已部署生产。375 项测试 / 25 文件。 | 速度壁垒 — 最终项目完成 |
| 2026-03-08 | 1.8 | 硬件设备管理：NFC 立牌、QR 展架、桌卡、柜台展示、NFC 卡。完整 CRUD API、管理 UI（网格/列表视图）、设备健康监控、ROI 估算、放置建议、扫描分析。Pro+ 套餐限制。421 项测试 / 26 文件。 | 第四阶段 P2 — 硬件管理完成 |
| 2026-03-08 | 1.9 | 评论回复专家市场：专家简介管理、订单生命周期（一次性/月度/按需）、任务分配追踪、15% 平台佣金、10 个支持行业、智能匹配算法、收入预测。迁移 017。461 项测试 / 27 文件。 | 第四阶段 P2 — 市场完成，路线图 100% 完成 |

---

> **如何修订本规范**
>
> 1. 提出变更及理由
> 2. 对照第一性原理（第 1.2 节）评估
> 3. 更新受影响的章节
> 4. 在修订日志（第 13 节）添加条目
> 5. 后续所有开发遵循修订后的规范
>
> 本文档是唯一的事实来源。代码遵循规范。规范遵循第一性原理。
