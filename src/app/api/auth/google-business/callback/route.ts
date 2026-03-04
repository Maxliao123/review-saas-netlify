import { NextResponse, type NextRequest } from 'next/server';
import { exchangeGoogleCode } from '@/lib/google-business';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const defaultRedirect = '/admin/settings/google';

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

    const { email } = await exchangeGoogleCode(code, tenant_id);

    return NextResponse.redirect(
      new URL(`${redirectBase}?google_connected=true&email=${encodeURIComponent(email || '')}`, request.url)
    );
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    const fallback = '/admin/settings/google';
    return NextResponse.redirect(
      new URL(`${fallback}?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
