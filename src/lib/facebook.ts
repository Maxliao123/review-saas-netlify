/**
 * Facebook Graph API integration for Page Recommendations.
 * Facebook uses Recommend/Don't Recommend (binary), not 1-5 stars.
 * Normalized: Recommend → 5.0, Don't Recommend → 1.0
 */

const FB_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FB_REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/facebook/callback`
  : 'http://localhost:3000/api/auth/facebook/callback';

const FB_GRAPH_URL = 'https://graph.facebook.com/v19.0';

export function getFacebookOAuthUrl(tenantId: string, redirectTo?: string): string {
  const state = JSON.stringify({ tenant_id: tenantId, redirect_to: redirectTo });
  const scopes = ['pages_read_user_content', 'pages_show_list'].join(',');

  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;
}

export async function exchangeFacebookCode(
  code: string,
  tenantId: string
): Promise<{ pageId: string; pageName: string; pageAccessToken: string }> {
  // 1. Exchange code for short-lived user token
  const tokenUrl = `${FB_GRAPH_URL}/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}&code=${code}`;
  const tokenResp = await fetch(tokenUrl);
  if (!tokenResp.ok) throw new Error('Failed to exchange Facebook code');
  const { access_token: userToken } = await tokenResp.json();

  // 2. Exchange short-lived token for long-lived token
  const longUrl = `${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${userToken}`;
  const longResp = await fetch(longUrl);
  if (!longResp.ok) throw new Error('Failed to get long-lived token');
  const { access_token: longToken } = await longResp.json();

  // 3. Get user's pages
  const pagesResp = await fetch(`${FB_GRAPH_URL}/me/accounts?access_token=${longToken}`);
  if (!pagesResp.ok) throw new Error('Failed to fetch Facebook pages');
  const pagesData = await pagesResp.json();

  const pages = pagesData.data || [];
  if (pages.length === 0) throw new Error('No Facebook pages found');

  // Use first page (can expand to multi-page selection later)
  const page = pages[0];

  // 4. Store credentials in platform_credentials
  const { supabaseAdmin } = await import('@/lib/supabase/admin');

  await supabaseAdmin
    .from('platform_credentials')
    .upsert({
      tenant_id: tenantId,
      platform: 'facebook',
      account_identifier: page.id,
      access_token: page.access_token, // Page token (long-lived)
      refresh_token: longToken, // User long-lived token (for re-fetching page tokens)
      scopes: ['pages_read_user_content', 'pages_show_list'],
      meta: { page_name: page.name, page_id: page.id },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,platform' });

  return {
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
  };
}

export interface FacebookReview {
  id: string;
  reviewer: { name: string; id: string };
  recommendation_type: 'positive' | 'negative';
  review_text?: string;
  created_time: string;
}

export async function fetchFacebookReviews(
  pageId: string,
  pageAccessToken: string
): Promise<FacebookReview[]> {
  const url = `${FB_GRAPH_URL}/${pageId}/ratings?fields=reviewer,recommendation_type,review_text,created_time&access_token=${pageAccessToken}&limit=50`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`Facebook reviews fetch error: ${resp.status}`);
    return [];
  }
  const data = await resp.json();
  return data.data || [];
}

export function normalizeFacebookRating(recommendation: 'positive' | 'negative'): number {
  return recommendation === 'positive' ? 5.0 : 1.0;
}
