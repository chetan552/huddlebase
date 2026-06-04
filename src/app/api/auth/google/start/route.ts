import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAuthorizationResponse, hasGoogleOAuthConfig } from '@/lib/googleOAuth';

export async function GET(req: NextRequest) {
    if (!hasGoogleOAuthConfig()) {
        return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
    }

    return createGoogleAuthorizationResponse(req);
}
