import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/admin/generate-reviews
 * Generate realistic sample reviews using AI based on store name & vertical
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storeName, vertical, rating, reviewCount } = await request.json();

    if (!storeName) {
      return NextResponse.json({ error: 'Store name required' }, { status: 400 });
    }

    const verticalLabels: Record<string, string> = {
      restaurant: '餐廳',
      hotel: '飯店/旅館',
      clinic: '診所/醫療',
      salon: '美容/美髮',
      retail: '零售店',
      fitness: '健身房',
    };

    const verticalLabel = verticalLabels[vertical] || '商家';

    const prompt = `你是一個 Google 評論模擬器。請為「${storeName}」（${verticalLabel}）生成 10 則逼真的 Google 評論。

要求：
- 評分分佈要自然：大約 3-4 則 5 星、2-3 則 4 星、1-2 則 3 星、1 則 2 星、1 則 1 星
${rating ? `- 這家店在 Google 上的實際評分是 ${rating} 分（${reviewCount || '?'} 則評論），請參考這個評分水準` : ''}
- 混合中文和英文評論（約 7:3）
- 每則評論要有不同的評論者名字（中英文混合）
- 內容要具體、有細節，像真人寫的（提到具體菜名、服務細節、環境等）
- 負面評論要具體說明問題（等太久、服務態度、品質不穩定等）
- 評論長度 20-80 字不等

請用以下 JSON 格式回覆（只回 JSON，不要其他文字）：
[
  {"author": "名字", "rating": 5, "content": "評論內容"},
  ...
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 2000,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '[]';

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const reviews = JSON.parse(jsonStr).map((r: any) => ({
      author: r.author || 'Anonymous',
      rating: Math.min(5, Math.max(1, r.rating || 5)),
      content: r.content || '',
      date: randomDateWithinDays(30),
    }));

    return NextResponse.json({ reviews });
  } catch (error: any) {
    console.error('[GenerateReviews]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function randomDateWithinDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * days));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d.toISOString();
}
