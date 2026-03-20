interface LineConfig {
  channel_access_token: string;
  target_user_id: string;
}

interface LineMessage {
  text?: string;
  flexMessage?: any; // LINE Flex Message object
}

/**
 * Build a Flex Message bubble card for a single review
 */
export function buildReviewBubble(review: {
  authorName: string;
  rating: number;
  content: string;
  aiDraft?: string;
  approveUrl?: string;
  editUrl?: string;
  reviewId?: string;
  storeName?: string;
}): any {
  const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const contentPreview = review.content.length > 80
    ? review.content.substring(0, 80) + '...'
    : review.content;
  const draftPreview = review.aiDraft
    ? (review.aiDraft.length > 60 ? review.aiDraft.substring(0, 60) + '...' : review.aiDraft)
    : '';

  const actions: any[] = [];

  // Approve button (postback — handled in-chat, no browser needed)
  if (review.reviewId) {
    actions.push({
      type: 'button',
      style: 'primary',
      color: '#16a34a',
      height: 'sm',
      action: {
        type: 'postback',
        label: '✅ 批准發布',
        data: `action=approve&reviewId=${review.reviewId}`,
        displayText: '✅ 批准此評論回覆',
      },
    });
  }

  // Edit button (opens browser)
  if (review.editUrl) {
    actions.push({
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: {
        type: 'uri',
        label: '✏️ 編輯回覆',
        uri: review.editUrl,
      },
    });
  }

  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: review.storeName || '新評論',
          weight: 'bold',
          size: 'sm',
          color: '#1f2937',
        },
        {
          type: 'text',
          text: stars,
          size: 'sm',
          margin: 'xs',
        },
      ],
      backgroundColor: review.rating >= 4 ? '#f0fdf4' : review.rating >= 3 ? '#fffbeb' : '#fef2f2',
      paddingAll: '12px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `👤 ${review.authorName}`,
          size: 'xs',
          color: '#6b7280',
        },
        {
          type: 'text',
          text: contentPreview,
          size: 'sm',
          color: '#374151',
          wrap: true,
          margin: 'sm',
        },
        ...(draftPreview ? [
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'text',
            text: '🤖 AI 建議回覆:',
            size: 'xs',
            color: '#2563eb',
            margin: 'md',
          },
          {
            type: 'text',
            text: draftPreview,
            size: 'xs',
            color: '#4b5563',
            wrap: true,
            margin: 'xs',
          },
        ] : []),
      ],
      paddingAll: '12px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: actions,
      paddingAll: '12px',
    },
  };
}

/**
 * Build a Flex Carousel message from multiple reviews
 */
export function buildReviewCarousel(reviews: Array<{
  authorName: string;
  rating: number;
  content: string;
  aiDraft?: string;
  approveUrl?: string;
  editUrl?: string;
  reviewId?: string;
  storeName?: string;
}>): any {
  // LINE carousel supports max 12 bubbles
  const bubbles = reviews.slice(0, 12).map(r => buildReviewBubble(r));

  return {
    type: 'flex',
    altText: `${reviews.length} 則新評論需要處理`,
    contents: bubbles.length === 1
      ? bubbles[0] // Single bubble, no carousel needed
      : {
          type: 'carousel',
          contents: bubbles,
        },
  };
}

export async function sendLine(config: LineConfig, message: LineMessage) {
  try {
    const messages: any[] = [];

    if (message.flexMessage) {
      messages.push(message.flexMessage);
    } else if (message.text) {
      messages.push({
        type: 'text',
        text: message.text,
      });
    }

    if (messages.length === 0) {
      return { success: false, error: 'No message content' };
    }

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.channel_access_token}`,
      },
      body: JSON.stringify({
        to: config.target_user_id,
        messages,
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
