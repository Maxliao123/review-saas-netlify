interface ReviewData {
  storeName: string;
  authorName: string;
  rating: number;
  content: string;
  dashboardUrl?: string;
  /** AI-generated reply draft (included in urgent alerts) */
  aiDraft?: string;
  /** One-click approve URL (token-based, no login required) */
  approveUrl?: string;
  /** Edit & publish URL (token-based, no login required) */
  editUrl?: string;
}

const STAR_EMOJI = '⭐';
const WARNING_EMOJI = '⚠️';

function ratingStars(rating: number): string {
  return STAR_EMOJI.repeat(rating) + '☆'.repeat(5 - rating);
}

// ============================================
// Plain text (shared base for LINE / WhatsApp)
// ============================================

export function buildPlainText(data: ReviewData, lang = 'en'): string {
  const isUrgent = data.rating <= 2;
  const isNegative = data.rating <= 3;
  const URGENT_EMOJI = '🚨';

  if (lang === 'zh') {
    return [
      isUrgent ? `${URGENT_EMOJI} 緊急差評警報` : isNegative ? `${WARNING_EMOJI} 差評提醒` : '新評論通知',
      `店家: ${data.storeName}`,
      `評分: ${ratingStars(data.rating)}`,
      `評論者: ${data.authorName}`,
      `內容: ${data.content || '(無文字)'}`,
      data.aiDraft ? `\n🤖 AI建議回覆:\n${data.aiDraft}` : '',
      data.approveUrl ? `\n✅ 一鍵批准: ${data.approveUrl}` : '',
      data.editUrl ? `✏️ 編輯後發布: ${data.editUrl}` : '',
      data.dashboardUrl ? `管理後台: ${data.dashboardUrl}` : '',
    ].filter(Boolean).join('\n');
  }

  return [
    isUrgent ? `${URGENT_EMOJI} URGENT: Negative Review Alert` : isNegative ? `${WARNING_EMOJI} Negative Review Alert` : 'New Review',
    `Store: ${data.storeName}`,
    `Rating: ${ratingStars(data.rating)}`,
    `By: ${data.authorName}`,
    `Review: ${data.content || '(No text)'}`,
    data.aiDraft ? `\n🤖 AI Suggested Reply:\n${data.aiDraft}` : '',
    data.approveUrl ? `\n✅ Approve & Publish: ${data.approveUrl}` : '',
    data.editUrl ? `✏️ Edit & Publish: ${data.editUrl}` : '',
    data.dashboardUrl ? `Dashboard: ${data.dashboardUrl}` : '',
  ].filter(Boolean).join('\n');
}

// ============================================
// Email HTML
// ============================================

