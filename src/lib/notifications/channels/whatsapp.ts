interface WhatsAppConfig {
  phone_number: string;
  provider: 'twilio';
  account_sid: string;
  auth_token: string;
}

interface WhatsAppMessage {
  body: string;
}

export async function sendWhatsApp(config: WhatsAppConfig, message: WhatsAppMessage) {
  try {
    // Twilio WhatsApp API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('To', `whatsapp:${config.phone_number}`);
    formData.append('From', `whatsapp:+14155238886`); // Twilio sandbox number, replace with your number in production
    formData.append('Body', message.body);

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${config.account_sid}:${config.auth_token}`).toString('base64')}`,
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return { success: false, error: `Twilio ${res.status}: ${errorBody}` };
    }

    const data = await res.json();
    return { success: true, sid: data.sid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
