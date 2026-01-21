
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Define protected routes
    const protectedRoutes = ['/admin', '/grading'];
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

    // Check for auth cookie
    const isAuthenticated = request.cookies.has('auth_session');

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', path); // Remember where they wanted to go
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/grading/:path*',
    ],
};
