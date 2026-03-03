import type { WeeklyReportData } from './weekly-aggregator';

function trendArrow(trend: 'up' | 'down' | 'flat'): string {
  return trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
}

// ============================================
// Plain Text (for LINE / WhatsApp)
// ============================================

export function renderReportPlainText(data: WeeklyReportData, storeName: string, lang = 'en'): string {
  if (lang === 'zh') {
    return [
      `📊 週報 - ${storeName}`,
      `期間: ${data.period.start} ~ ${data.period.end}`,
      '',
      `⭐ 評論總覽`,
      `  新評論: ${data.reviews.total_new}`,
      `  平均評分: ${data.reviews.avg_rating} ${trendArrow(data.reviews.vs_last_week.rating_trend)}`,
      `  差評數: ${data.reviews.negative_count}`,
      `  回覆率: ${data.replies.reply_rate_pct}%`,
      '',
      data.top_complaints.length > 0 ? `⚠️ 主要投訴類別` : '',
      ...data.top_complaints.map(c => `  ${c.category}: ${c.count}次`),
      '',
      `📱 掃碼數據`,
      `  總掃碼: ${data.scans.total}`,
      `  QR: ${data.scans.by_source.qr || 0} | NFC: ${data.scans.by_source.nfc || 0}`,
      '',
      `✍️ 評論生成`,
      `  生成數: ${data.generation.reviews_generated}`,
      `  可能已發布: ${data.generation.likely_posted} (${data.generation.conversion_rate_pct}%)`,
    ].filter(Boolean).join('\n');
  }

  return [
    `📊 Weekly Report - ${storeName}`,
    `Period: ${data.period.start} to ${data.period.end}`,
    '',
    `⭐ Reviews`,
    `  New: ${data.reviews.total_new}`,
    `  Avg Rating: ${data.reviews.avg_rating} ${trendArrow(data.reviews.vs_last_week.rating_trend)}`,
    `  Negative: ${data.reviews.negative_count}`,
    `  Reply Rate: ${data.replies.reply_rate_pct}%`,
    '',
    data.top_complaints.length > 0 ? `⚠️ Top Complaints` : '',
    ...data.top_complaints.map(c => `  ${c.category}: ${c.count}`),
    '',
    `📱 Scans: ${data.scans.total}`,
    `  QR: ${data.scans.by_source.qr || 0} | NFC: ${data.scans.by_source.nfc || 0}`,
    '',
    `✍️ Generated: ${data.generation.reviews_generated} | Posted: ${data.generation.likely_posted} (${data.generation.conversion_rate_pct}%)`,
  ].filter(Boolean).join('\n');
}

// ============================================
// Email HTML
// ============================================

export function renderReportEmailHtml(data: WeeklyReportData, storeName: string, lang = 'en'): { subject: string; html: string } {
  const subject = lang === 'zh'
    ? `📊 ${storeName} 週報 (${data.period.start})`
    : `📊 ${storeName} Weekly Report (${data.period.start})`;

  const ratingColor = data.reviews.avg_rating >= 4 ? '#16a34a' : data.reviews.avg_rating >= 3 ? '#ca8a04' : '#dc2626';

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 16px 0;">
        <h1 style="margin: 0 0 4px; font-size: 20px;">📊 ${lang === 'zh' ? '週報' : 'Weekly Report'}</h1>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${storeName} &middot; ${data.period.start} ~ ${data.period.end}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">New Reviews</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700;">${data.reviews.total_new}</p>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Avg Rating</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: ${ratingColor};">${data.reviews.avg_rating} ${trendArrow(data.reviews.vs_last_week.rating_trend)}</p>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">Reply Rate</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700;">${data.replies.reply_rate_pct}%</p>
        </div>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">QR/NFC Scans</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700;">${data.scans.total}</p>
        </div>
      </div>

      ${data.top_complaints.length > 0 ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #991b1b;">⚠️ ${lang === 'zh' ? '主要投訴類別' : 'Top Complaint Categories'}</h3>
        ${data.top_complaints.map(c => `<p style="margin: 2px 0; font-size: 13px;">${c.category}: <strong>${c.count}</strong></p>`).join('')}
      </div>` : ''}

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #166534;">✍️ ${lang === 'zh' ? '評論生成' : 'Review Generation'}</h3>
        <p style="margin: 2px 0; font-size: 13px;">${lang === 'zh' ? '生成' : 'Generated'}: ${data.generation.reviews_generated} | ${lang === 'zh' ? '已發布' : 'Posted'}: ${data.generation.likely_posted} (${data.generation.conversion_rate_pct}%)</p>
      </div>
    </div>
  `;

  return { subject, html };
}
