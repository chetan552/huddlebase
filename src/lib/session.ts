import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export interface SessionUser {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string | null;
}

function base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf-8').toString('base64url');
}

function base64UrlDecode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf-8');
}

function getSessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (secret) return secret;

    if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET is required in production');
    }

    return 'huddlebase-dev-session-secret';
}

function signPayload(payload: string): string {
    return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function createSessionToken(user: SessionUser): string {
    const payload = base64UrlEncode(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar ?? null,
    }));
    return `${payload}.${signPayload(payload)}`;
}

export function verifySessionToken(token: string): SessionUser | null {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSignature = signPayload(payload);
    const provided = Buffer.from(signature, 'base64url');
    const expected = Buffer.from(expectedSignature, 'base64url');

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        return null;
    }

    try {
        const parsed = JSON.parse(base64UrlDecode(payload)) as SessionUser;
        if (!parsed.id || !parsed.email || !parsed.name || !parsed.role) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Extract the session user from either a cookie (web) or Authorization header (mobile).
 * Returns the parsed user object, or null if no valid session is found.
 */
export function getSessionUser(req: NextRequest): SessionUser | null {
    // 1. Check session cookie (web)
    const sessionCookie = req.cookies.get('session');
    if (sessionCookie?.value) {
        return verifySessionToken(sessionCookie.value);
    }

    // 2. Check Authorization header (mobile)
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return verifySessionToken(authHeader.slice(7));
    }

    return null;
}
