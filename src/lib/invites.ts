/**
 * Review Invite System — send SMS or email invitations to customers,
 * linking them to the review generation flow.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomBytes } from 'crypto';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Twilio config
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || '';

// Email config (using Resend)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com';

export interface InviteInput {
  storeId: number;
  tenantId: string;
  channel: 'sms' | 'email';
  recipient: string; // phone or email
  recipientName?: string;
  storeSlug: string;
  storeName: string;
}

export interface InviteResult {
  success: boolean;
  inviteId?: number;
  error?: string;
}

function generateToken(): string {
  return randomBytes(16).toString('hex');
}

function buildInviteUrl(storeSlug: string, token: string): string {
  return `${BASE_URL}?store=${storeSlug}&invite=${token}`;
}

/**
 * Send a review invitation via SMS or email.
 */
export async function sendReviewInvite(input: InviteInput): Promise<InviteResult> {
  const token = generateToken();
  const inviteUrl = buildInviteUrl(input.storeSlug, token);

  // 1. Create invite record
  const { data: invite, error: dbError } = await supabaseAdmin
    .from('review_invites')
    .insert({
      store_id: input.storeId,
      tenant_id: input.tenantId,
      channel: input.channel,
      recipient: input.recipient,
      recipient_name: input.recipientName || null,
      invite_token: token,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (dbError || !invite) {
    return { success: false, error: dbError?.message || 'Failed to create invite' };
  }

  // 2. Send via channel
  try {
    if (input.channel === 'sms') {
      await sendSms(input.recipient, input.storeName, inviteUrl);
    } else {
      await sendEmail(input.recipient, input.recipientName, input.storeName, inviteUrl);
    }

    // Mark as delivered
    await supabaseAdmin
      .from('review_invites')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', invite.id);

    // Increment usage
    const yearMonth = new Date().toISOString().slice(0, 7);
    await supabaseAdmin.rpc('increment_usage', {
      p_tenant_id: input.tenantId,
      p_store_id: input.storeId,
      p_year_month: yearMonth,
      p_field: 'invites_sent',
    });

    return { success: true, inviteId: invite.id };
  } catch (err: any) {
    // Mark as failed
    await supabaseAdmin
      .from('review_invites')
      .update({ status: 'failed', error_message: err.message })
      .eq('id', invite.id);

    return { success: false, inviteId: invite.id, error: err.message };
  }
}

/**
 * Send SMS via Twilio.
 */
async function sendSms(to: string, storeName: string, inviteUrl: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    throw new Error('Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
  }

  const body = `Hi! Thanks for visiting ${storeName}. We'd love your feedback! Leave a quick review here: ${inviteUrl}`;

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.message || `Twilio error: ${resp.status}`);
  }
}

/**
 * Send email via Resend.
 */
async function sendEmail(
  to: string,
  recipientName: string | undefined,
  storeName: string,
  inviteUrl: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('Resend not configured (RESEND_API_KEY)');
  }

  const greeting = recipientName ? `Hi ${recipientName}` : 'Hi there';

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject: `How was your experience at ${storeName}?`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1f2937;">${greeting}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for visiting <strong>${storeName}</strong>. We'd love to hear about your experience!
          </p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 32px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Leave a Review
            </a>
          </p>
          <p style="color: #9ca3af; font-size: 12px;">
            It only takes 30 seconds. Your feedback helps us improve!
          </p>
        </div>
      `,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.message || `Resend error: ${resp.status}`);
  }
}

/**
 * Batch send invites.
 */
export async function sendBatchInvites(
  inputs: InviteInput[]
): Promise<InviteResult[]> {
  const results: InviteResult[] = [];
  for (const input of inputs) {
    const result = await sendReviewInvite(input);
    results.push(result);
  }
  return results;
}
