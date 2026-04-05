/**
 * SMS sending utility via Twilio
 * Reuses pattern from lib/invites.ts WhatsApp channel
 */

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || '';

interface SendSMSInput {
  to: string;
  body: string;
}

interface SendSMSResult {
  success: boolean;
  sid?: string;
  error?: string;
}

export async function sendSMS({ to, body }: SendSMSInput): Promise<SendSMSResult> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.error('Twilio credentials not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  const formatted = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;

  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formatted,
          From: TWILIO_FROM,
          Body: body,
        }),
      }
    );

    if (!resp.ok) {
      const err = await resp.json();
      return { success: false, error: err.message || `Twilio error: ${resp.status}` };
    }

    const data = await resp.json();
    return { success: true, sid: data.sid };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Send member portal link via SMS
 */
export async function sendMemberLink(phone: string, storeName: string, memberToken: string): Promise<SendSMSResult> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.replywiseai.com';
  const link = `${baseUrl}/m/${memberToken}`;

  const body = `Hi! Welcome to ${storeName}. View your membership, book appointments & more: ${link}\n\nReply STOP to unsubscribe.`;

  return sendSMS({ to: phone, body });
}

/**
 * Send booking reminder SMS
 */
export async function sendBookingReminder(
  phone: string,
  memberName: string,
  storeName: string,
  serviceName: string,
  dateTime: string,
  memberToken: string,
  preVisitNotes?: string
): Promise<SendSMSResult> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.replywiseai.com';
  const link = `${baseUrl}/m/${memberToken}`;

  let body = `Hi ${memberName}, reminder: ${serviceName} at ${storeName} tomorrow ${dateTime}. Details: ${link}`;
  if (preVisitNotes) {
    body += `\nNote: ${preVisitNotes}`;
  }
  body += '\nReply C to cancel.\nReply STOP to unsubscribe.';

  return sendSMS({ to: phone, body });
}

/**
 * Send post-visit feedback invitation SMS
 */
export async function sendFeedbackInvite(
  phone: string,
  memberName: string,
  storeName: string,
  bookingId: string,
  memberToken: string,
  pointsReward: number = 50
): Promise<SendSMSResult> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.replywiseai.com';
  const link = `${baseUrl}/m/${memberToken}/feedback/${bookingId}`;

  const body = `Hi ${memberName}, thanks for visiting ${storeName}! Share your feedback & earn ${pointsReward} points: ${link}\nReply STOP to unsubscribe.`;

  return sendSMS({ to: phone, body });
}
