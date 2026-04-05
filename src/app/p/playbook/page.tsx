'use client';

import { useState } from 'react';

const SECTIONS = [
  {
    id: 'prep',
    title: '會前準備',
    icon: '📋',
    items: [
      { type: 'check', text: 'Twilio 帳號能發 SMS（發一則給自己測試）' },
      { type: 'check', text: 'npm run dev 跑起來確認頁面正常' },
      { type: 'check', text: '手機開 /m/[token] 確認 PWA 頁面' },
      { type: 'check', text: 'v6 報價頁在手機上排版正常' },
      { type: 'check', text: '筆記本 or 手機備忘錄準備好' },
    ],
  },
  {
    id: 'flow',
    title: '30 分鐘流程',
    icon: '⏱',
    items: [
      { type: 'phase', time: '00-05', label: '破冰', color: '#22c55e', content: '「你做花藝多久了？學員都是什麼人？」\n輕鬆聊，不談產品。' },
      { type: 'phase', time: '05-15', label: '問問題（最重要）', color: '#f5c842', content: '用下方的 6 個問題，記下她的每個回答。\n不要推銷，只要聽。' },
      { type: 'phase', time: '15-22', label: '展示 Demo', color: '#3b82f6', content: '只展示她剛才提到的痛點。\n最多 3 個功能。\n用手機打開 Demo 連結。' },
      { type: 'phase', time: '22-27', label: '方案建議', color: '#8b5cf6', content: '「我建議做官網+電商，大概 $5-8K 建置。\n會員系統另外 $99/月，先免費試 30 天。\n我回去整理報價單給你。」' },
      { type: 'phase', time: '27-30', label: '收尾', color: '#14b8a6', content: '約下次會議時間（3-5 天後）\n問她有沒有素材（Logo/照片/色碼）\n「報價單我下週給你，你考慮一下就好。」' },
    ],
  },
  {
    id: 'questions',
    title: '6 個必問問題',
    icon: '💬',
    items: [
      {
        type: 'question',
        q: '你現在怎麼管學員的課程堂數？',
        listen: 'Excel / 紙本 / 腦子記 → 「這個我的系統可以自動管」',
        demo: '會員餘額頁',
        tag: 'credits',
      },
      {
        type: 'question',
        q: '學員怎麼預約上課？',
        listen: 'LINE / 微信 / 電話 → 「你每天花多少時間回覆？」',
        demo: '線上預約流程',
        tag: 'booking',
      },
      {
        type: 'question',
        q: '有沒有學員買了堂數但很久沒來？',
        listen: '大概率「有，很多」→ 「系統 30 天沒來自動提醒」',
        demo: '沉睡客戶清單',
        tag: 'dormant',
      },
      {
        type: 'question',
        q: '你的 Google Review 有幾顆星？幾則評論？',
        listen: '少 → 「自動邀請學員評論」/ 多 → 「手動請的吧？很花時間」',
        demo: '問卷→評論引導',
        tag: 'review',
      },
      {
        type: 'question',
        q: '你現在有網站嗎？用什麼賣東西？',
        listen: '沒有 / IG 賣 / Shopify → 判斷她的起點',
        demo: '報價頁',
        tag: 'website',
      },
      {
        type: 'question',
        q: '如果有個系統幫你管堂數+預約+提醒+評論，你覺得一個月值多少錢？',
        listen: '⚠️ 不要先報價。聽她說的數字。記下來。',
        demo: '',
        tag: 'pricing',
      },
    ],
  },
  {
    id: 'donts',
    title: '不要說的事',
    icon: '🚫',
    items: [
      { type: 'dont', text: '不要提 B2B / ERP / 多倉庫 → 她聽不懂也不需要' },
      { type: 'dont', text: '不要提 Enterprise 方案 → 只說 Starter 或簡化版' },
      { type: 'dont', text: '不要提 Mangomint / Vagaro / Fresha → 她不認識' },
      { type: 'dont', text: '不要把 100 個功能全講 → 只講她的痛點' },
      { type: 'dont', text: '不要一開始就報價 → 先聽痛點' },
      { type: 'dont', text: '不要當場要她決定 → 給她時間考慮' },
      { type: 'dont', text: '不要說「AI」→ 說「系統自動幫你」更好懂' },
    ],
  },
  {
    id: 'objections',
    title: '她可能的反對意見',
    icon: '🛡',
    items: [
      {
        type: 'objection',
        say: '太貴了',
        reply: '「你覺得合理的範圍是多少？」\n聽她說 → 差距 <20% 可小讓步 → 差距 >30% 降功能不降價',
      },
      {
        type: 'objection',
        say: 'Shopify 比較便宜',
        reply: '「Shopify 月費 $49，但加 Loyalty App + Email App + AI = $200+/月。\n而且沒有堂數管理，數據也不屬於你。\n算 12 個月總成本其實差不多。」',
      },
      {
        type: 'objection',
        say: '我再想想',
        reply: '「沒問題，我下週把報價單整理好給你。\n會員系統你也可以先免費試 30 天看看。」\n→ 不要追，給她空間',
      },
      {
        type: 'objection',
        say: '我不需要會員系統',
        reply: '「完全可以，我們先做電商網站就好。\n會員系統未來想加隨時可以接上去。」\n→ 不硬推，先收建置費',
      },
      {
        type: 'objection',
        say: '我朋友可以幫我做更便宜',
        reply: '「如果你信任他的技術，那也是好選擇。\n我的優勢是後續維護和 AI 會員系統，\n這部分你朋友可能不容易做到。」',
      },
    ],
  },
  {
    id: 'after',
    title: '會後行動',
    icon: '✅',
    items: [
      { type: 'action', text: '當天：整理她說的痛點和答案' },
      { type: 'action', text: '1-2 天內：做報價單 PDF（一頁紙）' },
      { type: 'action', text: '3 天內：Email/LINE 發報價單 + 一句話' },
      { type: 'action', text: '她不回：3 天後跟一次，不追太多' },
      { type: 'action', text: '她說 OK：收首期款 40% → 開工' },
    ],
  },
];

