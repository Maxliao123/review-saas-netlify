import { NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  const ctx = await getUserTenantContext();
  if (!ctx?.tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { negativeTopics, positiveTopics, categories, avgRating, totalReviews, negativePct } = body;

    const prompt = `You are a restaurant/business operations consultant. Based on the following customer review analytics data, provide 5 specific, actionable operational improvement suggestions.

DATA:
- Total reviews analyzed: ${totalReviews}
- Average rating: ${avgRating}/5
- Negative review percentage: ${negativePct}%

Top customer complaints (negative topics):
${(negativeTopics || []).map((t: any) => `- "${t.topic}" (${t.count} mentions)`).join('\n') || '- None'}

Top customer praises (positive topics):
${(positiveTopics || []).map((t: any) => `- "${t.topic}" (${t.count} mentions)`).join('\n') || '- None'}

Issue categories breakdown:
${(categories || []).map((c: any) => `- ${c.category}: ${c.count} reviews, avg ${c.avg_rating}★`).join('\n') || '- None'}

RULES:
1. Each suggestion must be specific and actionable (not generic like "improve service")
2. Prioritize by impact — address the most frequent complaints first
3. Leverage the positive aspects as competitive advantages
4. Include both quick wins and longer-term improvements
5. Reply in the same language as the topic names (if topics are in Chinese, reply in Chinese)

OUTPUT FORMAT: Return ONLY a JSON array of 5 strings, each being one suggestion. Example:
["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ suggestions: ['Unable to generate report. Please try again.'] });
    }

    let suggestions: string[];
    try {
      const parsed = JSON.parse(content);
      suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || parsed.data || [content]);
    } catch {
      suggestions = [content];
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('AI report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
