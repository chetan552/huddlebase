import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAuthorizationResponse, hasGoogleOAuthConfig, isValidOAuthRole } from '@/lib/googleOAuth';

export async function GET(req: NextRequest) {
    if (!hasGoogleOAuthConfig()) {
        return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
    }

    if (req.nextUrl.searchParams.get('flow') === 'signup' && !isValidOAuthRole(req.nextUrl.searchParams.get('role'))) {
        return NextResponse.redirect(new URL('/register?error=google_role_required', req.url));
    }

    return createGoogleAuthorizationResponse(req);
}
