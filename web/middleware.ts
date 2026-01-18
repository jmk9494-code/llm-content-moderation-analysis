import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // 1. Force HTTPS in Production
    // Checks for x-forwarded-proto (standard for proxies like Vercel, AWS LB, etc.)
    if (process.env.NODE_ENV === 'production') {
        const proto = request.headers.get('x-forwarded-proto');
        if (proto === 'http') {
            const httpsUrl = new URL(request.url);
            httpsUrl.protocol = 'https:';
            return NextResponse.redirect(httpsUrl, 301);
        }
    }

    const response = NextResponse.next();

    // 2. Strict Content Security Policy (Middleware allows dynamic/nonce injection if needed later)
    // We align this with next.config.ts but applying it at the edge ensures it catches everything.
    const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://img.logo.dev;
    font-src 'self';
    connect-src 'self' https://vitals.vercel-insights.com;
    frame-ancestors 'none';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

    // Set Security Headers
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

    return response;
}

export const config = {
    matcher: [
        // Match all request paths except api, _next, static, files
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
