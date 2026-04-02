import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/widget/[storeSlug]?theme=light|dark&max=5|10|15&layout=carousel|grid|badge
 *
 * Public endpoint — returns a self-executing JS snippet that renders
 * a shadow-DOM review widget on the merchant's site.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeSlug: string }> }
) {
  const { storeSlug } = await params;
  const { searchParams } = new URL(request.url);

  const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  const max = Math.min(Math.max(parseInt(searchParams.get('max') || '5', 10), 1), 15);
  const layout = (['carousel', 'grid', 'badge'].includes(searchParams.get('layout') || '')
    ? searchParams.get('layout')!
    : 'carousel') as 'carousel' | 'grid' | 'badge';

  try {
    // 1. Look up the store
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, name, slug')
      .eq('slug', storeSlug)
      .single();

    if (storeErr || !store) {
      // Sanitize storeSlug to prevent JS comment injection via */
      const safeSlug = storeSlug.replace(/\*\//g, '').replace(/[^\w-]/g, '');
      return new NextResponse(
        `/* ReplyWise Widget: store "${safeSlug}" not found */`,
        { status: 404, headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }
      );
    }

    // 2. Fetch recent published reviews
    const { data: reviews } = await supabaseAdmin
      .from('reviews_raw')
      .select('id, author_name, rating, content, created_at')
      .eq('store_id', store.id)
      .gte('rating', 1)
      .order('created_at', { ascending: false })
      .limit(max);

    const safeReviews = (reviews || []).map((r) => ({
      id: r.id,
      author: r.author_name || 'Anonymous',
      rating: r.rating,
      text: r.content || '',
      date: r.created_at,
    }));

    // 3. Compute average rating
    const avgRating =
      safeReviews.length > 0
        ? safeReviews.reduce((sum, r) => sum + r.rating, 0) / safeReviews.length
        : 0;

    // 4. Build JS widget
    const widgetJs = buildWidgetScript({
      storeName: store.name,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: safeReviews.length,
      reviews: safeReviews,
      theme,
      layout,
    });

    return new NextResponse(widgetJs, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('Widget error:', err);
    // Don't leak internal error details to the public response
    return new NextResponse(
      `/* ReplyWise Widget: internal error */`,
      { status: 500, headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Widget JS builder                                                  */
/* ------------------------------------------------------------------ */

interface WidgetData {
  storeName: string;
  avgRating: number;
  totalReviews: number;
  reviews: { id: string | number; author: string; rating: number; text: string; date: string }[];
  theme: 'light' | 'dark';
  layout: 'carousel' | 'grid' | 'badge';
}

function buildWidgetScript(data: WidgetData): string {
  const jsonData = JSON.stringify(data);

  return `(function(){
"use strict";
var DATA=${jsonData};

/* ── helpers ── */
function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
function stars(n){var s="";for(var i=1;i<=5;i++){s+='<svg width="16" height="16" viewBox="0 0 20 20" fill="'+(i<=n?"#FBBF24":"#D1D5DB")+'" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.025 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>';}return s;}
function ago(d){var diff=Date.now()-new Date(d).getTime();var days=Math.floor(diff/86400000);if(days<1)return "today";if(days===1)return "1 day ago";if(days<30)return days+" days ago";var m=Math.floor(days/30);return m===1?"1 month ago":m+" months ago";}
function truncate(s,n){return s.length>n?s.slice(0,n)+"…":s;}

/* ── colors ── */
var isDark=DATA.theme==="dark";
var bg=isDark?"#1F2937":"#FFFFFF";
var cardBg=isDark?"#374151":"#F9FAFB";
var textPrimary=isDark?"#F9FAFB":"#111827";
var textSecondary=isDark?"#9CA3AF":"#6B7280";
var border=isDark?"#4B5563":"#E5E7EB";

/* ── mount ── */
var host=document.currentScript&&document.currentScript.parentElement||document.body;
var wrapper=document.createElement("div");
wrapper.id="rw-widget-"+Date.now();
host.appendChild(wrapper);
var shadow=wrapper.attachShadow({mode:"open"});

/* ── badge layout ── */
if(DATA.layout==="badge"){
  shadow.innerHTML='<style>'+
    '.rw-badge{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:12px;background:'+bg+';border:1px solid '+border+';font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:'+textPrimary+';}'+
    '.rw-badge-stars{display:flex;align-items:center;gap:2px;}'+
    '.rw-badge-rating{font-size:18px;font-weight:700;}'+
    '.rw-badge-count{font-size:12px;color:'+textSecondary+';}'+
    '.rw-powered{margin-top:4px;font-size:10px;color:'+textSecondary+';text-align:center;}'+
    '.rw-powered a{color:'+textSecondary+';text-decoration:underline;}'+
  '</style>'+
  '<div class="rw-badge">'+
    '<div class="rw-badge-stars">'+stars(Math.round(DATA.avgRating))+'</div>'+
    '<span class="rw-badge-rating">'+DATA.avgRating+'</span>'+
    '<span class="rw-badge-count">'+DATA.totalReviews+' reviews</span>'+
  '</div>'+
  '<div class="rw-powered">Powered by <a href="https://www.replywiseai.com" target="_blank" rel="noopener">ReplyWise AI</a></div>';
  return;
}

/* ── card HTML builder ── */
function cardHtml(r){
  return '<div class="rw-card">'+
    '<div class="rw-card-header">'+
      '<div class="rw-avatar">'+esc(r.author.charAt(0).toUpperCase())+'</div>'+
      '<div class="rw-meta">'+
        '<div class="rw-author">'+esc(r.author)+'</div>'+
        '<div class="rw-date">'+ago(r.date)+'</div>'+
      '</div>'+
      '<div class="rw-stars">'+stars(r.rating)+'</div>'+
    '</div>'+
    (r.text?'<p class="rw-text">'+esc(truncate(r.text,180))+'</p>':'')+
  '</div>';
}

/* ── styles ── */
var css=
  '*{box-sizing:border-box;margin:0;padding:0;}'+
  ':host{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}'+
  '.rw-root{background:'+bg+';border:1px solid '+border+';border-radius:16px;padding:24px;max-width:720px;color:'+textPrimary+';}'+
  '.rw-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;}'+
  '.rw-header-stars{display:flex;gap:2px;}'+
  '.rw-header-info h3{font-size:16px;font-weight:700;}'+
  '.rw-header-info p{font-size:13px;color:'+textSecondary+';}'+
  '.rw-cards{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;scrollbar-width:thin;}'+
  '.rw-cards.rw-grid{flex-wrap:wrap;overflow-x:visible;}'+
  '.rw-card{flex:0 0 280px;scroll-snap-align:start;background:'+cardBg+';border:1px solid '+border+';border-radius:12px;padding:16px;}'+
  '.rw-grid .rw-card{flex:1 1 280px;min-width:240px;}'+
  '.rw-card-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;}'+
  '.rw-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3B82F6,#6366F1);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;}'+
  '.rw-meta{flex:1;min-width:0;}'+
  '.rw-author{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'+
  '.rw-date{font-size:11px;color:'+textSecondary+';}'+
  '.rw-stars{display:flex;gap:1px;flex-shrink:0;}'+
  '.rw-text{font-size:13px;line-height:1.5;color:'+textSecondary+';}'+
  '.rw-powered{margin-top:16px;font-size:11px;color:'+textSecondary+';text-align:center;}'+
  '.rw-powered a{color:'+textSecondary+';text-decoration:underline;}'+
  '.rw-nav{display:flex;justify-content:center;gap:8px;margin-top:12px;}'+
  '.rw-nav button{width:28px;height:28px;border-radius:50%;border:1px solid '+border+';background:'+cardBg+';color:'+textPrimary+';cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;}'+
  '.rw-nav button:hover{background:'+border+';}';

/* ── build HTML ── */
var cardsHtml=DATA.reviews.map(cardHtml).join("");
var layoutClass=DATA.layout==="grid"?"rw-cards rw-grid":"rw-cards";

var html='<style>'+css+'</style>'+
  '<div class="rw-root">'+
    '<div class="rw-header">'+
      '<div class="rw-header-stars">'+stars(Math.round(DATA.avgRating))+'</div>'+
      '<div class="rw-header-info">'+
        '<h3>'+esc(DATA.storeName)+'</h3>'+
        '<p>'+DATA.avgRating+' average from '+DATA.totalReviews+' reviews</p>'+
      '</div>'+
    '</div>'+
    '<div class="'+layoutClass+'" id="rw-track">'+cardsHtml+'</div>'+
    (DATA.layout==="carousel"?'<div class="rw-nav"><button id="rw-prev">&#8249;</button><button id="rw-next">&#8250;</button></div>':'')+
    '<div class="rw-powered">Powered by <a href="https://www.replywiseai.com" target="_blank" rel="noopener">ReplyWise AI</a></div>'+
  '</div>';

shadow.innerHTML=html;

/* ── carousel nav ── */
if(DATA.layout==="carousel"){
  var track=shadow.getElementById("rw-track");
  var prev=shadow.getElementById("rw-prev");
  var next=shadow.getElementById("rw-next");
  if(track&&prev&&next){
    prev.addEventListener("click",function(){track.scrollBy({left:-296,behavior:"smooth"});});
    next.addEventListener("click",function(){track.scrollBy({left:296,behavior:"smooth"});});
  }
}
})();`;
}
