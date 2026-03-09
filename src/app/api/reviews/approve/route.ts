import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleClientForTenant } from '@/lib/google-business';

export const dynamic = 'force-dynamic';

/**
 * One-click approve & publish endpoint.
 * Called from email/Slack/LINE notification links.
 * No login required — secured by cryptographic token.
 *
 * GET /api/reviews/approve?token=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return htmlResponse('error', 'Missing token', 'No approval token provided.');
    }

    // 1. Look up token
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('review_approve_tokens')
      .select('*, reviews_raw!inner(id, reply_draft, reply_status, google_review_id, full_json, author_name, stores!inner(tenant_id, name))')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRecord) {
      return htmlResponse('error', 'Invalid Token', 'This approval link is invalid or has already been used.');
    }

    // 2. Check expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return htmlResponse('error', 'Link Expired', 'This approval link has expired. Please approve from the dashboard instead.');
    }

    // 3. Check if already used
    if (tokenRecord.used_at) {
      return htmlResponse('info', 'Already Approved', 'This review has already been approved and published.');
    }

    const review = tokenRecord.reviews_raw;
    const store = review.stores;

    // 4. Check if review is still in approvable state
    if (review.reply_status === 'published') {
      return htmlResponse('info', 'Already Published', 'This reply has already been published.');
    }

    if (!review.reply_draft) {
      return htmlResponse('error', 'No Draft', 'No AI draft found for this review. Please compose a reply from the dashboard.');
    }

    // 5. Extract reply body from draft
    let replyBody = review.reply_draft;
    try {
      const parsed = JSON.parse(replyBody);
      if (parsed.draft) replyBody = parsed.draft;
    } catch {
      // Use as-is if not JSON
    }

    // 6. Publish to Google
    let publishedToGoogle = false;
    const resourceName = review.full_json?.name;

    if (resourceName && store.tenant_id) {
      try {
        const client = await getGoogleClientForTenant(store.tenant_id);
        if (client) {
          const url = `https://mybusiness.googleapis.com/v4/${resourceName}/reply`;
          await client.oauth2Client.request({
            method: 'PUT',
            url,
            data: { comment: replyBody },
          });
          publishedToGoogle = true;
        }
      } catch (publishErr: any) {
        console.error('[OneClickApprove] Google publish failed:', publishErr.message);
        // Still mark as approved even if Google publish fails — cron will retry
      }
    }

    // 7. Update review status
    const newStatus = publishedToGoogle ? 'published' : 'approved';
    await supabaseAdmin
      .from('reviews_raw')
      .update({
        reply_status: newStatus,
        ...(publishedToGoogle ? { published_at: new Date().toISOString() } : {}),
      })
      .eq('id', review.id);

    // 8. Mark token as used
    await supabaseAdmin
      .from('review_approve_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // 9. Return success page
    const statusMsg = publishedToGoogle
      ? 'Reply has been published to Google!'
      : 'Reply approved! It will be published in the next cron cycle.';

    return htmlResponse('success', 'Reply Approved', statusMsg, {
      storeName: store.name,
      authorName: review.author_name,
      replyPreview: replyBody.substring(0, 200),
    });

  } catch (error: any) {
    console.error('[OneClickApprove] Error:', error);
    return htmlResponse('error', 'Something Went Wrong', 'An unexpected error occurred. Please try approving from the dashboard.');
  }
}

/**
 * Returns a styled HTML page instead of JSON
 * (since this is opened from email/Slack links in a browser)
 */
function htmlResponse(
  type: 'success' | 'error' | 'info',
  title: string,
  message: string,
  meta?: { storeName?: string; authorName?: string; replyPreview?: string }
) {
  const colors = {
    success: { bg: '#f0fdf4', border: '#86efac', icon: '✅', accent: '#16a34a' },
    error: { bg: '#fef2f2', border: '#fca5a5', icon: '❌', accent: '#dc2626' },
    info: { bg: '#eff6ff', border: '#93c5fd', icon: 'ℹ️', accent: '#2563eb' },
  };

  const c = colors[type];
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_DOMAIN || 'http://localhost:3000';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Reputation Monitor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 480px; width: 100%; overflow: hidden; }
    .header { background: ${c.bg}; border-bottom: 1px solid ${c.border}; padding: 32px 24px; text-align: center; }
    .icon { font-size: 48px; margin-bottom: 12px; }
    .title { font-size: 22px; font-weight: 700; color: #1f2937; }
    .body { padding: 24px; }
    .message { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 20px; }
    .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #6b7280; }
    .meta strong { color: #374151; }
    .meta .preview { font-style: italic; margin-top: 8px; color: #4b5563; }
    .btn { display: inline-block; padding: 12px 24px; background: ${c.accent}; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; text-align: center; }
    .footer a { color: #6b7280; font-size: 12px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">${c.icon}</div>
      <div class="title">${title}</div>
    </div>
    <div class="body">
      <p class="message">${message}</p>
      ${meta ? `
      <div class="meta">
        ${meta.storeName ? `<div><strong>Store:</strong> ${meta.storeName}</div>` : ''}
        ${meta.authorName ? `<div><strong>Reviewer:</strong> ${meta.authorName}</div>` : ''}
        ${meta.replyPreview ? `<div class="preview">"${meta.replyPreview}${meta.replyPreview.length >= 200 ? '...' : ''}"</div>` : ''}
      </div>
      ` : ''}
      <a href="${dashboardUrl}/admin/reviews" class="btn">Go to Dashboard</a>
    </div>
    <div class="footer">
      <a href="${dashboardUrl}">Reputation Monitor</a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: type === 'error' ? 400 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
