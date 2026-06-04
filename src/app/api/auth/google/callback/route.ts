import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildSessionUser, setSessionCookie } from '@/lib/authResponse';
import { createSessionToken } from '@/lib/session';
import {
    clearGoogleStateCookie,
    exchangeGoogleCode,
    fetchGoogleProfile,
    readAndValidateGoogleState,
} from '@/lib/googleOAuth';

const TWO_FACTOR_GOOGLE_ERROR = 'GOOGLE_TWO_FACTOR_ENABLED';
const GOOGLE_SIGNUP_REQUIRED_ERROR = 'GOOGLE_SIGNUP_REQUIRED';

function redirectWithError(req: NextRequest, error: string) {
    const response = NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
    clearGoogleStateCookie(response);
    return response;
}

export async function GET(req: NextRequest) {
    try {
        const code = req.nextUrl.searchParams.get('code');
        const oauthError = req.nextUrl.searchParams.get('error');
        const state = readAndValidateGoogleState(req);

        if (oauthError) return redirectWithError(req, 'google_cancelled');
        if (!code || !state) return redirectWithError(req, 'google_invalid_state');

        const token = await exchangeGoogleCode(req, code);
        const profile = await fetchGoogleProfile(token.access_token);

        if (!profile.sub || !profile.email || !profile.email_verified) {
            return redirectWithError(req, 'google_unverified_email');
        }

        const email = profile.email.toLowerCase();
        const user = await prisma.$transaction(async (tx) => {
            const account = await tx.authAccount.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: 'google',
                        providerAccountId: profile.sub,
                    },
                },
                include: { user: true },
            });

            if (account) {
                if (account.user.twoFactorEnabled) throw new Error(TWO_FACTOR_GOOGLE_ERROR);
                return account.user;
            }

            const existingUser = await tx.user.findUnique({ where: { email } });
            if (existingUser?.twoFactorEnabled) throw new Error(TWO_FACTOR_GOOGLE_ERROR);
            if (!existingUser && state.flow !== 'signup') throw new Error(GOOGLE_SIGNUP_REQUIRED_ERROR);

            const linkedUser = existingUser ?? await tx.user.create({
                data: {
                    email,
                    password: null,
                    name: profile.name || email.split('@')[0],
                    avatar: profile.picture,
                    role: state.role,
                    coachApproved: false,
                },
            });

            await tx.authAccount.create({
                data: {
                    userId: linkedUser.id,
                    provider: 'google',
                    providerAccountId: profile.sub,
                    email,
                },
            });

            return linkedUser;
        });

        const sessionUser = buildSessionUser(user);
        const response = NextResponse.redirect(new URL(state.next, req.url));
        setSessionCookie(response, createSessionToken(sessionUser));
        clearGoogleStateCookie(response);
        return response;
    } catch (error) {
        if (error instanceof Error && error.message === TWO_FACTOR_GOOGLE_ERROR) {
            return redirectWithError(req, 'google_two_factor_enabled');
        }
        if (error instanceof Error && error.message === GOOGLE_SIGNUP_REQUIRED_ERROR) {
            const response = NextResponse.redirect(new URL('/register?error=google_signup_required', req.url));
            clearGoogleStateCookie(response);
            return response;
        }

        console.error('Google OAuth callback error:', error);
        return redirectWithError(req, 'google_login_failed');
    }
}
