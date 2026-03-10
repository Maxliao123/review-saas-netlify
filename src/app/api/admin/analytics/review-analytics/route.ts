import { NextResponse } from 'next/server';
import { getUserTenantContext, createSupabaseServerClient } from '@/lib/supabase/server';

/* ───────── Stop words for keyword extraction ───────── */

const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','can','shall',
  'to','of','in','for','on','with','at','by','from','as','into','through',
  'during','before','after','above','below','between','out','off','over','under',
  'again','further','then','once','here','there','when','where','why','how',
  'all','each','every','both','few','more','most','other','some','such','no',
  'not','only','own','same','so','than','too','very','just','because','but',
  'and','or','if','while','about','up','down','its','it','me','my','we',
  'our','you','your','he','she','his','her','they','them','their','this',
  'that','these','those','am','what','which','who','whom','also','really',
  'got','get','go','going','went','come','came','one','two','like','much',
  'back','even','well','still','way','take','make','made','know','see',
  'thing','things','time','don','doesn','didn','won','wouldn','couldn',
  'shouldn','haven','hasn','hadn','isn','aren','wasn','weren','let','say',
  'said','tell','told','think','thought','want','wanted','need','needed',
  'try','tried','use','used','look','looked','give','gave','put','keep',
  'kept','set','seem','seemed','leave','left','call','called','ask','asked',
  'definitely','absolutely','probably','always','never','ever','bit','lot',
  'many','new','first','last','long','little','big','old','right','high',
  'been','being','had','has','have','having','these','those','there','here',
  'translated','google',
]);

const CHINESE_STOP = new Set([
  '的','了','在','是','我','有','和','就','不','人','都','一','上','也','很',
  '到','說','要','去','你','會','著','沒有','看','自己','這','他','她','它',
  '們','那','些','什麼','怎麼','可以','沒','過','得','吧','被','把','啊',
  '呢','嗎','來','但','而','或','如果','因為','所以','雖然','然後','個',
  '能','對','讓','比','從','下','大','小','多','少','好','更','已','經',
]);

/* ───────── Tokenizer: English words + Chinese bigrams ───────── */

function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // English words (3+ lowercase letters, not in stop list)
  const cleaned = text.toLowerCase().replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
  for (const w of cleaned.split(/\s+/)) {
    if (w.length >= 3 && /^[a-z]+$/.test(w) && !STOP_WORDS.has(w)) {
      tokens.push(w);
    }
  }

  // Chinese bigrams (2-char combos, filter stop chars)
  const cn = text.replace(/[^\u4e00-\u9fff\u3400-\u4dbf]/g, '');
  for (let i = 0; i < cn.length - 1; i++) {
    const bi = cn.slice(i, i + 2);
    if (!CHINESE_STOP.has(bi) && !CHINESE_STOP.has(bi[0]) && !CHINESE_STOP.has(bi[1])) {
      tokens.push(bi);
    }
  }

  return tokens;
}

/* ───────── Complaint categories (based on Compensation & Apology Guidelines) ───────── */

interface ComplaintCategory {
  key: string;
  label: string;
  labelZh: string;
  icon: string;           // emoji for quick visual
  severity: 'low' | 'medium' | 'high' | 'critical';
  compensation: string;   // reference range
  patterns: RegExp;       // combined EN + ZH pattern
}