export function buildEmailHtml(data: ReviewData, lang = 'en'): { subject: string; html: string } {
  const isNegative = data.rating <= 2;
  const isUrgent = isNegative && !!data.aiDraft;

  const subject = isUrgent
    ? (lang === 'zh'
      ? `🚨 緊急差評 - ${data.storeName} (${data.rating}星) — 需要立即回覆`
      : `🚨 URGENT: ${data.rating}★ Review - ${data.storeName} — Reply Required`)
    : (lang === 'zh'
      ? `${data.rating <= 3 ? '⚠️ 差評' : '📝 新評論'} - ${data.storeName} (${data.rating}星)`
      : `${data.rating <= 3 ? '⚠️ Negative' : '📝 New'} Review - ${data.storeName} (${data.rating}★)`);

  const ratingColor = data.rating >= 4 ? '#16a34a' : data.rating >= 3 ? '#ca8a04' : '#dc2626';
  const bgColor = isUrgent ? '#fef2f2' : data.rating <= 3 ? '#fffbeb' : '#f0fdf4';
  const borderColor = isUrgent ? '#fca5a5' : data.rating <= 3 ? '#fde68a' : '#bbf7d0';

  const aiDraftSection = data.aiDraft ? `
        <div style="margin: 16px 0; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <p style="margin: 0 0 8px; color: #374151; font-weight: 600; font-size: 13px;">
            ${lang === 'zh' ? '🤖 AI 建議回覆：' : '🤖 AI Suggested Reply:'}
          </p>
          <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
            ${data.aiDraft}
          </p>
        </div>
  ` : '';

  const approveButton = data.approveUrl ? `
        <a href="${data.approveUrl}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; margin-right: 8px;">
          ${lang === 'zh' ? '✅ 一鍵批准發布' : '✅ Approve & Publish'}
        </a>
  ` : '';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto;">
      ${isUrgent ? `
      <div style="background: #dc2626; color: white; padding: 8px 16px; border-radius: 8px 8px 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
        🚨 ${lang === 'zh' ? '緊急 — 需要立即處理' : 'URGENT — Immediate Action Required'}
      </div>
      ` : ''}
      <div style="background: ${bgColor}; border: 1px solid ${borderColor}; ${isUrgent ? 'border-top: none; border-radius: 0 0 12px 12px;' : 'border-radius: 12px;'} padding: 24px; margin: ${isUrgent ? '0' : '16px'} 0 16px;">
        <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 18px;">
          ${isUrgent ? '🚨' : data.rating <= 3 ? '⚠️' : '📝'} ${lang === 'zh' ? (isUrgent ? '差評警報' : data.rating <= 3 ? '差評提醒' : '新評論') : (isUrgent ? 'Negative Review Alert' : data.rating <= 3 ? 'Low Rating Review' : 'New Review')}
        </h2>
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
          ${data.storeName}
        </p>
        <div style="font-size: 24px; color: ${ratingColor}; margin: 8px 0;">
          ${ratingStars(data.rating)}
        </div>
        <p style="margin: 8px 0 4px; color: #374151; font-weight: 600;">
          ${data.authorName}
        </p>
        <p style="margin: 4px 0 16px; color: #4b5563; font-style: italic; line-height: 1.5;">
          "${data.content || (lang === 'zh' ? '(無文字評論)' : '(No text review)')}"
        </p>
        ${aiDraftSection}
        <div style="margin-top: 16px;">
          ${approveButton}
          ${data.editUrl ? `
          <a href="${data.editUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
            ${lang === 'zh' ? '✏️ 編輯後發布' : '✏️ Edit & Publish'}
          </a>
          ` : data.dashboardUrl ? `
          <a href="${data.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
            ${lang === 'zh' ? '編輯回覆' : 'Edit Reply'} →
          </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  return { subject, html };
}

// ============================================
// Slack Block Kit
// ============================================

export function buildSlackBlocks(data: ReviewData): { text: string; blocks: any[] } {
  const isUrgent = data.rating <= 2;
  const isNegative = data.rating <= 3;

  const headerText = isUrgent
    ? `🚨 URGENT: ${data.rating}★ Review - ${data.storeName}`
    : isNegative
      ? `⚠️ Negative Review - ${data.storeName}`
      : `📝 New Review - ${data.storeName}`;

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: headerText },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Rating:*\n${ratingStars(data.rating)}` },
        { type: 'mrkdwn', text: `*Author:*\n${data.authorName}` },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `> _${data.content || '(No text)'}_`,
      },
    },
  ];

  // AI draft section
  if (data.aiDraft) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🤖 *AI Suggested Reply:*\n${data.aiDraft}`,
        },
      }
    );
  }

  // Action buttons
  const buttons: any[] = [];
  if (data.approveUrl) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: '✅ Approve & Publish' },
      url: data.approveUrl,
      style: 'primary',
    });
  }
  if (data.editUrl) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: '✏️ Edit & Publish' },
      url: data.editUrl,
    });
  }
  if (data.dashboardUrl) {
    buttons.push({
      type: 'button',
      text: { type: 'plain_text', text: '📋 View Dashboard' },
      url: data.dashboardUrl,
    });
  }
  if (buttons.length > 0) {
    blocks.push({ type: 'actions', elements: buttons });
  }

  return {
    text: `${isUrgent ? '🚨' : isNegative ? '⚠️' : '📝'} ${data.rating}★ review at ${data.storeName} by ${data.authorName}`,
    blocks,
  };
}
