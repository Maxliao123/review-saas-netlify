// functions/store.js
// GET /api/store?storeid=xxx
//
// 強化版：
// - SHEET_CSV_URL 或 SHEET_ID+SHEET_NAME 擇一讀表（CSV）
// - 多語欄位：En/Cn/Ko/Fr/Ja/Es ⇒ top3XX, featuresXX, ambianceXX, newItemsXX
// - 逗號/頓號/分號正規化、trim、去重
// - Drive 連結自動轉 uc?export=view&id=...；/assets/... 轉絕對 URL
// - placePhotoUrl：先讀表的 placePhotoRef；沒有就用 Place Details 拿第一張
// - CORS + OPTIONS、Cache-Control: public, max-age=60

const DEFAULT_SHEET_NAME = '工作表1';
const PLACE_PHOTO_MAX = 1000;

const { Pool } = require('pg');

// 對應 generator_tags.question_key → 前端使用的 base key
const QUESTION_KEY_TO_BASE = {
  main_impression: 'top3',
  features: 'features',
  occasion: 'ambiance',
  cons: 'cons',
};

const pgPool = process.env.SUPABASE_PG_URL
  ? new Pool({
      connectionString: process.env.SUPABASE_PG_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

function localeToSuffix(locale) {
  const l = String(locale || '').toLowerCase();
  if (!l) return 'Cn';               // 預設當成中文
  if (l.startsWith('zh')) return 'Cn';
  if (l.startsWith('en')) return 'En';
  if (l.startsWith('ko')) return 'Ko';
  if (l.startsWith('ja')) return 'Ja';
  if (l.startsWith('fr')) return 'Fr';
  if (l.startsWith('es')) return 'Es';
  return null;
}

const LANG_SUFFIXES = { En: 'En', Cn: 'Cn', Ko: 'Ko', Fr: 'Fr', Ja: 'Ja', Es: 'Es' };
// ✅ [修改] 新增 'cons'
const LIST_FIELD_BASES = ['top3', 'features', 'ambiance', 'newItems', 'cons'];

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';

// --------- 共用工具 ---------

function jsonResponse(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
}

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        current.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (field !== '' || current.length > 0) {
          current.push(field);
          rows.push(current);
          current = [];
          field = '';
        }
      } else {
        field += c;
      }
    }
  }

  if (field !== '' || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

function rowsToObjects(rows) {
  if (!rows || rows.length === 0) return { headers: [], objs: [] };
  const headers = rows[0].map(h => h.trim());
  const objs = rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] !== undefined ? r[i] : '';
    });
    return obj;
  });
  return { headers, objs };
}

