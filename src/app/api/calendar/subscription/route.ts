import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { createSecureToken, appUrl } from '@/lib/tokens';

/**
 * Issue, read and revoke the caller's personal calendar subscription URL.
 *
 * The token is stored in the clear rather than hashed: unlike a password reset
 * token this is a long-lived capability the user needs to re-read whenever they add
 * another device, so it has to be recoverable. Regenerating (POST) invalidates the
 * previous URL, which is the revocation path.
 */

function subscriptionUrls(token: string) {
    const httpUrl = appUrl(`/api/calendar/${token}`);
    return {
        url: httpUrl,
        // webcal:// makes Apple Calendar and Outlook subscribe on click instead of
        // downloading a one-off snapshot.
        webcalUrl: httpUrl.replace(/^https?:\/\//, 'webcal://'),
        googleUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpUrl)}`,
    };
}

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const record = await prisma.user.findUnique({
            where: { id: user.id },
            select: { calendarToken: true },
        });

        // Mint on first read so the settings page always has a URL to show.
        let token = record?.calendarToken ?? null;
        if (!token) {
            token = createSecureToken();
            await prisma.user.update({ where: { id: user.id }, data: { calendarToken: token } });
        }

        const teams = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { team: { select: { id: true, name: true } } },
        });

        return NextResponse.json({
            success: true,
            data: {
                ...subscriptionUrls(token),
                teams: teams.map((t) => ({
                    id: t.team.id,
                    name: t.team.name,
                    ...subscriptionUrls(token),
                    url: `${subscriptionUrls(token).url}?teamId=${t.team.id}`,
                    webcalUrl: `${subscriptionUrls(token).webcalUrl}?teamId=${t.team.id}`,
                })),
            },
        });
    } catch (error) {
        console.error('Calendar subscription error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load subscription' }, { status: 500 });
    }
}

/** Regenerate the token, revoking every calendar client using the old URL. */
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const token = createSecureToken();
        await prisma.user.update({ where: { id: user.id }, data: { calendarToken: token } });

        return NextResponse.json({ success: true, data: subscriptionUrls(token) });
    } catch (error) {
        console.error('Calendar token reset error:', error);
        return NextResponse.json({ success: false, error: 'Failed to reset subscription' }, { status: 500 });
    }
}
