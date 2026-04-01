import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { buildPrompt, FLAVORS, PERSONAS } from '@/lib/generation-prompts';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { getPlanLimits } from '@/lib/plan-limits';

// Config
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SIM_TIER_HIGH = 0.5;
const DAILY_MAX_CALLS = parseInt(process.env.DAILY_MAX_CALLS || "1000", 10);

// In-memory counter (per instance/container)
const globalDailyCounter = { date: '', count: 0 };

function dayStr() {
    return new Date().toISOString().slice(0, 10);
}

function stableKey(obj: any) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

function hashStr(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function pickVariant(seedA: any, seedB: any) {
    const h = hashStr(stableKey({ seedA, seedB }));
    return h % FLAVORS.length;
}

function pickAB(storeid: string) {
    return (hashStr(storeid) % 2) === 0 ? "A" : "B";
}

function pickPersona(storeid: string, lang: string) {
    if (!storeid) return null;
    const idx = hashStr(`${storeid}|${lang || ""}`) % PERSONAS.length;
    return PERSONAS[idx];
}

// Store Helper - Supabase ONLY
async function getStoreContext(storeSlug: string) {
    const slug = (storeSlug || "").toLowerCase();

    let storeRow = null;
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('id, tenant_id, slug, name, place_id')
            .eq('slug', slug)
            .single();

        if (!error && data) {
            storeRow = data;
        } else {
            console.warn("Supabase stores query error or not found:", error?.message);
        }
    } catch (e: any) {
        console.error("getStoreContext: stores query error:", e.message);
    }

    // We no longer fallback to Sheet. If not in DB, it's unknown.
    const storeName = storeRow?.name || storeSlug || "Unknown store";
    const placeId = storeRow?.place_id || "";

    // Original meta had top3 etc from Sheet. Now we rely on frontend passing selectedTags, 
    // or if we needed them here, we'd have to query generator_tags again.
    // But buildPrompt() uses `meta.top3` etc for "Reference" context.
    // If user wants these purely from Supabase, we would need to fetch generator_tags here too.
    // For simplicity and efficiency, we can minimize "Reference" or assume user selected tags ARE the reference.

    const meta = {
        name: storeName,
        placeId,
        top3: '', // If these columns exist in stores table, we could map them. Assume empty for now to avoid Sheet call.
        features: '',
        ambiance: '',
        newItems: ''
    };

    const tenantId = storeRow?.tenant_id || null;

    return { storeRow, tenantId, meta };
}

