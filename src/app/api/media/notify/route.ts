import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember } from '@/lib/permissions';
import { notifyTeam } from '@/lib/notify';

/**
 * Announce a finished batch of uploads.
 *
 * Separate from the upload itself so a 20-photo drop sends one notification rather
 * than twenty. Works in both environments: in production the rows are written by
 * the storage callback, locally by the client, and either way the client calls this
 * once when the batch completes.
 */
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, count, albumId } = await req.json();

        if (!teamId) {
            return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400 });
        }
        if (!(await isTeamMember(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const total = Number.isInteger(count) && count > 0 ? count : 1;
        const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });

        let albumName: string | null = null;
        if (albumId) {
            const album = await prisma.mediaAlbum.findFirst({
                where: { id: albumId, teamId },
                select: { name: true },
            });
            albumName = album?.name ?? null;
        }

        await notifyTeam(teamId, {
            exceptUserId: user.id,
            type: 'NEW_MEDIA',
            title: `New photos in ${team?.name ?? 'your team'}`,
            body: `${user.name} added ${total} item${total === 1 ? '' : 's'}${albumName ? ` to ${albumName}` : ''}`,
            link: `/media?teamId=${teamId}`,
        });

        return NextResponse.json({ success: true, data: { notified: true } });
    } catch (error) {
        console.error('Media notify error:', error);
        return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 });
    }
}
