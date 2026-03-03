import { NextResponse, type NextRequest } from 'next/server';
import { exchangeGoogleCode } from '@/lib/google-business';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/admin/settings/google?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/settings/google?error=missing_params', request.url)
      );
    }

    const { tenant_id } = JSON.parse(state);

    if (!tenant_id) {
      return NextResponse.redirect(
        new URL('/admin/settings/google?error=invalid_state', request.url)
      );
    }

    const { email } = await exchangeGoogleCode(code, tenant_id);

    return NextResponse.redirect(
      new URL(`/admin/settings/google?success=true&email=${encodeURIComponent(email || '')}`, request.url)
    );
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/admin/settings/google?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
