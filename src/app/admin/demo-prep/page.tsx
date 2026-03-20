'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getVerticalOptions } from '@/lib/verticals';

const VERTICAL_OPTIONS = getVerticalOptions();

interface ReviewInput {
  author: string;
  rating: number;
  content: string;
  date: string;
}

// Pre-built sample reviews for quick demo setup
const SAMPLE_REVIEWS: Record<string, ReviewInput[]> = {
  restaurant: [
    { author: '王小明', rating: 5, content: '牛肉麵超好吃！湯頭濃郁，麵條Q彈，份量十足。服務態度也很好，下次一定再來！', date: daysAgo(2) },
    { author: 'David Chen', rating: 5, content: 'Best beef noodle soup in town! The broth is rich and flavorful. Staff was very friendly.', date: daysAgo(5) },
    { author: '林美玲', rating: 4, content: '整體不錯，環境乾淨，餐點好吃。就是等了比較久，大概20分鐘才上菜。', date: daysAgo(8) },
    { author: 'Sarah L.', rating: 3, content: 'Food was decent but nothing special. A bit overpriced for the portion size.', date: daysAgo(12) },
    { author: '張大偉', rating: 1, content: '等了40分鐘才上菜，服務態度很差，跟店員反映也沒用。不會再來了。', date: daysAgo(15) },
    { author: '陳小華', rating: 5, content: '帶家人來聚餐，大家都吃得很開心！尤其是滷味拼盤，每道都入味。老闆人也很親切。', date: daysAgo(18) },
    { author: 'Mike W.', rating: 4, content: 'Great food, cozy atmosphere. The dumplings are a must-try. Will definitely come back.', date: daysAgo(20) },
    { author: '李佳蓉', rating: 2, content: '今天點的酸辣湯太鹹了，跟上次來的味道差很多。希望品質能穩定一點。', date: daysAgo(22) },
    { author: '黃志偉', rating: 5, content: '第一次來就愛上了！CP值超高，推薦招牌牛肉麵和小菜拼盤。停車也方便。', date: daysAgo(25) },
    { author: 'Jenny T.', rating: 4, content: 'Authentic Taiwanese cuisine. The free dessert was a nice surprise! Clean restaurant too.', date: daysAgo(28) },
  ],
  hotel: [
    { author: '王先生', rating: 5, content: '房間很大很乾淨，員工服務態度超好！早餐buffet也很豐富。下次來還會住這裡。', date: daysAgo(3) },
    { author: 'John S.', rating: 4, content: 'Great location, clean rooms. The lobby is beautiful. Only wish the check-in was faster.', date: daysAgo(7) },
    { author: '陳太太', rating: 2, content: '隔音很差，半夜被隔壁吵醒好幾次。跟櫃台反映也只是說抱歉，沒有換房。', date: daysAgo(10) },
    { author: 'Emma R.', rating: 5, content: 'Perfect stay! The spa was amazing and the concierge helped us plan our whole trip.', date: daysAgo(14) },
    { author: '林小姐', rating: 3, content: '位置不錯但房間有點舊了，浴室的蓮蓬頭水壓很小。早餐倒是不錯。', date: daysAgo(20) },
  ],
  clinic: [
    { author: '王媽媽', rating: 5, content: '醫師很專業也很有耐心，詳細解釋了治療方案。護理師也很親切，小朋友不會害怕。', date: daysAgo(4) },
    { author: 'Amy L.', rating: 4, content: 'Dr. Lee is thorough and takes time to explain. Wait time was a bit long though.', date: daysAgo(9) },
    { author: '張先生', rating: 1, content: '預約了10點看診，等到11點半才叫到號。完全不尊重病人的時間。', date: daysAgo(13) },
    { author: '李小姐', rating: 5, content: '看了好幾家診所都沒改善，來這裡一次就好了。真的很推薦！環境也很舒適乾淨。', date: daysAgo(18) },
    { author: 'Tom K.', rating: 3, content: 'Clinic is clean and modern. Treatment was effective but felt a bit rushed during consultation.', date: daysAgo(24) },
  ],
};

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number;
  mapsUrl: string;
  types: string[];
}