function normalizeList(str) {
  if (!str) return [];
  const raw = String(str)
    .replace(/[、；;]/g, ',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return Array.from(new Set(raw));
}

function normalizeDriveUrl(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';
  if (/^https?:\/\/drive\.google\.com\/file\/d\//.test(u)) {
    const m = u.match(/\/file\/d\/([^/]+)/);
    if (m && m[1]) {
      return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    }
  }
  if (/^\/assets\//.test(u)) {
    const base = process.env.ASSETS_BASE_URL || '';
    if (base) return base.replace(/\/+$/, '') + u;
  }
  return u;
}

// 讀 Sheet CSV
async function fetchSheetCSV() {
  const csvUrl = process.env.SHEET_CSV_URL;
  if (csvUrl) {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error(`fetch SHEET_CSV_URL failed: ${res.status}`);
    return await res.text();
  }

  const sheetId = process.env.SHEET_ID;
  const sheetName = process.env.SHEET_NAME || DEFAULT_SHEET_NAME;
  if (!sheetId) throw new Error('Missing SHEET_CSV_URL or SHEET_ID');
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch Sheet CSV via gviz failed: ${res.status}`);
  return await res.text();
}

// Google Maps Place Photo
async function fetchFirstPhotoRefByPlaceId(placeId) {
  if (!placeId || !GMAPS_KEY) return '';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId
  )}&fields=photos&key=${encodeURIComponent(GMAPS_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('fetchPlaceDetails failed:', res.status, await res.text());
    return '';
  }
  const json = await res.json();
  const ref = json?.result?.photos?.[0]?.photo_reference || '';
  return ref || '';
}

function buildPlacePhotoUrlFromRef(ref) {
  if (!ref || !GMAPS_KEY) return '';
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${PLACE_PHOTO_MAX}&photo_reference=${encodeURIComponent(
    ref
  )}&key=${encodeURIComponent(GMAPS_KEY)}`;
}

function pickField(row, keys, fallback = '') {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  return fallback;
}

function buildMultiLangLists(row, baseName) {
  const result = {};
  const baseKey = baseName;

  const baseList = normalizeList(row[baseKey]);
  if (baseList.length > 0) {
    result[baseKey] = baseList.join(',');
  }

  Object.keys(LANG_SUFFIXES).forEach(suffixKey => {
    const suffix = LANG_SUFFIXES[suffixKey];
    const col = `${baseKey}${suffix}`;
    const list = normalizeList(row[col]);
    if (list.length > 0) {
      result[col] = list.join(',');
    }
  });

  return result;
}

function normalizeRowToStore(row, event) {
  const storeId = pickField(row, ['StoreID', 'storeid', 'id']);
  const storeName = pickField(row, ['Name', 'name', 'StoreName']);
  const placeId = pickField(row, ['PlaceID', 'placeId']);
  const logo = pickField(row, ['logo', 'Logo']);
  const hero = pickField(row, ['hero', 'Hero', 'Cover', 'Banner']);

  const placePhotoRef = pickField(row, ['placePhotoRef','photoReference','PlacePhotoRef']);
  const placePhotoUrl = placePhotoRef ? buildPlacePhotoUrlFromRef(placePhotoRef) : '';

  const logoUrl = normalizeDriveUrl(logo);
  const heroUrl = normalizeDriveUrl(hero);

  const themeBlue = pickField(row, ['themeBlue', 'ThemeBlue', 'primaryColor'], '#0A84FF');
  const themeOnBlue = pickField(row, ['themeOnBlue', 'ThemeOnBlue', 'onPrimaryColor'], '#FFFFFF');

  let base = {};
  LIST_FIELD_BASES.forEach(fieldBase => {
    const val = normalizeList(row[fieldBase]);
    if (val.length > 0) {
      base[fieldBase] = val.join(',');
    }
  });

  let multi = {};
  LIST_FIELD_BASES.forEach(fieldBase => {
    multi = {
      ...multi,
      ...buildMultiLangLists(row, fieldBase),
    };
  });

  return {
    storeid: storeId,
    name: storeName || storeId,
    placeId,
    logoUrl,
    heroUrl,
    placePhotoUrl,
    // ✅ 輸出給前端
    themeBlue,
    themeOnBlue,
    ...base,
    ...multi,
  };
}

// ---------- Supabase TAG overlay ----------

async function buildTagOverlayFromSupabase(storeSlug) {
  if (!pgPool || !storeSlug) return null;
  const slugLower = String(storeSlug).trim().toLowerCase();
  if (!slugLower) return null;

  try {
    // 先找對應的 store.id
    const { rows: storeRows } = await pgPool.query(
      'select id from public.stores where lower(slug) = $1 limit 1',
      [slugLower]
    );
    if (!storeRows || storeRows.length === 0) return null;
    const storeId = storeRows[0].id;

    // 讀取該 store 的啟用 TAG
    const { rows: tagRows } = await pgPool.query(
      `select question_key, label, locale
         from public.generator_tags
        where store_id = $1
          and is_active = true
        order by question_key, order_index, label`,
      [storeId]
    );
    if (!tagRows || tagRows.length === 0) return null;

    const buckets = {};

    for (const row of tagRows) {
      const baseKey = QUESTION_KEY_TO_BASE[row.question_key];
      const suffix = localeToSuffix(row.locale);
      const label = (row.label || '').trim();
      if (!baseKey || !suffix || !label) continue;

      const keyWithSuffix = `${baseKey}${suffix}`;
      if (!buckets[keyWithSuffix]) buckets[keyWithSuffix] = [];
      buckets[keyWithSuffix].push(label);

      // baseKey（不帶語系）暫時用中文版本當預設
      if (suffix === 'Cn') {
        if (!buckets[baseKey]) buckets[baseKey] = [];
        buckets[baseKey].push(label);
      }
    }

    const overlay = {};
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

// ---------- Handler ----------

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }
  if (event.httpMethod !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const url = new URL(
      event.rawUrl ||
        `https://${event.headers.host}${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`
    );
    const storeid = (url.searchParams.get('store') || url.searchParams.get('storeid') || '').trim();
    if (!storeid) return jsonResponse({ error: 'Missing storeid' }, 400);

    // 讀表（CSV）
    const csv = await fetchSheetCSV();

    const rows = parseCSV(csv);
    const { objs } = rowsToObjects(rows);

    // 比對 StoreID（大小寫不敏感）
    const row = objs.find(o => {
      const a = (o.StoreID || o.storeid || '').toString().trim().toLowerCase();
      return a === storeid.toLowerCase();
    });
    if (!row) return jsonResponse({ error: `StoreID not found: ${storeid}` }, 404);

    // 正規化
    let payload = normalizeRowToStore(row, event);

    // 從 Supabase generator_tags 覆蓋問卷標籤（若有）
    try {
      const overlay = await buildTagOverlayFromSupabase(storeid);
      if (overlay) {
        payload = { ...payload, ...overlay };
      }
    } catch (e) {
      console.error('Supabase tag overlay failed:', e);
    }

    // 若 placePhotoUrl 還是空，而有 placeId + 金鑰，就嘗試用 Place Details
    if (!payload.placePhotoUrl && payload.placeId && GMAPS_KEY) {
      const ref = await fetchFirstPhotoRefByPlaceId(payload.placeId);
      if (ref) payload.placePhotoUrl = buildPlacePhotoUrlFromRef(ref);
    }

    return jsonResponse(payload, 200);
  } catch (err) {
    console.error('store handler error:', err);
    return jsonResponse({ error: String(err.message || err) }, 500);
  }
};



