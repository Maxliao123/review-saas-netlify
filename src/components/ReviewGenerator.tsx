'use client';

import { useState, useMemo } from 'react';
import { LANGS, CHIP_GROUPS_CONFIG } from '@/lib/config';
import { Loader2 } from 'lucide-react';

interface ReviewGeneratorProps {
    storeId: string;
    storeData: any;
    initialLang?: string;
}

export function ReviewGenerator({ storeId, storeData, initialLang = 'en' }: ReviewGeneratorProps) {
    const [lang, setLang] = useState(initialLang);
    const [selected, setSelected] = useState<Map<string, { isCons: boolean; sourceKey: string }>>(new Map());
    const [customFood, setCustomFood] = useState('');
    const [customCons, setCustomCons] = useState('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReview, setGeneratedReview] = useState('');
    const [reviewId, setReviewId] = useState<string | null>(null);
    const [openGoogleUrl, setOpenGoogleUrl] = useState('');

    // Determine available languages based on storeData content
    const availableLangs = useMemo(() => {
        if (!storeData) return ['en', 'zh'];
        const order = ['zh', 'en', 'ko', 'ja', 'fr', 'es'];
        // Logic to check if lang has content (simplified)
        const hasContent = (l: string) => {
            const suffix = (l === 'zh') ? 'Cn' : (l.charAt(0).toUpperCase() + l.slice(1));
            const keysToCheck = ['top3', 'features', 'ambiance', 'newItems', 'cons', `top3${suffix}`, `features${suffix}`, `ambiance${suffix}`, `newItems${suffix}`, `cons${suffix}`];
            return keysToCheck.some(k => (storeData[k] || '').trim());
        };
        const avail = order.filter(l => hasContent(l));
        return avail.length > 0 ? avail : ['zh', 'en'];
    }, [storeData]);

    // Adjust current lang if not available
    useMemo(() => {
        if (!availableLangs.includes(lang)) {
            setLang(availableLangs[0]);
        }
    }, [availableLangs]);

    const toggleTag = (tag: string, isCons: boolean, sourceKey: string) => {
        const next = new Map(selected);
        if (next.has(tag)) {
            next.delete(tag);
        } else {
            next.set(tag, { isCons, sourceKey });
        }
        setSelected(next);
    };

    const currentStrings = LANGS[lang] || LANGS['en'];

    // Chip Groups
    const chipGroups = useMemo(() => {
        if (!storeData) return [];

        const langSuffix = (lang === 'zh') ? 'Cn' : (lang.charAt(0).toUpperCase() + lang.slice(1));
        const groups: any[] = [];

        // 1. Try to use rawTags from backend (Best for modern Supabase setup)
        if (storeData.rawTags && Array.isArray(storeData.rawTags) && storeData.rawTags.length > 0) {
            const langSuffix = (lang === 'zh') ? 'Cn' : (lang.charAt(0).toUpperCase() + lang.slice(1));
            const localeLower = lang.toLowerCase();

            // Helper: does tag locale match current lang?
            // simple check: en matches en/En, zh matches zh/Cn/zh-CN
            const matchLocale = (tagLocale: string) => {
                if (!tagLocale) return true; // default if missing? or strict?
                const tl = tagLocale.toLowerCase();
                if (localeLower.startsWith('zh') && (tl.includes('zh') || tl.includes('cn'))) return true;
                if (localeLower === tl) return true;
                return false;
            };

            const groupsMap = new Map();

            // Define mapping from question_key (DB) to group id (Config)
            const DB_KEY_MAP: Record<string, string> = {
                'main_impression': 'food',
                'top3': 'food',
                'food': 'food',
                'newItems': 'food',
                'features': 'features',
                'service': 'features',
                'ambiance': 'occasion',
                'occasion': 'occasion',
                'cons': 'suggestions',
                'suggestion': 'suggestions'
            };

            storeData.rawTags.forEach((tag: any) => {
                if (!matchLocale(tag.locale)) return;

                const groupId = DB_KEY_MAP[tag.question_key] || 'food'; // fallback to food
                if (!groupsMap.has(groupId)) {
                    groupsMap.set(groupId, new Set());
                }
                groupsMap.get(groupId).add(JSON.stringify({
                    tag: tag.label,
                    isCons: groupId === 'suggestions',
                    sourceKey: tag.question_key
                }));
            });

            // Reconstruct groups based on config order — always show all categories
            CHIP_GROUPS_CONFIG.forEach(config => {
                const itemsSet = groupsMap.get(config.id);
                const items = itemsSet ? Array.from(itemsSet).map((s: any) => JSON.parse(s)) : [];
                groups.push({ ...config, items });
            });

            // If we found nothing relevant for this lang, logic below might help fallback? 
            // But usually rawTags is comprehensive.
            return groups;
        }

        // 2. Fallback to Legacy String Parsing (for backward compat)
        CHIP_GROUPS_CONFIG.forEach(config => {
            const isConsGroup = !!config.isConsGroup;
            const seenInThisGroup = new Map();

            config.keys.forEach(baseKey => {
                const langKey = baseKey + langSuffix;
                const hasLang = (storeData[langKey] || '').trim() !== '';
                const keysForLang = hasLang ? [langKey] : [baseKey];

                keysForLang.forEach(key => {
                    const raw = storeData[key] || '';
                    if (!raw) return;
                    String(raw).split(',').forEach(tagRaw => {
                        const tag = tagRaw.trim();
                        if (!tag) return;
                        seenInThisGroup.set(tag, { tag, isCons: isConsGroup, sourceKey: baseKey });
                    });
                });
            });

            const uniqueTags = Array.from(seenInThisGroup.values());
            // Always show all groups for consistent UX
            groups.push({ ...config, items: uniqueTags });
        });

        return groups;
    }, [storeData, lang]);

    async function handleGenerate() {
        if (selected.size === 0 && !customFood && !customCons) {
            alert(currentStrings.ui.sub); // Reuse sub as error msg fallback
            return;
        }

        setIsGenerating(true);

        // Prepare buckets
        const posTop3: string[] = [];
        const posFeatures: string[] = [];
        const posAmbiance: string[] = [];
        const posNewItems: string[] = [];
        const cons: string[] = [];
        const positiveTags: string[] = [];
        const consTags: string[] = [];

        selected.forEach((meta, tag) => {
            if (meta.isCons) {
                cons.push(tag);
                consTags.push(tag);
            } else {
                positiveTags.push(tag);
                if (meta.sourceKey === 'top3') posTop3.push(tag);
                if (meta.sourceKey === 'features') posFeatures.push(tag);
                if (meta.sourceKey === 'ambiance') posAmbiance.push(tag);
                if (meta.sourceKey === 'newItems') posNewItems.push(tag);
            }
        });

        if (customFood) positiveTags.push(customFood);
        if (customCons) consTags.push(customCons);

        const body = {
            storeid: storeId,
            positiveTags,
            consTags,
            variant: 1,
            minChars: 90,
            maxChars: 160,
            lang,
            tagBuckets: {
                posTop3, posFeatures, posAmbiance, posNewItems, cons,
                customFood: customFood || null,
                customCons: customCons || null
            }
        };

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Err');

            setGeneratedReview(data.reviewText);
            setReviewId(data.reviewId);

            // Build Google Link
            if (data.store?.placeId) {
                const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' +
                    encodeURIComponent(data.store.name || '') +
                    '&query_place_id=' +
                    encodeURIComponent(data.store.placeId);
                setOpenGoogleUrl(mapsUrl);
            } else {
                // Fallback
                const q = encodeURIComponent(storeData?.name || 'Google Reviews');
                setOpenGoogleUrl('https://www.google.com/search?q=' + q + '+google+reviews');
            }

        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    }

    async function handleCopyAndOpen() {
        if (!generatedReview) return;
        try {
            await navigator.clipboard.writeText(generatedReview);
        } catch { }

        if (reviewId) {
            fetch('/api/confirm', {
                method: 'POST',
                body: JSON.stringify({ reviewId }),
                headers: { 'Content-Type': 'application/json' }
            }).catch(() => { });

            // Track click
            fetch('/api/track', {
                method: 'POST',
                body: JSON.stringify({ store_id: storeData.id || 1, event_type: 'click_google', source_id: reviewId }),
                headers: { 'Content-Type': 'application/json' }
            }).catch(() => { });
        }

        if (openGoogleUrl) {
            window.open(openGoogleUrl, '_blank');
        }
    }

    const localizedStoreName = storeData?.name || 'Store'; // Simplified name logic

    return (
        <div className="animate-in fade-in duration-500">
            {/* Lang Bar */}
            <div className="absolute top-4 right-4 flex gap-1 bg-slate-900/10 backdrop-blur-md rounded-full p-1.5 z-10">
                {availableLangs.map(k => (
                    <button
                        key={k}
                        onClick={() => setLang(k)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${lang === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white/50'}`}
                    >
                        {LANGS[k].label}
                    </button>
                ))}
            </div>

            <div className="pt-2">
                <h1 className="text-2xl font-extrabold text-slate-800 mb-2">
                    {currentStrings.ui.title.replace('{name}', localizedStoreName)}
                </h1>
                <p className="text-slate-500 mb-6 font-medium leading-relaxed">
                    {currentStrings.ui.sub}
                </p>

                <div className="space-y-6">
                    {chipGroups.map(group => (
                        <div key={group.id} className="space-y-3">
                            <h3 className="font-bold text-slate-700 text-sm pl-1">
                                {group.title[lang] || group.title['en']}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {group.items.map((item: any) => {
                                    const active = selected.has(item.tag);
                                    return (
                                        <button
                                            key={item.tag}
                                            onClick={() => toggleTag(item.tag, item.isCons, item.sourceKey)}
                                            className={`
                                        p-3 rounded-full text-sm font-semibold transition-all border
                                        min-h-[48px] flex items-center justify-center leading-tight
                                        ${active
                                                    ? 'bg-blue-500 text-white border-transparent shadow-md transform -translate-y-0.5'
                                                    : 'bg-blue-50 text-slate-600 border-blue-100 hover:bg-white hover:border-blue-200 shadow-sm'
                                                }
                                    `}
                                        >
                                            {item.tag}
                                        </button>
                                    );
                                })}

                                {/* Custom Input */}
                                {group.id === 'food' && (
                                    <div className="relative min-h-[48px] rounded-full border border-dashed border-blue-300 flex items-center bg-white">
                                        <input
                                            type="text"
                                            className="w-full h-full bg-transparent text-center text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none px-4 rounded-full"
                                            placeholder={currentStrings.customPlaceholder}
                                            value={customFood}
                                            onChange={(e) => setCustomFood(e.target.value)}
                                        />
                                    </div>
                                )}
                                {/* Suggestion Custom Input */}
                                {group.isConsGroup && (
                                    <div className="relative min-h-[48px] rounded-full border border-dashed border-blue-300 flex items-center bg-white">
                                        <input
                                            type="text"
                                            className="w-full h-full bg-transparent text-center text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none px-4 rounded-full"
                                            placeholder={currentStrings.customConsPlaceholder}
                                            value={customCons}
                                            onChange={(e) => setCustomCons(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 space-y-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isGenerating && <Loader2 className="animate-spin w-5 h-5" />}
                        {isGenerating
                            ? (lang === 'zh' ? '撰寫中...' : 'Composing...')
                            : currentStrings.ui.gen}
                    </button>

                    {generatedReview && (
                        <div className="animate-in slide-in-from-bottom-2 fade-in">
                            <textarea
                                readOnly
                                value={generatedReview}
                                className="w-full p-4 border border-blue-200 rounded-2xl text-slate-700 text-base shadow-sm focus:outline-none bg-white mb-4 min-h-[120px]"
                            />
                            <button
                                onClick={handleCopyAndOpen}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                {currentStrings.ui.open}
                            </button>

                            <div className="mt-4 p-4 bg-gray-100 rounded-xl text-center text-sm text-gray-500">
                                {lang === 'zh' ? '請出示此畫面給店員' : 'Please show this screen to staff'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
