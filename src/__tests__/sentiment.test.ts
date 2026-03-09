import { describe, it, expect, vi } from 'vitest';

// Mock OpenAI API
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Must import after mocking fetch
const { analyzeSentiment, analyzeSentimentBatch } = await import('@/lib/sentiment');

describe('Sentiment Analysis', () => {
  it('falls back to rating-based heuristic when no API key', async () => {
    // OPENAI_API_KEY is not set in test env
    const result = await analyzeSentiment('Great food!', 5);
    expect(result.score).toBe(0.7);
    expect(result.label).toBe('positive');
    expect(result.emotions).toContain('satisfaction');
  });

  it('returns negative for low ratings', async () => {
    const result = await analyzeSentiment('Terrible service', 1);
    expect(result.score).toBe(-0.6);
    expect(result.label).toBe('negative');
    expect(result.emotions).toContain('disappointment');
  });

  it('returns neutral for rating 3', async () => {
    const result = await analyzeSentiment('It was okay', 3);
    expect(result.score).toBe(0);
    expect(result.label).toBe('neutral');
  });

  it('batch processes reviews with correct map keys', async () => {
    const reviews = [
      { id: 'uuid-1', content: 'Amazing!', rating: 5 },
      { id: 'uuid-2', content: 'Bad', rating: 1 },
    ];
    const results = await analyzeSentimentBatch(reviews, 2);
    expect(results.size).toBe(2);
    expect(results.has('uuid-1')).toBe(true);
    expect(results.has('uuid-2')).toBe(true);
    expect(results.get('uuid-1')!.label).toBe('positive');
    expect(results.get('uuid-2')!.label).toBe('negative');
  });
});
