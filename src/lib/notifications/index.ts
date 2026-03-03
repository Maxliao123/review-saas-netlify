import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from './channels/email';
import { sendLine } from './channels/line';
import { sendSlack } from './channels/slack';
import { sendWhatsApp } from './channels/whatsapp';
import { buildEmailHtml, buildPlainText, buildSlackBlocks } from './templates';

interface ReviewNotification {
  author_name: string;
  rating: number;
  content: string;
}

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
