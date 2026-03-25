import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

interface EmailNotification {
  recipients: string[];
  subject: string;
  html: string;
}

export async function sendEmail({ recipients, subject, html }: EmailNotification) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email notification');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: 'ReplyWise AI <notifications@resend.dev>',
      to: recipients,
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
