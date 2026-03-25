import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// Rate limit: 30 requests per minute per IP
const WEBHOOK_RATE_LIMIT = { limit: 30, windowSeconds: 60 };

/**
 * LINE Messaging API Webhook
 * Receives events when users add/block the bot, send messages, etc.
 *
 * Key events:
 * - follow: user added bot as friend
 * - unfollow: user blocked bot
 * - message: user sent a message (used for verification code)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(`line-webhook:${ip}`, WEBHOOK_RATE_LIMIT);
    if (!rateCheck.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Verify LINE signature
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    if (CHANNEL_SECRET && signature) {
      const hash = crypto
        .createHmac('SHA256', CHANNEL_SECRET)
        .update(body)
        .digest('base64');

      if (hash !== signature) {
        console.error('[LINE Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const data = JSON.parse(body);
    const events = data.events || [];

    for (const event of events) {
      const userId = event.source?.userId;
      if (!userId) continue;

      switch (event.type) {
        case 'follow': {
          // User added bot as friend — store their LINE user ID
          // Send welcome message with instructions
          await sendReply(event.replyToken, [
            {
              type: 'text',
              text: '🎉 歡迎使用 ReplyWise AI！\n\n請到系統的「設定 → 通知」頁面，輸入以下綁定碼來啟用 LINE 通知：',
            },
            {
              type: 'text',
              text: `您的 LINE ID：\n${userId}\n\n請複製此 ID 並貼到系統中。`,
            },
          ]);
          break;
        }

        case 'message': {
          const text = event.message?.text?.trim();
          if (!text) break;

          // Check if it's a verification code (6 digits)
          if (/^\d{6}$/.test(text)) {
            // Debug: check all records for this code
            const { data: allCodes, error: debugErr } = await supabaseAdmin
              .from('line_verifications')
              .select('*')
              .eq('code', text);
            console.log('[LINE Webhook] Code lookup:', text, 'found:', JSON.stringify(allCodes), 'error:', debugErr, 'now:', new Date().toISOString());

            // Look up pending verification
            const { data: pending, error: lookupErr } = await supabaseAdmin
              .from('line_verifications')
              .select('*')
              .eq('code', text)
              .eq('status', 'pending')
              .gte('expires_at', new Date().toISOString())
              .maybeSingle();
            console.log('[LINE Webhook] Filtered result:', JSON.stringify(pending), 'error:', lookupErr);

            if (pending) {
              // Mark as verified and save LINE user ID
              await supabaseAdmin
                .from('line_verifications')
                .update({ status: 'verified', line_user_id: userId })
                .eq('id', pending.id);

              // Create or update notification channel
              const { data: existingChannel } = await supabaseAdmin
                .from('notification_channels')
                .select('id')
                .eq('store_id', pending.store_id)
                .eq('channel_type', 'line')
                .maybeSingle();

              const channelConfig = {
                channel_access_token: CHANNEL_ACCESS_TOKEN,
                target_user_id: userId,
              };

              if (existingChannel) {
                await supabaseAdmin
                  .from('notification_channels')
                  .update({ config: channelConfig, is_active: true })
                  .eq('id', existingChannel.id);
              } else {
                await supabaseAdmin
                  .from('notification_channels')
                  .insert({
                    store_id: pending.store_id,
                    channel_type: 'line',
                    config: channelConfig,
                    is_active: true,
                  });
              }

              await sendReply(event.replyToken, [
                {
                  type: 'text',
                  text: '✅ 綁定成功！\n\n您的店家評論通知將會透過此 LINE 帳號發送。\n\n有新評論時，您會收到：\n• 評論內容 + AI 建議回覆\n• 一鍵核准或編輯連結\n\n全程不需要打開電腦 🎉',
                },
              ]);
            } else {
              await sendReply(event.replyToken, [
                {
                  type: 'text',
                  text: '❌ 驗證碼無效或已過期。\n\n請到系統的「設定 → 通知」頁面重新產生驗證碼。',
                },
              ]);
            }
          } else {
            // Not a verification code
            await sendReply(event.replyToken, [
              {
                type: 'text',
                text: '👋 我是 ReplyWise AI 通知機器人。\n\n如需綁定通知，請到系統的「設定 → 通知」頁面操作。\n\n如需協助，請聯繫客服。',
                },
            ]);
          }
          break;
        }

        case 'postback': {
          // Handle button taps from Flex Message cards
          const postbackData = event.postback?.data || '';
          const params = new URLSearchParams(postbackData);
          const action = params.get('action');
          const reviewId = params.get('reviewId');

          if (action === 'approve' && reviewId) {
            // Look up the review
            const { data: review } = await supabaseAdmin
              .from('reviews_raw')
              .select('id, reply_draft, reply_status, author_name, google_review_id, full_json, stores!inner(tenant_id, name)')
              .eq('id', reviewId)
              .single();

            if (!review) {
              await sendReply(event.replyToken, [{
                type: 'text',
                text: '❌ 找不到此評論。',
              }]);
              break;
            }

            if (review.reply_status === 'published' || review.reply_status === 'approved') {
              await sendReply(event.replyToken, [{
                type: 'text',
                text: '✅ 此評論回覆已經處理過了。',
              }]);
              break;
            }

            if (!review.reply_draft) {
              await sendReply(event.replyToken, [{
                type: 'text',
                text: '❌ 此評論尚無 AI 回覆草稿。',
              }]);
              break;
            }

            // Extract draft text
            let replyBody = review.reply_draft;
            try {
              const parsed = JSON.parse(replyBody);
              if (parsed.draft) replyBody = parsed.draft;
            } catch { /* use as-is */ }

            // Try publishing to Google
            let publishedToGoogle = false;
            const resourceName = review.full_json?.name;
            const store = review.stores as any;

            if (resourceName && store?.tenant_id) {
              try {
                const { getGoogleClientForTenant } = await import('@/lib/google-business');
                const client = await getGoogleClientForTenant(store.tenant_id);
                if (client) {
                  await client.oauth2Client.request({
                    method: 'PUT',
                    url: `https://mybusiness.googleapis.com/v4/${resourceName}/reply`,
                    data: { comment: replyBody },
                  });
                  publishedToGoogle = true;
                }
              } catch (e: any) {
                console.error('[LINE Postback] Google publish failed:', e.message);
              }
            }

            // Update review status
            const newStatus = publishedToGoogle ? 'published' : 'approved';
            await supabaseAdmin
              .from('reviews_raw')
              .update({
                reply_status: newStatus,
                ...(publishedToGoogle ? { published_at: new Date().toISOString() } : {}),
              })
              .eq('id', review.id);

            const statusMsg = publishedToGoogle
              ? `✅ 回覆已發布到 Google！\n\n📝 "${replyBody.substring(0, 100)}${replyBody.length > 100 ? '...' : ''}"`
              : `✅ 回覆已批准！\n\n將在下次同步時發布到 Google。\n\n📝 "${replyBody.substring(0, 100)}${replyBody.length > 100 ? '...' : ''}"`;

            await sendReply(event.replyToken, [{
              type: 'text',
              text: statusMsg,
            }]);
          }
          break;
        }

        case 'unfollow': {
          // User blocked bot — deactivate their notification channel
          const { data: channels } = await supabaseAdmin
            .from('notification_channels')
            .select('id')
            .eq('channel_type', 'line')
            .filter('config->>target_user_id', 'eq', userId);

          if (channels && channels.length > 0) {
            await supabaseAdmin
              .from('notification_channels')
              .update({ is_active: false })
              .in('id', channels.map(c => c.id));
          }
          break;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[LINE Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendReply(replyToken: string, messages: any[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}
