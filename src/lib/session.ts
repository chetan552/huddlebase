import { NextRequest } from 'next/server';

/**
 * Extract the session user from either a cookie (web) or Authorization header (mobile).
 * Returns the parsed user object, or null if no valid session is found.
 */
export function getSessionUser(req: NextRequest): { id: string; email: string; name: string; role: string; avatar?: string } | null {
    // 1. Check session cookie (web)
    const sessionCookie = req.cookies.get('session');
    if (sessionCookie?.value) {
        try {
            return JSON.parse(sessionCookie.value);
        } catch {
            return null;
        }
    }

    // 2. Check Authorization header (mobile)
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.slice(7);
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    }

    return null;
}
