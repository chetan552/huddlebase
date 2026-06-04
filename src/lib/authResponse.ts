import { NextResponse } from 'next/server';
import { createSessionToken, type SessionUser } from '@/lib/session';

export function buildSessionUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar: string | null;
}): SessionUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
    };
}

export function setSessionCookie(response: NextResponse, token: string) {
    response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });
}

export function createLoginResponse(sessionUser: SessionUser) {
    const token = createSessionToken(sessionUser);
    const response = NextResponse.json({ success: true, data: sessionUser, token });
    setSessionCookie(response, token);
    return response;
}