function PlaceSearchInput({
  onSelect,
  initialValue,
}: {
  onSelect: (place: PlaceResult) => void;
  initialValue?: string;
}) {
  const [query, setQuery] = useState(initialValue || '');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/places-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setShowDropdown(true);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search, selected]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          className="w-full border rounded-lg px-4 py-2.5 pr-10"
          placeholder="輸入店名搜尋，例如「有香拉麵」「晶華酒店」..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(false);
          }}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {results.map((place) => (
            <button
              key={place.placeId}
              onClick={() => {
                setQuery(place.name);
                setSelected(true);
                setShowDropdown(false);
                onSelect(place);
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{place.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{place.address}</div>
                </div>
                {place.rating && (
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-yellow-400">★</span>
                      <span className="font-medium text-gray-700">{place.rating}</span>
                    </div>
                    <div className="text-[10px] text-gray-400">{place.reviewCount} 則評論</div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-sm text-gray-500">
          找不到相關店家，請嘗試其他關鍵字
        </div>
      )}
    </div>
  );
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function DemoNotifyButton({ storeId }: { storeId: number }) {
  const [sending, setSending] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ success?: boolean; message?: string; error?: string; channelsNeeded?: boolean } | null>(null);

  async function triggerNotification() {
    setSending(true);
    setNotifyResult(null);
    try {
      const res = await fetch('/api/admin/demo-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotifyResult({ error: data.error, channelsNeeded: data.channelsNeeded });
      } else {
        setNotifyResult({ success: true, message: data.message });
      }
    } catch (err: any) {
      setNotifyResult({ error: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-orange-800 text-sm flex items-center gap-1.5">
            &#128276; Demo Notification
          </h3>
          <p className="text-xs text-orange-600 mt-0.5">
            Send a test notification to your LINE/Email/Slack right now
          </p>
        </div>
        <button
          onClick={triggerNotification}
          disabled={sending}
          className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
        >
          {sending ? 'Sending...' : 'Trigger Now'}
        </button>
      </div>
      {notifyResult && (
        <div className={`mt-2 text-xs p-2 rounded ${
          notifyResult.success ? 'bg-green-100 text-green-700' :
          notifyResult.channelsNeeded ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {notifyResult.success ? notifyResult.message : notifyResult.error}
          {notifyResult.channelsNeeded && (
            <a href="/admin/settings/notifications" className="underline ml-1 font-medium">
              Go to Settings
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function DemoPrepPage() {
  const [step, setStep] = useState<'input' | 'reviews' | 'creating' | 'done'>('input');
  const [storeName, setStoreName] = useState('');
  const [vertical, setVertical] = useState('restaurant');
  const [placeId, setPlaceId] = useState('');
  const [reviews, setReviews] = useState<ReviewInput[]>([]);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Manual review entry
  const [newAuthor, setNewAuthor] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newContent, setNewContent] = useState('');

  const loadSampleReviews = () => {
    const samples = SAMPLE_REVIEWS[vertical] || SAMPLE_REVIEWS.restaurant;
    setReviews([...samples]);
  };

  const addReview = () => {
    if (!newContent.trim()) return;
    setReviews(prev => [...prev, {
      author: newAuthor || 'Anonymous',
      rating: newRating,
      content: newContent,
      date: new Date().toISOString(),
    }]);
    setNewAuthor('');
    setNewRating(5);
    setNewContent('');
  };

  const removeReview = (index: number) => {
    setReviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    setProgress('Creating demo store and generating AI replies...');

    try {
      const res = await fetch('/api/admin/demo-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          vertical,
          placeId: placeId || undefined,
          reviews,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
      setProgress('');
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
  }));

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xl">
          D
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Demo Prep Tool</h1>
          <p className="text-sm text-gray-500">Prepare a personalized demo for your prospect in 2 minutes</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 my-6 text-sm">
        {['Store Info', 'Import Reviews', 'Ready'].map((label, i) => {
          const stepIndex = i === 0 ? 'input' : i === 1 ? 'reviews' : 'done';
          const isActive = step === stepIndex || (step === 'creating' && i === 1);
          const isPast = (step === 'reviews' && i === 0) || (step === 'done' && i < 2) || (step === 'creating' && i === 0);
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isPast ? 'bg-blue-400' : 'bg-gray-200'}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium ${
                isActive ? 'bg-blue-100 text-blue-700' : isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {isPast ? <span>&#10003;</span> : <span>{i + 1}</span>}
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Store Info */}
      {step === 'input' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-800">Prospect Store Info</h2>
          <p className="text-sm text-gray-500">Enter your prospect&apos;s business details. This will personalize the entire demo.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜尋 Google 上的店家 *</label>
            <PlaceSearchInput
              initialValue={storeName}
              onSelect={(place) => {
                setStoreName(place.name);
                setPlaceId(place.placeId);
                // Auto-detect vertical from Google types
                const types = place.types || [];
                if (types.some((t: string) => ['restaurant', 'food', 'cafe', 'bakery', 'bar', 'meal_delivery', 'meal_takeaway'].includes(t))) {
                  setVertical('restaurant');
                } else if (types.some((t: string) => ['lodging', 'hotel'].includes(t))) {
                  setVertical('hotel');
                } else if (types.some((t: string) => ['doctor', 'dentist', 'hospital', 'health', 'physiotherapist', 'veterinary_care'].includes(t))) {
                  setVertical('clinic');
                }
              }}
            />
            {placeId && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <span>✅</span>
                <span>已選擇：<strong>{storeName}</strong></span>
                <code className="ml-auto font-mono text-[10px] text-green-600 bg-white px-1.5 py-0.5 rounded">{placeId}</code>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              輸入店名後從下拉選單選擇對應的店家，系統會自動帶入 Google Place ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">或手動輸入店名</label>
            <input
              type="text"
              className="w-full border rounded-lg px-4 py-2.5 text-sm"
              placeholder="如果 Google 搜尋不到，可以直接輸入店名"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">業態類型</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {VERTICAL_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVertical(v.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    vertical === v.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{v.icon}</span>
                  <span>{v.labelZh}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (!storeName.trim()) { setError('Please enter a store name'); return; }
              setError('');
              setStep('reviews');
              if (reviews.length === 0) loadSampleReviews();
            }}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next: Import Reviews
          </button>
        </div>
      )}

      {/* Step 2: Reviews */}
      {(step === 'reviews' || step === 'creating') && (
        <div className="space-y-4">
          {/* Review stats bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{reviews.length}</div>
                  <div className="text-xs text-gray-500">Reviews</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800 flex items-center gap-1">
                    {avgRating} <span className="text-yellow-400 text-lg">&#9733;</span>
                  </div>
                  <div className="text-xs text-gray-500">Avg Rating</div>
                </div>
                <div className="flex items-center gap-1">
                  {ratingDist.map(({ rating, count }) => (
                    <div key={rating} className="text-center">
                      <div className="text-xs font-medium text-gray-700">{count}</div>
                      <div className={`w-6 rounded-t ${count > 0 ? 'bg-blue-400' : 'bg-gray-100'}`}
                        style={{ height: `${Math.max(4, count * 8)}px` }} />
                      <div className="text-[10px] text-gray-400">{rating}&#9733;</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('input'); }}
                  className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={loadSampleReviews}
                  className="px-4 py-2 text-sm text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50"
                >
                  Load Samples
                </button>
              </div>
            </div>
          </div>

          {/* Review list */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y">
            {reviews.map((review, i) => (
              <div key={i} className="p-4 flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                  {review.author.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm">{review.author}</span>
                    <span className="text-yellow-400 text-sm">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{review.content}</p>
                </div>
                <button
                  onClick={() => removeReview(i)}
                  className="text-gray-300 hover:text-red-500 shrink-0 text-lg"
                >
                  &times;
                </button>
              </div>
            ))}

            {/* Add review form */}
            <div className="p-4 bg-gray-50">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Custom Review</div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 border rounded px-3 py-1.5 text-sm"
                  placeholder="Author name"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                />
                <select
                  className="border rounded px-2 py-1.5 text-sm"
                  value={newRating}
                  onChange={(e) => setNewRating(Number(e.target.value))}
                >
                  {[5, 4, 3, 2, 1].map(r => (
                    <option key={r} value={r}>{r} Star</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <textarea
                  className="flex-1 border rounded px-3 py-1.5 text-sm resize-none"
                  rows={2}
                  placeholder="Paste a real review from Google Maps, or type one..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                <button
                  onClick={addReview}
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 self-end"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Create demo button */}
          <button
            onClick={handleCreate}
            disabled={creating || reviews.length === 0}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-lg"
          >
            {creating ? progress || 'Creating...' : `Create Demo (${reviews.length} reviews + AI replies)`}
          </button>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && result && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">&#127881;</div>
            <h2 className="text-xl font-bold text-gray-800">Demo Ready!</h2>
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{result.store.name}</span> — {result.reviewsImported} reviews imported, {result.draftedReplies} AI replies generated
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <a
              href={result.links.dashboard}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-lg">
                &#128202;
              </div>
              <div>
                <div className="font-semibold text-gray-800">Dashboard</div>
                <div className="text-xs text-gray-500">Show KPIs, charts, and metrics</div>
              </div>
            </a>

            <a
              href={result.links.reviews}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 text-lg">
                &#128172;
              </div>
              <div>
                <div className="font-semibold text-gray-800">Review Management</div>
                <div className="text-xs text-gray-500">Show AI replies and approval flow</div>
              </div>
            </a>

            <a
              href={result.links.customerPage}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 text-lg">
                &#128241;
              </div>
              <div>
                <div className="font-semibold text-gray-800">Customer QR Page</div>
                <div className="text-xs text-gray-500">Live demo: scan QR and generate review</div>
              </div>
            </a>

            <a
              href={result.links.storeSetup}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 transition-colors"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-lg">
                &#9881;
              </div>
              <div>
                <div className="font-semibold text-gray-800">Store Settings</div>
                <div className="text-xs text-gray-500">Configure tags, images, and auto-reply</div>
              </div>
            </a>
          </div>

          {/* Demo Notification Trigger */}
          <DemoNotifyButton storeId={result.store.id} />

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h3 className="font-bold text-blue-800 text-sm mb-2">Demo Script Tips</h3>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Open <strong>Dashboard</strong> first — &quot;This is your store&apos;s current review situation&quot;</li>
              <li>Go to <strong>Reviews</strong> — show a negative review with AI draft reply, approve it live</li>
              <li><strong>Trigger Notification</strong> above — show LINE/Email notification arriving on your phone</li>
              <li>Open notification link on phone — edit AI reply and publish in 30 seconds</li>
              <li>Open <strong>Customer QR Page</strong> on your phone — walk through the review generation flow</li>
              <li>Close: &quot;Setup takes 2 minutes. Free to start, upgrade when you&apos;re ready.&quot;</li>
            </ol>
          </div>

          <button
            onClick={() => {
              setStep('input');
              setStoreName('');
              setReviews([]);
              setResult(null);
            }}
            className="w-full mt-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
          >
            Prepare Another Demo
          </button>
        </div>
      )}
    </div>
  );
}