const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  {
    key: 'food_quality',
    label: 'Food Quality',
    labelZh: '食物品質',
    icon: '🍽️',
    severity: 'medium',
    compensation: '$5–$50',
    patterns: /\b(taste|tasteless|bland|salty|spicy|flavor|flavour|overcooked|undercooked|burnt|raw|cold food|stale|not fresh|sour smell|spoiled|quality|tough|dry|greasy|oily|mushy|rubbery|chewy)\b|味道|口味|太鹹|太淡|太辣|不新鮮|品質|過熟|沒熟|生的|油膩|難吃|不好吃|冷掉/i,
  },
  {
    key: 'wrong_missing',
    label: 'Wrong / Missing Items',
    labelZh: '餐點錯誤/缺少',
    icon: '❌',
    severity: 'medium',
    compensation: '$5–meal value',
    patterns: /\b(wrong order|wrong item|missing item|missing food|forgot|incorrect order|wrong soup|missing ingredient|wrong dish|didn.t receive|never received|incomplete|not what i ordered|entire order wrong)\b|錯誤|少了|缺少|沒有附|漏掉|送錯|點錯|不見|遺漏/i,
  },
  {
    key: 'service',
    label: 'Poor Service',
    labelZh: '服務態度差',
    icon: '😤',
    severity: 'high',
    compensation: '$20–$30',
    patterns: /\b(rude|unfriendly|unprofessional|inattentive|ignored|attitude|disrespectful|impolite|dismissive|poor service|bad service|terrible service|no help|not helpful|careless|condescending)\b|態度|服務差|不禮貌|沒禮貌|兇|無禮|服務態度|冷淡|白眼|不理人/i,
  },
  {
    key: 'wait_time',
    label: 'Long Wait Time',
    labelZh: '等待時間長',
    icon: '⏳',
    severity: 'medium',
    compensation: '$10–$20',
    patterns: /\b(long wait|waited|waiting|slow|took forever|hour wait|delayed|30 min|45 min|an hour|too long|wait time)\b|等很久|等了|排隊|等候|太慢|等太久|等待時間|遲到|上菜慢/i,
  },
  {
    key: 'hygiene',
    label: 'Hygiene & Cleanliness',
    labelZh: '衛生問題',
    icon: '🧹',
    severity: 'high',
    compensation: '$5–$10',
    patterns: /\b(dirty|unclean|filthy|hygiene|hair in|bug|cockroach|fly|pest|stain|sticky|messy|gross|disgusting|unsanitary|grime|mold|mouldy|moldy|restroom|washroom|bathroom)\b|髒|不乾淨|衛生|頭髮|蟑螂|蟲|噁心|黏黏|廁所髒|油污|發霉/i,
  },
  {
    key: 'pricing',
    label: 'Pricing Issues',
    labelZh: '價格問題',
    icon: '💰',
    severity: 'low',
    compensation: 'Refund + $5–$10',
    patterns: /\b(expensive|overpriced|overcharge|price|pricey|not worth|rip off|ripoff|charged extra|hidden fee|hidden charge|cost too much|too much money)\b|貴|太貴|價格|收費|不值|CP值低|加收|多收|亂收/i,
  },
  {
    key: 'environment',
    label: 'Poor Environment',
    labelZh: '用餐環境差',
    icon: '🏠',
    severity: 'low',
    compensation: '$5–$10',
    patterns: /\b(noisy|loud|crowded|uncomfortable|cramped|seating|cold inside|hot inside|air conditioning|ventilation|atmosphere|ambiance|dark|lighting)\b|吵|擁擠|環境|座位|冷氣|通風|悶|太暗|太亮|空間小/i,
  },
  {
    key: 'packaging_delivery',
    label: 'Packaging / Delivery',
    labelZh: '包裝/外送問題',
    icon: '📦',
    severity: 'medium',
    compensation: '$5–meal value',
    patterns: /\b(spill|spilled|leaked|leaking|packaging|soggy|soaked|delivery|cold when arrived|messy package|damaged|container|broken seal|not sealed)\b|外送|包裝|灑出|漏出來|破掉|泡爛|湯灑|冷掉|壓壞/i,
  },
  {
    key: 'food_safety',
    label: 'Food Safety',
    labelZh: '食品安全',
    icon: '⚠️',
    severity: 'critical',
    compensation: '$20–$50+',
    patterns: /\b(sick|food poisoning|vomit|diarrhea|stomach|allergy|allergic|foreign object|plastic|glass|metal|unwell|nausea|ill after|hospital)\b|食安|食物中毒|拉肚子|嘔吐|過敏|異物|塑膠|生病|不舒服|腹瀉/i,
  },
  {
    key: 'complaint_handling',
    label: 'Complaint Handling',
    labelZh: '客訴處理不當',
    icon: '🗣️',
    severity: 'high',
    compensation: '$20–$30',
    patterns: /\b(manager|complaint|dismissed|no apology|didn.t care|refused|no refund|no compensation|not resolved|blame|argue|argumentative|nothing was done)\b|投訴|客訴|不道歉|推卸|不理|沒處理|踢皮球|無視|不解決/i,
  },
];

function classifyComplaint(text: string): string[] {
  if (!text) return [];
  const categories: string[] = [];
  for (const cat of COMPLAINT_CATEGORIES) {
    if (cat.patterns.test(text)) {
      categories.push(cat.key);
    }
  }
  return categories;
}

