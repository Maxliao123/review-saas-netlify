import { NextResponse, type NextRequest } from 'next/server';
import { exchangeFacebookCode } from '@/lib/facebook';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const defaultRedirect = '/admin/settings/platforms';

    if (error) {
      return NextResponse.redirect(
        new URL(`${defaultRedirect}?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`${defaultRedirect}?error=missing_params`, request.url)
      );
    }

    const { tenant_id, redirect_to } = JSON.parse(state);
    const redirectBase = redirect_to || defaultRedirect;

    if (!tenant_id) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=invalid_state`, request.url)
      );
    }

    const { pageName } = await exchangeFacebookCode(code, tenant_id);

    return NextResponse.redirect(
      new URL(`${redirectBase}?facebook_connected=true&page=${encodeURIComponent(pageName)}`, request.url)
    );
  } catch (error: any) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/admin/settings/platforms?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
