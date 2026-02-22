import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    // Handle CORS for mobile app and other origins during development
    const origin = req.headers.get('origin') || '';
    const allowedOrigins = ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:19000'];

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        const res = new NextResponse(null, { status: 204 });
        if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
            res.headers.set('Access-Control-Allow-Origin', origin);
            res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.headers.set('Access-Control-Allow-Credentials', 'true');
            res.headers.set('Access-Control-Max-Age', '86400');
        }
        return res;
    }

    // Add CORS headers to all API responses
    const res = NextResponse.next();
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        res.headers.set('Access-Control-Allow-Origin', origin);
        res.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return res;
}

export const config = {
    matcher: '/api/:path*',
};
