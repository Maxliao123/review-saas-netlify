interface LineConfig {
  channel_access_token: string;
  target_user_id: string;
}

interface LineMessage {
  text: string;
}

export async function sendLine(config: LineConfig, message: LineMessage) {
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.channel_access_token}`,
      },
      body: JSON.stringify({
        to: config.target_user_id,
        messages: [
          {
            type: 'text',
            text: message.text,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return { success: false, error: `LINE API ${res.status}: ${errorBody}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
