import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
];

const PUBLIC_API_PREFIXES = [
  '/api/store',
  '/api/generate',
  '/api/track',
  '/api/confirm',
  '/api/feedback',
  '/api/cron/',
  '/api/scan',
  '/api/auth/google-business', // OAuth flow endpoints
  '/api/billing/webhook', // Stripe webhook (verified by signature)
  '/api/webhooks/', // LINE and other webhooks (verified by signature)
  '/api/review/action', // Token-based review action page
  '/api/reviews/approve', // One-click approve from notification links
];

// Pages that don't require auth (token-secured)
const PUBLIC_PAGE_PREFIXES = [
  '/review/action', // Edit & publish page from notification links
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true;
  if (PUBLIC_PAGE_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true;
  // Static assets and Next.js internals
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon') || pathname.includes('.')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Only protect /admin/* and /api/admin/* routes
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // Forward pathname so layouts can detect current route
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-pathname', pathname);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Not authenticated — redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
