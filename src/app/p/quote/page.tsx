'use client';

import { useState } from 'react';

const DEMO_TOKENS = {
  anna: '3fd7ed1f3595a5b4cb8274fe0ac2d4a5',
  mary: '298616a636ee565774a3a61b24984009',
};

interface TagItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  demoUrl: string;
  demoLabel: string;
  external?: boolean;
}

interface FeatureCategory {
  title: string;
  color: string;
  tags: TagItem[];
}

const CATEGORIES: FeatureCategory[] = [
  {
    title: '🌐 網站 + 技術基礎',
    color: '#3b82f6',
    tags: [
      { id: 'website', label: '品牌官網', icon: '🌐', description: '多頁面響應式網站，手機/平板/電腦完美適配，SEO + GA4 串接。', demoUrl: 'https://www.ourfoodfix.com/', demoLabel: '作品：OurFoodFix.com', external: true },
      { id: 'website2', label: '品牌形象站', icon: '🎨', description: '從品牌色彩到版面設計，完整切版開發，含兩輪細節調整。', demoUrl: 'https://www.mygreatpumpkin.com/', demoLabel: '作品：MyGreatPumpkin.com', external: true },
      { id: 'website3', label: '餐飲品牌站', icon: '☕', description: '線上菜單、Google Maps 嵌入、預約表單，餐飲業完整解決方案。', demoUrl: 'https://www.thestormcafe.com/', demoLabel: '作品：TheStormCafe.com', external: true },
    ],
  },
  {
    title: '🛍 電商核心',
    color: '#f5c842',
    tags: [
      { id: 'products', label: '商品管理', icon: '📦', description: '後台管理商品、規格變體（顏色/尺寸）、庫存預警、CSV 批次匯入、商品 SEO 欄位。', demoUrl: '/p/demo/products', demoLabel: 'Demo: 商品管理後台' },
      { id: 'stripe', label: 'Stripe 金流', icon: '💳', description: '信用卡（Visa/MC/Amex）、Apple Pay、Google Pay，PCI DSS 合規，錢直接進你帳戶。0% 抽成。', demoUrl: '/p/demo/checkout', demoLabel: 'Demo: 結帳頁面' },
      { id: 'tax', label: '加拿大稅務', icon: '🧾', description: 'GST 5%、HST（ON 13%）、PST（BC 7%）、QST（QC 9.975%）自動計算，合規收據。', demoUrl: '/p/demo/checkout', demoLabel: 'Demo: 稅務計算' },
      { id: 'orders', label: '訂單管理', icon: '📋', description: '訂單狀態追蹤、退款一鍵操作、客戶溝通記錄、CSV 匯出。', demoUrl: '/p/demo/orders', demoLabel: 'Demo: 訂單管理後台' },
      { id: 'cart', label: '購物車+結帳', icon: '🛒', description: '訪客/會員結帳、優惠券即時套用、積分折抵、記住付款方式加速回購。', demoUrl: '/p/demo/checkout', demoLabel: 'Demo: 結帳流程' },
      { id: 'product-reviews', label: '商品評價', icon: '⭐', description: '購買後 7 天自動發評價邀請，星評+文字評論顯示於商品頁，留評回饋積分。', demoUrl: '/p/demo/reviews', demoLabel: 'Demo: 商品評價系統' },
    ],
  },
  {
    title: '👤 會員體系',
    color: '#8b5cf6',
    tags: [
      { id: 'social-login', label: '社群登入', icon: '🔐', description: 'Google 和 Apple 一鍵登入，不需要記帳號密碼，大幅降低註冊門檻。', demoUrl: '/auth/login', demoLabel: 'Demo: 登入頁面' },
      { id: 'credits', label: '堂數/點數管理', icon: '🎫', description: '堂數制/點數制/儲值金三種模式，自動追蹤消耗，到期提醒。', demoUrl: `/m/${DEMO_TOKENS.anna}`, demoLabel: 'Demo: 會員方案餘額' },
      { id: 'vip', label: 'VIP 分級', icon: '👑', description: '一般/銀/金/鑽石四級，依累計消費自動升降級，專屬折扣+積分倍率。', demoUrl: '/admin/members', demoLabel: 'Demo: 會員管理（含 VIP 標籤）' },
      { id: 'points', label: '積分+兌換', icon: '⭐', description: '消費回饋積分，可折抵購物，VIP 倍率不同，推薦好友雙方各獲積分。', demoUrl: `/m/${DEMO_TOKENS.anna}`, demoLabel: 'Demo: 積分餘額' },
      { id: 'coupons', label: '優惠券+發券', icon: '🎁', description: '固定金額/百分比/免運費，按 VIP 等級批次發券，使用限制+有效期。', demoUrl: '/p/demo/checkout', demoLabel: 'Demo: 優惠券套用' },
      { id: 'referral', label: '推薦+生日禮', icon: '🎂', description: '推薦連結自動追蹤，被推薦人首購後雙方得獎。生日前 3 天自動發生日券。', demoUrl: '/admin/referrals', demoLabel: 'Demo: 推薦計畫' },
      { id: 'member-center', label: '會員中心', icon: '👤', description: '查看訂單記錄、積分餘額、可用優惠券、數位商品下載連結。', demoUrl: `/m/${DEMO_TOKENS.anna}`, demoLabel: 'Demo: 會員中心首頁' },
    ],
  },
  {
    title: '🤖 AI 智能會員系統',
    color: '#14b8a6',
    tags: [
      { id: 'booking', label: '線上預約', icon: '📅', description: '客人 SMS 連結直接預約，選服務→選日期→選技師→確認，不用你回訊息。', demoUrl: `/m/${DEMO_TOKENS.anna}/book`, demoLabel: 'Demo: 線上預約流程' },
      { id: 'checkin', label: '核銷扣堂', icon: '✅', description: '客人到場說 6 位數字，你輸入就自動扣堂，10 秒完成。', demoUrl: '/admin/verify', demoLabel: 'Demo: 6 碼核銷' },
      { id: 'review-guide', label: '評論引導', icon: '💬', description: '服務後自動問卷，好評導 Google Review，差評留內部改進。留評送積分。', demoUrl: `/m/${DEMO_TOKENS.mary}/feedback/demo`, demoLabel: 'Demo: 問卷→評論引導' },
      { id: 'dormant', label: '沉睡喚醒', icon: '💤', description: '30 天沒來自動 SMS 提醒方案餘額，60 天送積分邀回。', demoUrl: '/admin/performance', demoLabel: 'Demo: 沉睡客戶清單' },
      { id: 'sms-remind', label: 'SMS 提醒', icon: '📱', description: '預約前 24hr 自動提醒+注意事項。CASL 合規，含退訂機制。', demoUrl: `/m/${DEMO_TOKENS.anna}`, demoLabel: 'Demo: SMS 通知' },
      { id: 'data', label: '數據分析', icon: '📊', description: '打開手機 2 分鐘看完：營收、到課率、誰快到期、誰沒來。', demoUrl: '/p/demo/dashboard', demoLabel: 'Demo: 商家後台 Dashboard' },
    ],
  },
  {
    title: '📧 行銷自動化',
    color: '#22c55e',
    tags: [
      { id: 'email-auto', label: 'Email 自動化', icon: '📧', description: '歡迎信、訂單確認、VIP 升級恭喜、積分到期提醒、AI 流失挽回信。', demoUrl: '/admin/settings/notifications', demoLabel: 'Demo: 通知設定' },
      { id: 'cart-abandon', label: '購物車挽回', icon: '🛒', description: '加入購物車 1h 未結帳，自動發提醒 Email，附一次性折扣碼。', demoUrl: '/p/demo/dashboard', demoLabel: 'Demo: 挽回統計' },
      { id: 'sms-push', label: 'SMS 推播', icon: '📱', description: '訂單狀態更新、限時活動通知，搭配 Email 雙渠道觸達。CASL 合規。', demoUrl: '/admin/invites', demoLabel: 'Demo: SMS 發送記錄' },
      { id: 'dashboard', label: '商家後台', icon: '📊', description: '今日營收/訂單數/新會員、熱銷 Top 5、AI 流失預警名單、CSV 匯出。', demoUrl: '/p/demo/dashboard', demoLabel: 'Demo: 商家後台' },
      { id: 'blog', label: 'Blog / SEO', icon: '📝', description: '文章後台管理，SEO Meta + 結構化資料，文章分類與標籤管理。', demoUrl: '/blog', demoLabel: 'Demo: Blog 系統' },
    ],
  },
];

