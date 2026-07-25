import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember } from '@/lib/permissions';
import { mediaTypeFor } from '@/lib/blob';
import { notifyTeam } from '@/lib/notify';

const PAGE_SIZE = 60;

/** List a team's media, newest first. Filter to one album with ?albumId=. */
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');
        const albumId = searchParams.get('albumId');
        const cursor = searchParams.get('cursor');

        if (!teamId) {
            return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400 });
        }
        if (!(await isTeamMember(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const items = await prisma.mediaItem.findMany({
            where: { teamId, ...(albumId && { albumId }) },
            include: { uploader: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: PAGE_SIZE + 1,
            ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        });

        const hasMore = items.length > PAGE_SIZE;
        const page = hasMore ? items.slice(0, PAGE_SIZE) : items;

        return NextResponse.json({
            success: true,
            data: page.map((m) => ({
                id: m.id,
                url: m.url,
                thumbnailUrl: m.thumbnailUrl,
                type: m.type,
                caption: m.caption,
                width: m.width,
                height: m.height,
                sizeBytes: m.sizeBytes,
                durationSec: m.durationSec,
                albumId: m.albumId,
                uploaderId: m.uploaderId,
                uploaderName: m.uploader.name,
                uploaderAvatar: m.uploader.avatar,
                createdAt: m.createdAt.toISOString(),
                // Uploader can always remove their own; staff moderation is checked server-side.
                canDelete: m.uploaderId === user.id,
            })),
            meta: { hasMore, nextCursor: hasMore ? page[page.length - 1]?.id : null },
        });
    } catch (error) {
        console.error('Fetch media error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch media' }, { status: 500 });
    }
}

/**
 * Record an already-uploaded blob.
 *
 * Used by the local development path, where Blob storage cannot call back to
 * localhost, and by the mobile client which uploads separately.
 */
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, albumId, url, contentType, caption, width, height, sizeBytes, durationSec, notify } =
            await req.json();

        if (!teamId || !url) {
            return NextResponse.json({ success: false, error: 'teamId and url are required' }, { status: 400 });
        }
        if (!(await isTeamMember(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Only accept URLs we issued, so this can't be used to attach arbitrary
        // remote content to a team gallery.
        let parsed: URL;
        try {
            parsed = new URL(String(url));
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid url' }, { status: 400 });
        }
        const isBlobUrl = parsed.protocol === 'https:' && parsed.hostname.endsWith('.blob.vercel-storage.com');
        const isLocalUpload = parsed.pathname.startsWith('/uploads/');
        if (!isBlobUrl && !isLocalUpload) {
            return NextResponse.json({ success: false, error: 'Unsupported media URL' }, { status: 400 });
        }

        if (albumId) {
            const album = await prisma.mediaAlbum.findFirst({
                where: { id: albumId, teamId },
                select: { id: true },
            });
            if (!album) {
                return NextResponse.json({ success: false, error: 'Album not found' }, { status: 404 });
            }
        }

        const item = await prisma.mediaItem.create({
            data: {
                teamId,
                albumId: albumId || null,
                uploaderId: user.id,
                url: String(url),
                type: contentType ? (mediaTypeFor(String(contentType)) ?? 'IMAGE') : 'IMAGE',
                caption: caption?.trim()?.slice(0, 500) || null,
                width: Number.isInteger(width) ? width : null,
                height: Number.isInteger(height) ? height : null,
                sizeBytes: Number.isInteger(sizeBytes) ? sizeBytes : null,
                durationSec: Number.isInteger(durationSec) ? durationSec : null,
            },
        });

        if (albumId) {
            await prisma.mediaAlbum.updateMany({
                where: { id: albumId, coverUrl: null },
                data: { coverUrl: item.url },
            });
        }

        // Opt-in: a bulk upload should announce once, not once per photo.
        if (notify) {
            const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
            await notifyTeam(teamId, {
                exceptUserId: user.id,
                type: 'NEW_MEDIA',
                title: `New photos in ${team?.name ?? 'your team'}`,
                body: `${user.name} added photos to the team gallery`,
                link: `/media?teamId=${teamId}`,
            });
        }

        return NextResponse.json({ success: true, data: { id: item.id, url: item.url } }, { status: 201 });
    } catch (error) {
        console.error('Create media error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save media' }, { status: 500 });
    }
}
