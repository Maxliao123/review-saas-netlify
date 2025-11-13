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

const LANG_SUFFIXES = { En: 'En', Cn: 'Cn', Ko: 'Ko', Fr: 'Fr', Ja: 'Ja', Es: 'Es' };
// ✅ [修改] 新增 'cons'
const LIST_FIELD_BASES = ['top3', 'features', 'ambiance', 'newItems', 'cons'];

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';

// ---------- Utils ----------
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
  let cur = [], val = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"') {
      if (inQ && n === '"') { val += '"'; i++; } else { inQ = !inQ; }
    } else if (c === ',' && !inQ) {
      cur.push(val); val = '';
    } else if ((c === '\n' || (c === '\r' && n !== '\n')) && !inQ) {
      cur.push(val); rows.push(cur); cur = []; val = '';
    } else if (c === '\r' && n === '\n' && !inQ) {
      cur.push(val); rows.push(cur); cur = []; val = ''; i++;
    } else {
      val += c;
    }
  }
  cur.push(val); rows.push(cur);
  return rows;
}

function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], lower: [], objs: [] };
  const headers = rows[0].map(h => (h || '').toString().trim());
  const lower = headers.map(h => h.toLowerCase());
  const objs = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; obj[lower[i]] = row[i] ?? ''; });
    objs.push(obj);
  }
  return { headers, lower, objs };
}

function normalizeListCell(s) {
  if (!s) return '';
  const unified = String(s)
    .replace(/[、，；;]/g, ',')
    .split(',')
    .map(x => (x || '').trim())
    .filter(Boolean);
  const uniq = [];
  const seen = new Set();
  for (const x of unified) if (!seen.has(x)) { seen.add(x); uniq.push(x); }
  return uniq.join(',');
}

function normalizeDriveUrl(u) {
  if (!u) return '';
  try {
    const s = String(u).trim();
    if (/drive\.google\.com\/uc\?/.test(s)) return s;
    let m = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    m = s.match(/[?&]id=([^&]+)/);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    return s;
  } catch { return u; }
}

function absolutizeAsset(u, event) {
  if (!u) return '';
  const s = String(u).trim();
  if (s.startsWith('/')) {
    const host = event.headers['x-forwarded-host'] || event.headers.host || '';
    const proto = event.headers['x-forwarded-proto'] || 'https';
    return `${proto}://${host}${s}`;
  }
  return s;
}

function pickField(row, aliases) {
  for (const a of aliases) {
    if (a in row && row[a]) return row[a];
    const al = a.toLowerCase();
    if (al in row && row[al]) return row[al];
  }
  return '';
}

async function fetchSheetCSV() {
  const csvUrl = process.env.SHEET_CSV_URL;
  if (csvUrl) {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error(`Fetch SHEET_CSV_URL failed: ${res.status}`);
    return await res.text();
  }
  const id = process.env.SHEET_ID;
  const name = process.env.SHEET_NAME || DEFAULT_SHEET_NAME;
  if (!id) throw new Error('Missing SHEET_CSV_URL or SHEET_ID');
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch sheet CSV failed: ${res.status}`);
  return await res.text();
}

function buildPlacePhotoUrlFromRef(ref) {
  if (!ref || !GMAPS_KEY) return '';
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${PLACE_PHOTO_MAX}&photo_reference=${encodeURIComponent(ref)}&key=${encodeURIComponent(GMAPS_KEY)}`;
}

async function fetchFirstPhotoRefByPlaceId(placeId) {
  if (!placeId || !GMAPS_KEY) return '';
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${encodeURIComponent(GMAPS_KEY)}`;
    const r = await fetch(url);
    const j = await r.json();
    const ref = j?.result?.photos?.[0]?.photo_reference || '';
    return ref || '';
  } catch {
    return '';
  }
}

// ---------- Normalize one row ----------
function normalizeRowToStore(row, event) {
  const storeId   = String(pickField(row, ['StoreID'])).trim();
  const storeName = String(pickField(row, ['StoreName','Name'])).trim();
  const placeId   = String(pickField(row, ['PlaceID','GooglePlaceID'])).trim();

  let logoUrl = pickField(row, ['LOGO','Logo','LogoUrl']);
  let heroUrl = pickField(row, ['Hero圖片','Hero','HeroUrl','HeroImage']);
  logoUrl = absolutizeAsset(normalizeDriveUrl(logoUrl), event);
  heroUrl = absolutizeAsset(normalizeDriveUrl(heroUrl), event);

  // ✅ 新增：品牌主色（AD 欄）與主按鈕文字色（AE 欄）
  const themeBlue   = String(pickField(row, ['AD','ThemeBlue','BrandColor'])).trim();
  const themeOnBlue = String(pickField(row, ['AE','ThemeOnBlue','PrimaryTextColor'])).trim();

  const base = {
    top3:       normalizeListCell(pickField(row, ['top3','Top3Items'])),
    features:   normalizeListCell(pickField(row, ['features','StoreFeatures'])),
    ambiance:   normalizeListCell(pickField(row, ['ambiance'])),
    newItems:   normalizeListCell(pickField(row, ['newItems','新品','NewItems'])),
  };

  const multi = {};
  // ✅ [修改] AF/AG... 等 'cons' 相關欄位會在此處被自動讀取
  for (const sufKey of Object.keys(LANG_SUFFIXES)) {
    const suf = LANG_SUFFIXES[sufKey];
    for (const baseName of LIST_FIELD_BASES) {
      const colName = `${baseName}${suf}`;
      // ✅ [修改] 增加對 AF-AK 欄位別名的支援
      const aliases = [colName];
      if (baseName === 'cons') {
        if (suf === 'En') aliases.push('AF');
        if (suf === 'Cn') aliases.push('AG');
        if (suf === 'Ko') aliases.push('AH');
        if (suf === 'Fr') aliases.push('AI');
        if (suf === 'Ja') aliases.push('AJ');
        if (suf === 'Es') aliases.push('AK');
      }
      multi[colName] = normalizeListCell(pickField(row, aliases));
    }
  }

  const photoRef = pickField(row, ['placePhotoRef','photoReference','PlacePhotoRef']);
  const placePhotoUrl = photoRef ? buildPlacePhotoUrlFromRef(photoRef) : '';

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
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`);
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