/* ───────── Route handler ───────── */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const storeIds = ctx.stores.map((s) => s.id);

    if (storeIds.length === 0) {
      return NextResponse.json({
        starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalReviews: 0,
        avgRating: 0,
        keywords: [],
        sentimentTags: { positive: [], negative: [] },
        complaintCategories: [],
        negativeCount: 0,
        reviews: [],
      });
    }

    // Fetch all reviews (max 5 000)
    const { data: reviews } = await supabase
      .from('reviews_raw')
      .select('id, author_name, rating, content, created_at, store_id')
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })
      .limit(5000);

    const all = reviews || [];

    // Store name map
    const storeMap: Record<number, string> = {};
    for (const s of ctx.stores) storeMap[s.id] = s.name;

    // ── Star distribution ──
    const starDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    for (const r of all) {
      const s = Math.min(5, Math.max(1, Math.round(r.rating)));
      starDist[s]++;
      ratingSum += r.rating;
    }

    // ── Keyword extraction ──
    const wordMap = new Map<string, { count: number; ratingSum: number; ratingCount: number }>();

    for (const review of all) {
      if (!review.content) continue;
      const words = tokenize(review.content);
      const unique = new Set(words); // count each word once per review
      for (const w of unique) {
        const e = wordMap.get(w) || { count: 0, ratingSum: 0, ratingCount: 0 };
        e.count++;
        e.ratingSum += review.rating;
        e.ratingCount++;
        wordMap.set(w, e);
      }
    }

    const keywords = Array.from(wordMap.entries())
      .filter(([, v]) => v.count >= 2)
      .map(([word, v]) => {
        const avg = v.ratingSum / v.ratingCount;
        return {
          word,
          count: v.count,
          avgRating: Math.round(avg * 10) / 10,
          sentiment: (avg >= 4.0 ? 'positive' : avg <= 3.0 ? 'negative' : 'neutral') as
            | 'positive'
            | 'negative'
            | 'neutral',
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 80);

    // ── Sentiment tags (extract from review subsets for robustness) ──
    // Positive tags: keywords most common in 4-5 star reviews
    const posReviews = all.filter((r) => r.rating >= 4);
    const posWordMap = new Map<string, number>();
    for (const review of posReviews) {
      if (!review.content) continue;
      const words = tokenize(review.content);
      const unique = new Set(words);
      for (const w of unique) posWordMap.set(w, (posWordMap.get(w) || 0) + 1);
    }
    const positiveKw = Array.from(posWordMap.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([word, count]) => {
        const existing = keywords.find((k) => k.word === word);
        return existing || { word, count, avgRating: 5, sentiment: 'positive' as const };
      });

    // Negative tags: keywords most common in 1-3 star reviews
    const negReviews = all.filter((r) => r.rating <= 3);
    const negWordMap = new Map<string, number>();
    for (const review of negReviews) {
      if (!review.content) continue;
      const words = tokenize(review.content);
      const unique = new Set(words);
      for (const w of unique) negWordMap.set(w, (negWordMap.get(w) || 0) + 1);
    }
    const negativeKw = Array.from(negWordMap.entries())
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([word, count]) => {
        const existing = keywords.find((k) => k.word === word);
        return existing || { word, count, avgRating: 1, sentiment: 'negative' as const };
      });

    // ── Complaint category analysis (negative reviews only: 1-3 stars) ──
    const negativeAll = all.filter((r) => r.rating <= 3);
    const complaintCounts: Record<string, { count: number; reviewIds: number[] }> = {};
    for (const cat of COMPLAINT_CATEGORIES) {
      complaintCounts[cat.key] = { count: 0, reviewIds: [] };
    }
    let uncategorizedCount = 0;
    const uncategorizedIds: number[] = [];

    for (const review of negativeAll) {
      const cats = classifyComplaint(review.content || '');
      if (cats.length === 0) {
        uncategorizedCount++;
        uncategorizedIds.push(review.id);
      } else {
        for (const key of cats) {
          complaintCounts[key].count++;
          complaintCounts[key].reviewIds.push(review.id);
        }
      }
    }

    const complaintCategories = COMPLAINT_CATEGORIES
      .map((cat) => ({
        key: cat.key,
        label: cat.label,
        labelZh: cat.labelZh,
        icon: cat.icon,
        severity: cat.severity,
        compensation: cat.compensation,
        count: complaintCounts[cat.key].count,
        reviewIds: complaintCounts[cat.key].reviewIds.slice(0, 100),
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    // Add uncategorized if any
    if (uncategorizedCount > 0) {
      complaintCategories.push({
        key: 'uncategorized',
        label: 'Other / Unspecified',
        labelZh: '其他/未分類',
        icon: '❓',
        severity: 'low' as const,
        compensation: '—',
        count: uncategorizedCount,
        reviewIds: uncategorizedIds.slice(0, 100),
      });
    }

    // ── Enriched reviews ──
    const enriched = all.map((r) => ({
      id: r.id,
      author_name: r.author_name || 'Anonymous',
      rating: r.rating,
      content: r.content || '',
      created_at: r.created_at,
      store_name: storeMap[r.store_id] || 'Unknown',
    }));

    return NextResponse.json({
      starDistribution: starDist,
      totalReviews: all.length,
      avgRating: all.length > 0 ? Math.round((ratingSum / all.length) * 10) / 10 : 0,
      keywords,
      sentimentTags: { positive: positiveKw, negative: negativeKw },
      complaintCategories,
      negativeCount: negativeAll.length,
      reviews: enriched,
    });
  } catch (error: any) {
    console.error('Review analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