async function callOpenAI(system: string, user: string) {
    const t0 = Date.now();
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.8,
            top_p: 0.9,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
        }),
    });

    if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`OpenAI ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    return {
        text: data?.choices?.[0]?.message?.content?.trim() || "",
        usage: data?.usage || {},
        latencyMs: Date.now() - t0,
    };
}

async function enforceNoImprovementIfNoCons(text: string, lang: string, hasCons: boolean) {
    if (hasCons) return text;
    const zhPattern = /(如果|若是|要是).+更好|希望|期待|改進|改进/;
    const enPattern = /\bwould be (even )?better\b|\bhope\b|\bwish\b|\bif\b.+\b(could|would)\b/i;

    const needRewrite =
        (lang.startsWith("zh") && zhPattern.test(text)) ||
        (lang.startsWith("en") && enPattern.test(text));

    if (!needRewrite) return text;

    const sys =
        "You are an editor for customer reviews. Rewrite the review to keep all positive content, but remove any suggestions, wishes, or 'if..., it would be better' style sentences. Keep the same language as the original and return only the final revised review.";
    const user = `Language: ${lang}\nOriginal review:\n${text}`;

    try {
        const rewritten = await callOpenAI(sys, user);
        return rewritten.text || text;
    } catch (e: any) {
        console.warn("enforceNoImprovementIfNoCons error:", e.message);
        return text;
    }
}

export async function POST(request: NextRequest) {
    // Rate limit check
    const ip = getClientIP(request);
    const rl = checkRateLimit(`generate:${ip}`, RATE_LIMITS.generate);
    const rlResp = rateLimitResponse(rl);
    if (rlResp) return rlResp;

    if (!OPENAI_API_KEY) {
        return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const today = dayStr();
    if (globalDailyCounter.date !== today) {
        globalDailyCounter.date = today;
        globalDailyCounter.count = 0;
    }
    if (globalDailyCounter.count >= DAILY_MAX_CALLS) {
        return NextResponse.json({ error: "Daily quota reached" }, { status: 429 });
    }
    globalDailyCounter.count++;

    try {
        const body = await request.json();
        const storeid = (body.storeid || "").trim();
        let currentLang = (body.lang || "en").toLowerCase();

        const positiveTags = Array.isArray(body.positiveTags) ? body.positiveTags : [];
        const consTags = Array.isArray(body.consTags) ? body.consTags : [];
        const tagBuckets = body.tagBuckets || {};

        let selectedTags = [...positiveTags, ...consTags].sort();
        if (selectedTags.length === 0 && body.selectedTags) {
            selectedTags = body.selectedTags.sort();
        }

        const minChars = Math.max(60, parseInt(body.minChars || 90, 10));
        const maxChars = Math.max(minChars + 20, parseInt(body.maxChars || 160, 10));

        if (!storeid) return NextResponse.json({ error: "storeid required" }, { status: 400 });
        if (selectedTags.length === 0) return NextResponse.json({ error: "No tags selected" }, { status: 400 });

        const variant = pickVariant(storeid, selectedTags);
        const abBucket = pickAB(storeid);
        const persona = pickPersona(storeid, currentLang);

        // 1. Get Store from DB
        const { storeRow, tenantId, meta } = await getStoreContext(storeid);
        const storeDbId = storeRow?.id || null;

        if (!storeDbId) {
            console.error("Store not found (stores table):", storeid);
            return NextResponse.json({ error: "Store not configured in backend." }, { status: 404 });
        }

        // ── Plan limit enforcement ──
        if (tenantId) {
            const { data: tenantRow } = await supabase
                .from('tenants')
                .select('plan')
                .eq('id', tenantId)
                .limit(1)
                .single();

            const plan = tenantRow?.plan || 'free';
            const limits = getPlanLimits(plan);
            const yearMonth = new Date().toISOString().slice(0, 7); // '2026-03'

            const { data: usage } = await supabase
                .from('usage_monthly')
                .select('reviews_generated')
                .eq('tenant_id', tenantId)
                .eq('year_month', yearMonth)
                .limit(1)
                .maybeSingle();

            const currentCount = usage?.reviews_generated || 0;
            if (currentCount >= limits.maxReviewsPerMonth) {
                return NextResponse.json(
                    { error: `Monthly review limit reached (${limits.maxReviewsPerMonth}). Upgrade your plan for more.` },
                    { status: 429 }
                );
            }
        }

        // ── Deduplication: fetch recent reviews to avoid repetitive output ──
        const { data: recentReviews } = await supabase
            .from('generated_reviews')
            .select('review_text')
            .eq('store_id', storeDbId)
            .order('created_at', { ascending: false })
            .limit(10);

        const dedupeContext = (recentReviews && recentReviews.length > 0)
            ? `\n\nDEDUPLICATION REQUIREMENT: The following reviews were recently generated for this store. Your new review MUST be distinctly different — use a different opening, different specific details, and a different angle. DO NOT repeat similar sentence structures or phrases:\n${recentReviews.map((r: any) => `- "${r.review_text}"`).join('\n')}`
            : '';

        const promptData = buildPrompt({
            lang: currentLang,
            storeid,
            storeName: meta.name,
            meta,
            positiveTags,
            consTags,
            minChars,
            maxChars,
            variant,
            persona
        });

        const aiRes = await callOpenAI(promptData.sys + dedupeContext, promptData.user);
        let reviewText = aiRes.text;

        reviewText = await enforceNoImprovementIfNoCons(reviewText, currentLang, consTags.length > 0);

        const safeJoin = (val: any) => Array.isArray(val) ? val.join(",") : (val == null ? null : String(val));
        const {
            posTop3 = [], posFeatures = [], posAmbiance = [],
            posNewItems = [], customFood = null, cons = [], customCons = null
        } = tagBuckets;

        const { data, error } = await supabase
            .from('generated_reviews')
            .insert({
                store_id: storeDbId,
                tenant_id: tenantId,
                review_text: reviewText,
                lang: currentLang,
                persona: persona?.key,
                ab_bucket: abBucket,
                variant: variant,
                latency_ms: Math.round(aiRes.latencyMs),
                input_tokens: aiRes.usage?.prompt_tokens,
                output_tokens: aiRes.usage?.completion_tokens,
                max_sim_before: null,
                max_sim_after: null,
                threshold_used: SIM_TIER_HIGH,
                rewrote_for_similarity: null,
                risk_level: null,
                pos_top3_tags: safeJoin(posTop3),
                pos_features_tags: safeJoin(posFeatures),
                pos_ambiance_tags: safeJoin(posAmbiance),
                pos_newitems_tags: safeJoin(posNewItems),
                custom_food_tag: customFood || null,
                cons_tags: safeJoin(cons),
                custom_cons_tag: customCons || null
            })
            .select('id')
            .single();

        if (error) {
            console.error("Supabase insert error:", error.message);
        }

        // ── Increment usage counter (fire-and-forget) ──
        if (tenantId) {
            const yearMonth = new Date().toISOString().slice(0, 7);
            (async () => {
                try {
                    const { error: rpcErr } = await supabase.rpc('increment_usage', {
                        p_tenant_id: tenantId,
                        p_store_id: storeDbId,
                        p_year_month: yearMonth,
                        p_field: 'reviews_generated',
                    });
                    if (rpcErr) {
                        // Fallback: upsert directly if RPC doesn't exist yet
                        await supabase
                            .from('usage_monthly')
                            .upsert(
                                { tenant_id: tenantId, store_id: storeDbId, year_month: yearMonth, reviews_generated: 1, updated_at: new Date().toISOString() },
                                { onConflict: 'tenant_id,store_id,year_month' }
                            );
                    }
                } catch {
                    // Silent — never block review delivery
                }
            })();
        }

        return NextResponse.json({
            reviewText,
            reviewId: data?.id,
            store: {
                name: meta.name,
                placeId: meta.placeId
            }
        });

    } catch (err: any) {
        console.error("generate api error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
