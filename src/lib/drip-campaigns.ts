/**
 * Drip Campaign System — automated follow-up emails (thank-you + 24h reminder)
 * for review invite recipients.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/notifications/channels/email';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// ── Schedule helpers ────────────────────────────────────────────────

/**
 * Schedule a thank-you email immediately after an invite is completed.
 */
export async function scheduleThankYouEmail(inviteId: number) {
  const { data: invite, error } = await supabaseAdmin
    .from('review_invites')
    .select('id, store_id, tenant_id, recipient, recipient_name')
    .eq('id', inviteId)
    .single();

  if (error || !invite) {
    console.error('scheduleThankYouEmail: invite not found', inviteId, error?.message);
    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from('drip_emails')
    .insert({
      store_id: invite.store_id,
      tenant_id: invite.tenant_id,
      email_type: 'thank_you',
      recipient_email: invite.recipient,
      recipient_name: invite.recipient_name || null,
      source_type: 'review_invite',
      source_id: String(invite.id),
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    // Unique constraint means it's already scheduled — not an error
    if (insertError.code === '23505') return;
    console.error('scheduleThankYouEmail: insert failed', insertError.message);
  }
}

/**
 * Schedule a 24-hour reminder email after an invite is sent.
 */
export async function scheduleReminderEmail(inviteId: number) {
  const { data: invite, error } = await supabaseAdmin
    .from('review_invites')
    .select('id, store_id, tenant_id, recipient, recipient_name')
    .eq('id', inviteId)
    .single();

  if (error || !invite) {
    console.error('scheduleReminderEmail: invite not found', inviteId, error?.message);
    return;
  }

  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabaseAdmin
    .from('drip_emails')
    .insert({
      store_id: invite.store_id,
      tenant_id: invite.tenant_id,
      email_type: 'reminder_24h',
      recipient_email: invite.recipient,
      recipient_name: invite.recipient_name || null,
      source_type: 'review_invite',
      source_id: String(invite.id),
      status: 'pending',
      scheduled_at: scheduledAt,
    })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') return;
    console.error('scheduleReminderEmail: insert failed', insertError.message);
  }
}

// ── Processing ──────────────────────────────────────────────────────

/**
 * Process all pending drip emails whose scheduled_at has passed.
 * Returns a summary of what was processed.
 */
export async function processPendingDrips(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
  log: string[];
}> {
  const now = new Date().toISOString();
  const log: string[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const { data: pending, error } = await supabaseAdmin
    .from('drip_emails')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(100);

  if (error) {
    log.push(`Error fetching pending drips: ${error.message}`);
    return { sent, skipped, failed, log };
  }

  if (!pending || pending.length === 0) {
    log.push('No pending drip emails to process.');
    return { sent, skipped, failed, log };
  }

  log.push(`Processing ${pending.length} pending drip email(s)...`);

  for (const drip of pending) {
    try {
      // For reminders, check if the invite was already completed — skip if so
      if (drip.email_type === 'reminder_24h' && drip.source_type === 'review_invite') {
        const { data: invite } = await supabaseAdmin
          .from('review_invites')
          .select('status')
          .eq('id', parseInt(drip.source_id))
          .single();

        if (invite?.status === 'completed') {
          await supabaseAdmin
            .from('drip_emails')
            .update({ status: 'skipped', sent_at: new Date().toISOString() })
            .eq('id', drip.id);
          skipped++;
          log.push(`[${drip.id}] Skipped reminder — invite already completed.`);
          continue;
        }
      }

      // Look up store name for email content
      const { data: store } = await supabaseAdmin
        .from('stores')
        .select('name, slug')
        .eq('id', drip.store_id)
        .single();

      const storeName = store?.name || 'our store';
      const storeSlug = store?.slug || '';

      let emailContent: { subject: string; html: string };

      if (drip.email_type === 'thank_you') {
        emailContent = buildThankYouEmail(storeName, drip.recipient_name);
      } else {
        const inviteUrl = `${BASE_URL}?store=${storeSlug}`;
        emailContent = buildReminderEmail(storeName, inviteUrl, drip.recipient_name);
      }

      const result = await sendEmail({
        recipients: [drip.recipient_email],
        subject: emailContent.subject,
        html: emailContent.html,
      });

      if (result.success) {
        await supabaseAdmin
          .from('drip_emails')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', drip.id);
        sent++;
        log.push(`[${drip.id}] Sent ${drip.email_type} to ${drip.recipient_email}.`);
      } else {
        await supabaseAdmin
          .from('drip_emails')
          .update({ status: 'failed', error_message: result.error || 'Unknown error' })
          .eq('id', drip.id);
        failed++;
        log.push(`[${drip.id}] Failed: ${result.error}`);
      }
    } catch (err: any) {
      await supabaseAdmin
        .from('drip_emails')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', drip.id);
      failed++;
      log.push(`[${drip.id}] Error: ${err.message}`);
    }
  }

  return { sent, skipped, failed, log };
}

// ── Email builders ──────────────────────────────────────────────────

/**
 * Build a thank-you email for a customer who completed a review.
 */
export function buildThankYouEmail(
  storeName: string,
  recipientName?: string | null
): { subject: string; html: string } {
  const greeting = recipientName ? `Hi ${recipientName}` : 'Hi there';

  return {
    subject: `Thank you for reviewing ${storeName}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1f2937;">${greeting}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          Thank you so much for taking the time to review <strong>${storeName}</strong>.
          Your feedback means the world to us and helps other customers make informed decisions.
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          We truly appreciate your support and look forward to serving you again!
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Warm regards,<br />
          The ${storeName} Team
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">
          Powered by ReplyWise AI
        </p>
      </div>
    `,
  };
}

/**
 * Build a reminder email for a customer who hasn't completed a review yet.
 */
export function buildReminderEmail(
  storeName: string,
  inviteUrl: string,
  recipientName?: string | null
): { subject: string; html: string } {
  const greeting = recipientName ? `Hi ${recipientName}` : 'Hi there';

  return {
    subject: `Quick reminder: Share your experience at ${storeName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1f2937;">${greeting}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          We noticed you haven't had a chance to leave a review for <strong>${storeName}</strong> yet.
          We'd really love to hear about your experience!
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Leave a Review
          </a>
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          It only takes 30 seconds, and your feedback helps us improve!
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
          Thank you,<br />
          The ${storeName} Team
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">
          Powered by ReplyWise AI
        </p>
      </div>
    `,
  };
}
