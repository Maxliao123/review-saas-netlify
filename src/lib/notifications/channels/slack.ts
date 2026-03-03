interface SlackConfig {
  webhook_url: string;
}

interface SlackMessage {
  text: string;
  blocks?: any[];
}

export async function sendSlack(config: SlackConfig, message: SlackMessage) {
  try {
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message.text,
        blocks: message.blocks,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return { success: false, error: `Slack ${res.status}: ${errorBody}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
