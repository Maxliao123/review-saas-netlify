interface ReviewData {
  storeName: string;
  authorName: string;
  rating: number;
  content: string;
  dashboardUrl?: string;
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
  const isNegative = data.rating <= 3;
  const prefix = isNegative ? `${WARNING_EMOJI} Negative Review Alert` : 'New Review';

  if (lang === 'zh') {
    return [
      isNegative ? `${WARNING_EMOJI} 差評提醒` : '新評論通知',
      `店家: ${data.storeName}`,
      `評分: ${ratingStars(data.rating)}`,
      `評論者: ${data.authorName}`,
      `內容: ${data.content || '(無文字)'}`,
      data.dashboardUrl ? `管理後台: ${data.dashboardUrl}` : '',
    ].filter(Boolean).join('\n');
  }

  return [
    prefix,
    `Store: ${data.storeName}`,
    `Rating: ${ratingStars(data.rating)}`,
    `By: ${data.authorName}`,
    `Review: ${data.content || '(No text)'}`,
    data.dashboardUrl ? `Dashboard: ${data.dashboardUrl}` : '',
  ].filter(Boolean).join('\n');
}

// ============================================
// Email HTML
// ============================================

export function buildEmailHtml(data: ReviewData, lang = 'en'): { subject: string; html: string } {
  const isNegative = data.rating <= 3;

  const subject = lang === 'zh'
    ? `${isNegative ? '⚠️ 差評' : '📝 新評論'} - ${data.storeName} (${data.rating}星)`
    : `${isNegative ? '⚠️ Negative' : '📝 New'} Review - ${data.storeName} (${data.rating}★)`;

  const ratingColor = data.rating >= 4 ? '#16a34a' : data.rating >= 3 ? '#ca8a04' : '#dc2626';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="background: ${isNegative ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${isNegative ? '#fecaca' : '#bbf7d0'}; border-radius: 12px; padding: 24px; margin: 16px 0;">
        <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 18px;">
          ${isNegative ? '⚠️' : '📝'} ${lang === 'zh' ? (isNegative ? '差評提醒' : '新評論') : (isNegative ? 'Negative Review Alert' : 'New Review')}
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
        ${data.dashboardUrl ? `
        <a href="${data.dashboardUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
          ${lang === 'zh' ? '查看管理後台' : 'View Dashboard'} →
        </a>
        ` : ''}
      </div>
    </div>
  `;

  return { subject, html };
}

// ============================================
// Slack Block Kit
// ============================================

export function buildSlackBlocks(data: ReviewData): { text: string; blocks: any[] } {
  const isNegative = data.rating <= 3;

  return {
    text: `${isNegative ? '⚠️' : '📝'} ${data.rating}★ review at ${data.storeName} by ${data.authorName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${isNegative ? '⚠️ Negative Review' : '📝 New Review'} - ${data.storeName}`,
        },
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
      ...(data.dashboardUrl ? [{
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'View Dashboard' },
          url: data.dashboardUrl,
          style: isNegative ? 'danger' : 'primary',
        }],
      }] : []),
    ],
  };
}