export default function PlaybookPage() {
  const [openSection, setOpenSection] = useState<string>('flow');

  return (
    <div style={{ minHeight: '100vh', background: '#07070d', color: '#ededf5', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 800 }}>
          <span style={{ color: '#f5c842' }}>ReplyWise</span> AI
        </div>
        <div style={{ fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 12px', borderRadius: '99px', fontWeight: 700 }}>
          🔒 CONFIDENTIAL · 溝通 Playbook
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '48px 32px 32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '8px' }}>花藝客戶溝通 Playbook</h1>
        <p style={{ fontSize: '14px', color: '#6b6b96' }}>30 分鐘會議的完整劇本</p>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px 64px' }}>
        {SECTIONS.map(section => (
          <div key={section.id} style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setOpenSection(openSection === section.id ? '' : section.id)}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: openSection === section.id ? '#14142a' : '#0f0f1a',
                border: openSection === section.id ? '1px solid rgba(245,200,66,0.2)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: openSection === section.id ? '14px 14px 0 0' : '14px',
                color: '#ededf5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '16px',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '20px' }}>{section.icon}</span>
              {section.title}
              <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#6b6b96' }}>
                {openSection === section.id ? '▲' : '▼'}
              </span>
            </button>

            {openSection === section.id && (
              <div style={{
                background: '#14142a',
                border: '1px solid rgba(245,200,66,0.2)',
                borderTop: 'none',
                borderRadius: '0 0 14px 14px',
                padding: '20px 24px',
              }}>
                {section.items.map((item: any, i) => {
                  if (item.type === 'check') {
                    return (
                      <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#9898b8', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginTop: '3px' }} />
                        {item.text}
                      </label>
                    );
                  }
                  if (item.type === 'phase') {
                    return (
                      <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-start' }}>
                        <div style={{
                          minWidth: '52px',
                          height: '28px',
                          background: item.color + '20',
                          border: `1px solid ${item.color}40`,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: item.color,
                        }}>
                          {item.time}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: item.color }}>{item.label}</div>
                          <pre style={{ fontSize: '13px', color: '#9898b8', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{item.content}</pre>
                        </div>
                      </div>
                    );
                  }
                  if (item.type === 'question') {
                    return (
                      <div key={i} style={{ marginBottom: '20px', padding: '16px', background: 'rgba(245,200,66,0.04)', border: '1px solid rgba(245,200,66,0.1)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                          Q{i + 1}. 「{item.q}」
                        </div>
                        <div style={{ fontSize: '13px', color: '#22c55e', marginBottom: '6px' }}>
                          👂 聽：{item.listen}
                        </div>
                        {item.demo && (
                          <div style={{ fontSize: '12px', color: '#6b6b96' }}>
                            📱 可展示：{item.demo}
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (item.type === 'dont') {
                    return (
                      <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '14px', color: '#ef4444' }}>
                        <span>✗</span> {item.text}
                      </div>
                    );
                  }
                  if (item.type === 'objection') {
                    return (
                      <div key={i} style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#ef4444' }}>
                          她說：「{item.say}」
                        </div>
                        <pre style={{ fontSize: '13px', color: '#22c55e', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                          你回：{item.reply}
                        </pre>
                      </div>
                    );
                  }
                  if (item.type === 'action') {
                    return (
                      <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#9898b8', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ marginTop: '3px' }} />
                        {item.text}
                      </label>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        ))}

        {/* Quick Links */}
        <div style={{ marginTop: '32px', padding: '24px', background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>🔗 快速連結</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <a href="/p/quote" style={{ color: '#f5c842', textDecoration: 'none' }}>→ 報價頁（含痛點 Tag + Demo）</a>
            <a href="/m/3fd7ed1f3595a5b4cb8274fe0ac2d4a5" target="_blank" style={{ color: '#3b82f6', textDecoration: 'none' }}>→ Demo: Anna 會員首頁（VIP, 2堂剩）</a>
            <a href="/m/298616a636ee565774a3a61b24984009" target="_blank" style={{ color: '#3b82f6', textDecoration: 'none' }}>→ Demo: Mary 會員首頁（7堂剩）</a>
            <a href="/admin/verify" target="_blank" style={{ color: '#3b82f6', textDecoration: 'none' }}>→ Demo: 核銷頁面（code: 483291）</a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '24px 32px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', fontSize: '11px', color: '#6b6b96' }}>
        🔒 Confidential · Do not share · ReplyWise AI · {new Date().getFullYear()}
      </div>
    </div>
  );
}
