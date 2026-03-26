import { NextRequest, NextResponse } from 'next/server';
import { supabase, checkEnv } from '@/lib/db';
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const DEFAULT_THEME_BLUE = '#0A84FF';
const DEFAULT_THEME_ON_BLUE = '#FFFFFF';
const PLACE_PHOTO_MAX = 1000;
const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';

const LANG_SUFFIXES: Record<string, string> = { En: 'En', Cn: 'Cn', Ko: 'Ko', Fr: 'Fr', Ja: 'Ja', Es: 'Es' };

const QUESTION_KEY_TO_BASE: Record<string, string> = {
    main_impression: 'top3',
    features: 'features',
    occasion: 'ambiance',
    cons: 'cons',
};

function jsonResponse(body: any, status = 200) {
    return NextResponse.json(body, {
        status,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Cache-Control': 'public, max-age=60',
        },
    });
}

function normalizeList(str: string | undefined): string[] {
    if (!str) return [];
    const raw = String(str)
        .replace(/[、；;]/g, ',')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    return Array.from(new Set(raw));
}

function normalizeDriveUrl(url: string | undefined): string {
    if (!url) return '';
    const u = String(url).trim();
    if (!u) return '';
    if (/^https?:\/\/drive\.google\.com\/file\/d\//.test(u)) {
        const m = u.match(/\/file\/d\/([^/]+)/);
        if (m && m[1]) {
            return `https://drive.google.com/uc?export=view&id=${m[1]}`;
        }
    }
    return u;
}

async function fetchFirstPhotoRefByPlaceId(placeId: string): Promise<string> {
    if (!placeId || !GMAPS_KEY) return '';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
    )}&fields=photos&key=${encodeURIComponent(GMAPS_KEY)}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error('fetchPlaceDetails failed:', res.status);
            return '';
        }
        const json = await res.json();
        const ref = json?.result?.photos?.[0]?.photo_reference || '';
        return ref || '';
    } catch (e) {
        console.error('fetchFirstPhotoRefByPlaceId error:', e);
        return '';
    }
}

