import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_SCOPES = ['openid', 'email', 'profile'];
const STATE_COOKIE = 'google_oauth_state';
const PUBLIC_ROLES = new Set(['COACH', 'PARENT', 'PLAYER']);

export interface GoogleOAuthState {
    csrf: string;
    next: string;
    role: string;
    flow: 'login' | 'signup';
}

export interface GoogleProfile {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    picture?: string;
}

function getAppUrl(req: NextRequest): string {
    return process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
}

export function getGoogleRedirectUri(req: NextRequest): string {
    return `${getAppUrl(req).replace(/\/$/, '')}/api/auth/google/callback`;
}

export function hasGoogleOAuthConfig(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleOAuthConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    }

    return { clientId, clientSecret };
}

export function normalizeOAuthRole(role: string | null): string {
    return role && PUBLIC_ROLES.has(role) ? role : 'PLAYER';
}

export function isValidOAuthRole(role: string | null): role is string {
    return Boolean(role && PUBLIC_ROLES.has(role));
}

export function normalizeOAuthNext(next: string | null): string {
    if (!next || !next.startsWith('/') || next.startsWith('//')) {
        return '/dashboard';
    }

    return next;
}

function encodeState(state: GoogleOAuthState): string {
    return Buffer.from(JSON.stringify(state), 'utf-8').toString('base64url');
}

function decodeState(value: string): GoogleOAuthState | null {
    try {
        const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf-8')) as GoogleOAuthState;
        if (!parsed.csrf || !parsed.next || !parsed.role) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function createGoogleAuthorizationResponse(req: NextRequest) {
    const { clientId } = getGoogleOAuthConfig();
    const csrf = randomBytes(24).toString('base64url');
    const next = normalizeOAuthNext(req.nextUrl.searchParams.get('next'));
    const rawRole = req.nextUrl.searchParams.get('role');
    const flow = req.nextUrl.searchParams.get('flow') === 'signup' ? 'signup' : 'login';
    const role = normalizeOAuthRole(rawRole);
    const state = encodeState({ csrf, next, role, flow });
    const url = new URL(GOOGLE_AUTH_URL);

    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', getGoogleRedirectUri(req));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GOOGLE_SCOPES.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');

    const response = NextResponse.redirect(url);
    response.cookies.set(STATE_COOKIE, csrf, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10,
        path: '/',
    });
    return response;
}

export function readAndValidateGoogleState(req: NextRequest): GoogleOAuthState | null {
    const state = req.nextUrl.searchParams.get('state');
    const cookieCsrf = req.cookies.get(STATE_COOKIE)?.value;
    if (!state || !cookieCsrf) return null;

    const decoded = decodeState(state);
    if (!decoded || decoded.csrf !== cookieCsrf) return null;

    return decoded;
}

export function clearGoogleStateCookie(response: NextResponse) {
    response.cookies.set(STATE_COOKIE, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });
}

export async function exchangeGoogleCode(req: NextRequest, code: string) {
    const { clientId, clientSecret } = getGoogleOAuthConfig();
    const body = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleRedirectUri(req),
        grant_type: 'authorization_code',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!response.ok) {
        throw new Error('Google token exchange failed');
    }

    return response.json() as Promise<{ access_token: string }>;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Google profile fetch failed');
    }

    return response.json() as Promise<GoogleProfile>;
}
