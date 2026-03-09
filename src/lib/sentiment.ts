/**
 * AI-powered sentiment analysis using GPT-4o-mini.
 * Extracts sentiment score, emotion tags, and key topics from review text.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface SentimentResult {
  score: number;       // -1.0 to 1.0
  label: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotions: string[];  // 1-3 dominant emotions
  topics: string[];    // 1-4 key topics
}

const SENTIMENT_SYSTEM_PROMPT = `You are a sentiment analysis engine for customer reviews. Analyze the review and return ONLY valid JSON with no extra text.

Output format:
{
  "score": <number from -1.0 to 1.0, where -1=very negative, 0=neutral, 1=very positive>,
  "label": "<positive|negative|neutral|mixed>",
  "emotions": ["<1-3 dominant emotions from: joy, gratitude, satisfaction, excitement, surprise, disappointment, frustration, anger, sadness, disgust, indifference>"],
  "topics": ["<1-4 key topics mentioned, e.g.: food quality, service speed, ambiance, cleanliness, value, wait time, staff friendliness, portion size>"]
}

Rules:
- score should reflect the OVERALL sentiment, not just the rating
- "mixed" label is for reviews with both strong positive and negative aspects
- emotions should be the most prominent feelings expressed
- topics should be concrete aspects the customer mentions
- Keep topic names short and consistent (lowercase, 2-3 words max)`;

export async function analyzeSentiment(
  content: string,
  rating: number
): Promise<SentimentResult> {
  if (!OPENAI_API_KEY) {
    // Fallback: derive from rating alone
    return ratingFallback(rating);
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SENTIMENT_SYSTEM_PROMPT },
          { role: 'user', content: `Rating: ${rating}/5\nReview: "${content}"` },
        ],
      }),
    });

    if (!resp.ok) {
      console.error(`Sentiment API error: ${resp.status}`);
      return ratingFallback(rating);
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return ratingFallback(rating);

    const parsed = JSON.parse(text);
    return {
      score: clamp(parsed.score ?? 0, -1, 1),
      label: validateLabel(parsed.label),
      emotions: Array.isArray(parsed.emotions) ? parsed.emotions.slice(0, 3) : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 4) : [],
    };
  } catch (err) {
    console.error('Sentiment analysis failed:', err);
    return ratingFallback(rating);
  }
}

/**
 * Batch analyze multiple reviews. Limits concurrency to avoid rate limits.
 */
export async function analyzeSentimentBatch(
  reviews: Array<{ id: string; content: string; rating: number }>,
  concurrency = 5
): Promise<Map<string, SentimentResult>> {
  const results = new Map<string, SentimentResult>();

  for (let i = 0; i < reviews.length; i += concurrency) {
    const batch = reviews.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (r) => {
        const result = await analyzeSentiment(r.content, r.rating);
        return { id: r.id, result };
      })
    );
    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
  }

  return results;
}

function ratingFallback(rating: number): SentimentResult {
  if (rating >= 4) return { score: 0.7, label: 'positive', emotions: ['satisfaction'], topics: [] };
  if (rating === 3) return { score: 0.0, label: 'neutral', emotions: ['indifference'], topics: [] };
  return { score: -0.6, label: 'negative', emotions: ['disappointment'], topics: [] };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function validateLabel(label: string): SentimentResult['label'] {
  if (['positive', 'negative', 'neutral', 'mixed'].includes(label)) {
    return label as SentimentResult['label'];
  }
  return 'neutral';
}