function buildPlacePhotoUrlFromRef(ref: string): string {
    if (!ref || !GMAPS_KEY) return '';
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${PLACE_PHOTO_MAX}&photo_reference=${encodeURIComponent(
        ref
    )}&key=${encodeURIComponent(GMAPS_KEY)}`;
}

function localeToSuffix(locale: string) {
    const l = String(locale || '').toLowerCase();
    if (!l) return 'Cn';
    if (l.startsWith('zh')) return 'Cn';
    if (l.startsWith('en')) return 'En';
    if (l.startsWith('ko')) return 'Ko';
    if (l.startsWith('ja')) return 'Ja';
    if (l.startsWith('fr')) return 'Fr';
    if (l.startsWith('es')) return 'Es';
    return null;
}

async function buildTagOverlayFromSupabase(storeId: any) {
    if (!storeId) return null;

    try {
        const { data: tagRows, error: tagError } = await supabase
            .from('generator_tags')
            .select('question_key, label, locale')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .order('order_index', { ascending: true });

        if (tagError || !tagRows || tagRows.length === 0) return null;

        const buckets: Record<string, string[]> = {};

        for (const row of tagRows) {
            const baseKey = QUESTION_KEY_TO_BASE[row.question_key];
            const suffix = localeToSuffix(row.locale);
            const label = (row.label || '').trim();
            if (!baseKey || !suffix || !label) continue;

            const keyWithSuffix = `${baseKey}${suffix}`;
            if (!buckets[keyWithSuffix]) buckets[keyWithSuffix] = [];
            buckets[keyWithSuffix].push(label);

            // fallback
            if (suffix === 'Cn') {
                if (!buckets[baseKey]) buckets[baseKey] = [];
                buckets[baseKey].push(label);
            }
        }

        const overlay: Record<string, string> = {};
        for (const [key, list] of Object.entries(buckets)) {
            const uniq = Array.from(new Set(list.map(s => s.trim()).filter(Boolean)));
            overlay[key] = uniq.join(',');
        }
        return overlay;
    } catch (err) {
        console.error('buildTagOverlayFromSupabase error:', err);
        return null;
    }
}

export async function GET(request: NextRequest) {
    // Rate limit check
    const ip = getClientIP(request);
    const rl = checkRateLimit(`store:${ip}`, RATE_LIMITS.store);
    const rlResp = rateLimitResponse(rl);
    if (rlResp) return rlResp;

    try {
        // Debug
        checkEnv();

        const { searchParams } = new URL(request.url);
        const storeSlug = (searchParams.get('store') || searchParams.get('storeid') || '').trim();

        if (!storeSlug) return jsonResponse({ error: 'Missing storeid' }, 400);

        // 1. Fetch Store Config from Supabase ONLY
        // We assume the schema has fields that loosely match what we need, OR we construct defaults.
        // Based on user request, this is the single source of truth.

        const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('slug', storeSlug.toLowerCase())
            .single();

        if (storeError || !storeData) {
            console.warn(`Store not found in Supabase: ${storeSlug}`, storeError?.message);
            return jsonResponse({ error: `Store not found: ${storeSlug}` }, 404);
        }

        // 2. Map DB fields to Frontend Payload
        // Note: The DB columns might be snake_case vs the camelCase expected by frontend.
        // We need to map them. If columns don't exist, we send empty strings.
        // Assuming standard columns might vary, we try to be robust.

        const id = storeData.id;
        const name = storeData.name || storeData.display_name || storeSlug;
        const placeId = storeData.place_id || '';
        const logoUrl = normalizeDriveUrl(storeData.logo_url || storeData.logo) || `/${storeSlug}-logo.webp`;
        const heroUrl = normalizeDriveUrl(storeData.hero_url || storeData.hero || storeData.cover_url) || `/${storeSlug}-hero.webp`;

        const themeBlue = storeData.theme_blue || storeData.primary_color || DEFAULT_THEME_BLUE;
        const themeOnBlue = storeData.theme_on_blue || storeData.on_primary_color || DEFAULT_THEME_ON_BLUE;

        // Use empty lists as base, rely on Overlay for tags if they are in generator_tags table
        // OR if they are in stores table, map them.
        // Legacy Sheet logic had columns like 'top3', 'features'. 
        // If Supabase table has them, use them.

        const payload: any = {
            id,
            storeid: storeSlug,
            name,
            placeId,
            logoUrl,
            heroUrl,
            placePhotoUrl: '', // Will fetch below
            themeBlue,
            themeOnBlue,
        };

        // 3. Supabase Generator Tags — raw tags + legacy overlay
        try {
            const { data: rawTagRows } = await supabase
                .from('generator_tags')
                .select('question_key, label, locale')
                .eq('store_id', id)
                .eq('is_active', true)
                .order('order_index', { ascending: true });

            if (rawTagRows && rawTagRows.length > 0) {
                payload.rawTags = rawTagRows;
            }

            // Also build legacy overlay for backward compat
            const overlay = await buildTagOverlayFromSupabase(id);
            if (overlay) {
                Object.assign(payload, overlay);
            }
        } catch (e) {
            console.error('Supabase tag overlay failed:', e);
        }

        // 4. Tenant-level referral code + white-label config
        const tenantId = storeData.tenant_id;
        if (tenantId) {
            try {
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('referral_code, plan')
                    .eq('id', tenantId)
                    .single();

                if (tenant?.referral_code) {
                    payload.referralCode = tenant.referral_code;
                }
                payload.tenantPlan = tenant?.plan || 'free';

                const { data: wlConfig } = await supabase
                    .from('whitelabel_config')
                    .select('hide_powered_by, is_active')
                    .eq('tenant_id', tenantId)
                    .single();

                if (wlConfig?.is_active && wlConfig?.hide_powered_by) {
                    payload.hidePoweredBy = true;
                }
            } catch (e) {
                // Tenant info is non-critical, continue without it
            }
        }

        // 5. Place Photo Fallback
        if (!payload.placePhotoUrl && placeId && GMAPS_KEY) {
            const ref = await fetchFirstPhotoRefByPlaceId(placeId);
            if (ref) {
                payload.placePhotoUrl = buildPlacePhotoUrlFromRef(ref);
            }
        }

        return jsonResponse(payload, 200);

    } catch (err: any) {
        console.error('store handler error:', err);
        return jsonResponse({ error: String(err.message || err) }, 500);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
