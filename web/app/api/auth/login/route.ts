
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { password } = body;

        // Simple Environment variable check
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

        if (password === adminPassword) {
            const response = NextResponse.json({ success: true });

            // Set simple auth cookie
            // In production, use HttpOnly, Secure, etc.
            response.cookies.set('auth_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 60 * 60 * 24 // 1 day
            });

            return response;
        }

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