export default function QuotePage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const activeItem = CATEGORIES.flatMap(c => c.tags).find(t => t.id === activeTag);
  const activeCat = CATEGORIES.find(c => c.tags.some(t => t.id === activeTag));

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', color: '#ededf5', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(7,7,13,0.95)', backdropFilter: 'blur(10px)', zIndex: 50 }}>
        <div style={{ fontSize: '15px', fontWeight: 800 }}>
          <span style={{ color: '#f5c842' }}>ReplyWise</span> AI
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/p/playbook" style={{ fontSize: '12px', color: '#6b6b96', textDecoration: 'none' }}>📋 Playbook</a>
          <div style={{ fontSize: '10px', color: '#6b6b96', background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.2)', padding: '4px 10px', borderRadius: '99px' }}>
            INTERNAL
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '48px 24px 32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '12px' }}>
          電商網站 + <span style={{ color: '#f5c842' }}>AI 智能會員系統</span>
        </h1>
        <p style={{ fontSize: '14px', color: '#6b6b96', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
          點擊任何功能標籤，即可展示對應 Demo
        </p>
      </div>

      {/* All Categories with Tags */}
      <div style={{ padding: '0 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        {CATEGORIES.map(cat => (
          <div key={cat.title} style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: cat.color, marginBottom: '10px', letterSpacing: '0.5px' }}>
              {cat.title}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {cat.tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: activeTag === tag.id ? `1px solid ${cat.color}` : '1px solid rgba(255,255,255,0.08)',
                    background: activeTag === tag.id ? cat.color + '18' : 'rgba(255,255,255,0.03)',
                    color: activeTag === tag.id ? cat.color : '#9898b8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {tag.icon} {tag.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Active Tag Detail Panel */}
      {activeItem && activeCat && (
        <div style={{ padding: '0 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            background: activeCat.color + '0a',
            border: `1px solid ${activeCat.color}30`,
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                  {activeItem.icon} {activeItem.label}
                </div>
                <p style={{ fontSize: '14px', color: '#9898b8', lineHeight: 1.7, marginBottom: '16px' }}>
                  {activeItem.description}
                </p>
              </div>
              <a
                href={activeItem.demoUrl}
                target={activeItem.external ? '_blank' : '_self'}
                rel={activeItem.external ? 'noopener noreferrer' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: activeCat.color,
                  color: activeCat.color === '#f5c842' || activeCat.color === '#22c55e' ? '#080600' : '#fff',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {activeItem.external ? '🔗' : '🖥'} {activeItem.demoLabel} →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Pricing */}
      <div style={{ padding: '48px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#0f0f1a' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: '#f5c842', marginBottom: '8px' }}>方案報價</div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>按需求報價，0% 抽成</h2>
          <p style={{ fontSize: '12px', color: '#6b6b96' }}>建置費 3 期分付 · SMS 用量約 $0.01/封 · 不含 UI 設計費</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ background: '#14142a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b96', marginBottom: '6px', letterSpacing: '1px' }}>基礎官網</div>
            <div style={{ fontSize: '13px', color: '#9898b8', marginBottom: '16px', lineHeight: 1.5 }}>品牌形象站 · 服務介紹 · 聯絡表單</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#f5c842' }}>$2K–4K</div>
            <div style={{ fontSize: '12px', color: '#6b6b96', marginBottom: '16px' }}>建置費 · 月維護 $99–199</div>
            <div style={{ fontSize: '12px', color: '#9898b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>✅ RWD · SEO · GA4 · SSL</div>
            </div>
          </div>

          <div style={{ background: '#14142a', border: '1px solid rgba(245,200,66,0.25)', borderRadius: '14px', padding: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', background: '#f5c842', color: '#080600', fontSize: '9px', fontWeight: 800, padding: '3px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '0.5px' }}>常見選擇</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b6b96', marginBottom: '6px', letterSpacing: '1px' }}>+ 電商</div>
            <div style={{ fontSize: '13px', color: '#9898b8', marginBottom: '16px', lineHeight: 1.5 }}>Stripe 金流 · 商品管理 · 訂單後台</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#f5c842' }}>+$1K–5K</div>
            <div style={{ fontSize: '12px', color: '#6b6b96', marginBottom: '16px' }}>在基礎官網上加購 · 月維護 $199–399</div>
            <div style={{ fontSize: '12px', color: '#9898b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>✅ 商品+購物車+結帳</div>
              <div>✅ Apple Pay / Google Pay</div>
              <div>✅ 稅務自動計算</div>
            </div>
          </div>

          <div style={{ background: '#14142a', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', marginBottom: '6px', letterSpacing: '1px' }}>AI 會員系統</div>
            <div style={{ fontSize: '13px', color: '#9898b8', marginBottom: '16px', lineHeight: 1.5 }}>獨立 SaaS · 可單獨訂閱</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#8b5cf6' }}>$99<span style={{ fontSize: '14px', color: '#6b6b96' }}>/月</span></div>
            <div style={{ fontSize: '12px', color: '#6b6b96', marginBottom: '16px' }}>首 30 天免費試用</div>
            <div style={{ fontSize: '12px', color: '#9898b8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>✅ 堂數+預約+核銷</div>
              <div>✅ SMS 提醒+評論引導</div>
              <div>✅ 沉睡喚醒+數據分析</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', fontSize: '11px', color: '#6b6b96' }}>
        Internal use only · ReplyWise AI · {new Date().getFullYear()}
      </div>
    </div>
  );
}
