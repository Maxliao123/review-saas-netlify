import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from './channels/email';
import { sendLine } from './channels/line';
import { sendSlack } from './channels/slack';
import { sendWhatsApp } from './channels/whatsapp';
import { buildEmailHtml, buildPlainText, buildSlackBlocks } from './templates';
import crypto from 'crypto';

interface ReviewNotification {
  author_name: string;
  rating: number;
  content: string;
}

interface UrgentReviewNotification extends ReviewNotification {
  /** The review UUID from reviews_raw */
  reviewId: string;
  /** AI-generated reply draft */
  aiDraft: string;
}

/**
 * Generate a one-click approve token and store it in DB.
 * Token expires in 72 hours.
 */
async function generateApproveToken(reviewId: string, storeId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72h

  await supabaseAdmin.from('review_approve_tokens').insert({
    token,
    review_id: reviewId,
    store_id: storeId,
    expires_at: expiresAt,
  });

  return token;
}

/**
 * Standard notification for new reviews (existing behavior).
 */
export async function notifyNewReview(storeId: number, review: ReviewNotification) {
  // Fetch store info
  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('name, tenant_id')
    .eq('id', storeId)
    .single();

  if (!store) return;

  // Fetch active notification channels for this store
  const { data: channels } = await supabaseAdmin
    .from('notification_channels')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (!channels || channels.length === 0) return;

  const isNegative = review.rating <= 3;
  const eventType = isNegative ? 'negative_review' : 'new_review';
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN || 'http://localhost:3000'}/admin/reviews`;

  const reviewData = {
    storeName: store.name,
    authorName: review.author_name,
    rating: review.rating,
    content: review.content,
    dashboardUrl,
  };

  // Dispatch to each active channel
  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      let result: { success: boolean; error?: string };

      switch (channel.channel_type) {
        case 'email': {
          const config = channel.config as { recipients?: string[] };
          if (!config.recipients?.length) return;
          const { subject, html } = buildEmailHtml(reviewData);
          result = await sendEmail({ recipients: config.recipients, subject, html });
          break;
        }

        case 'line': {
          const config = channel.config as { channel_access_token?: string; target_user_id?: string };
          if (!config.channel_access_token || !config.target_user_id) return;
          const text = buildPlainText(reviewData, 'zh');
          result = await sendLine(config as any, { text });
          break;
        }

        case 'slack': {
          const config = channel.config as { webhook_url?: string };
          if (!config.webhook_url) return;
          const slackMsg = buildSlackBlocks(reviewData);
          result = await sendSlack(config as any, slackMsg);
          break;
        }

        case 'whatsapp': {
          const config = channel.config as any;
          if (!config.phone_number || !config.account_sid) return;
          const body = buildPlainText(reviewData);
          result = await sendWhatsApp(config, { body });
          break;
        }

        default:
          return;
      }

      // Log the notification
      await supabaseAdmin.from('notification_log').insert({
        store_id: storeId,
        channel_type: channel.channel_type,
        event_type: eventType,
        payload: reviewData,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
      });
    })
  );

  return results;
}

/**
 * URGENT notification for 1-2 star reviews.
 * Includes AI draft and one-click approve link.
 * Sent with highest priority across ALL active channels.
 */
export async function notifyUrgentReview(storeId: number, review: UrgentReviewNotification) {
  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('name, tenant_id')
    .eq('id', storeId)
    .single();

  if (!store) return;

  const { data: channels } = await supabaseAdmin
    .from('notification_channels')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (!channels || channels.length === 0) return;

  // Generate one-click approve token
  const baseUrl = process.env.NEXT_PUBLIC_APP_DOMAIN || 'http://localhost:3000';
  const dashboardUrl = `${baseUrl}/admin/reviews`;

  let approveUrl: string | undefined;
  try {
    const token = await generateApproveToken(review.reviewId, storeId);
    approveUrl = `${baseUrl}/api/reviews/approve?token=${token}`;
  } catch (err) {
    console.error('Failed to generate approve token:', err);
    // Continue without approve URL — dashboard link still works
  }

  const reviewData = {
    storeName: store.name,
    authorName: review.author_name,
    rating: review.rating,
    content: review.content,
    dashboardUrl,
    aiDraft: review.aiDraft,
    approveUrl,
  };

  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      let result: { success: boolean; error?: string };

      switch (channel.channel_type) {
        case 'email': {
          const config = channel.config as { recipients?: string[] };
          if (!config.recipients?.length) return;
          const { subject, html } = buildEmailHtml(reviewData);
          result = await sendEmail({ recipients: config.recipients, subject, html });
          break;
        }

        case 'line': {
          const config = channel.config as { channel_access_token?: string; target_user_id?: string };
          if (!config.channel_access_token || !config.target_user_id) return;
          const text = buildPlainText(reviewData, 'zh');
          result = await sendLine(config as any, { text });
          break;
        }

        case 'slack': {
          const config = channel.config as { webhook_url?: string };
          if (!config.webhook_url) return;
          const slackMsg = buildSlackBlocks(reviewData);
          result = await sendSlack(config as any, slackMsg);
          break;
        }

        case 'whatsapp': {
          const config = channel.config as any;
          if (!config.phone_number || !config.account_sid) return;
          const body = buildPlainText(reviewData);
          result = await sendWhatsApp(config, { body });
          break;
        }

        default:
          return;
      }

      await supabaseAdmin.from('notification_log').insert({
        store_id: storeId,
        channel_type: channel.channel_type,
        event_type: 'urgent_negative_review',
        payload: reviewData,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
      });
    })
  );

  return results;
}
