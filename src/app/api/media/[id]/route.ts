import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { isBlobConfigured } from '@/lib/blob';

/** Delete a media item. Uploaders can remove their own; team staff can moderate any. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const item = await prisma.mediaItem.findUnique({
            where: { id },
            select: { id: true, url: true, teamId: true, uploaderId: true, albumId: true },
        });

        if (!item) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        const isUploader = item.uploaderId === user.id;
        if (!isUploader && !(await isTeamStaff(user, item.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        await prisma.mediaItem.delete({ where: { id } });

        // Best-effort blob cleanup: the row is already gone, so a storage failure
        // shouldn't surface as a failed delete. Worst case is an orphaned object.
        if (isBlobConfigured() && item.url.includes('.blob.vercel-storage.com')) {
            try {
                await del(item.url);
            } catch (error) {
                console.error('Blob delete failed:', error);
            }
        }

        // If this was the album cover, promote the next most recent item.
        if (item.albumId) {
            const album = await prisma.mediaAlbum.findUnique({
                where: { id: item.albumId },
                select: { coverUrl: true },
            });
            if (album?.coverUrl === item.url) {
                const next = await prisma.mediaItem.findFirst({
                    where: { albumId: item.albumId },
                    orderBy: { createdAt: 'desc' },
                    select: { url: true },
                });
                await prisma.mediaAlbum.update({
                    where: { id: item.albumId },
                    data: { coverUrl: next?.url ?? null },
                });
            }
        }

        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error('Delete media error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete media' }, { status: 500 });
    }
}

/** Update a caption or move an item into a different album. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const item = await prisma.mediaItem.findUnique({
            where: { id },
            select: { id: true, teamId: true, uploaderId: true },
        });

        if (!item) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        if (item.uploaderId !== user.id && !(await isTeamStaff(user, item.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { caption, albumId } = await req.json();

        if (albumId) {
            const album = await prisma.mediaAlbum.findFirst({
                where: { id: albumId, teamId: item.teamId },
                select: { id: true },
            });
            if (!album) {
                return NextResponse.json({ success: false, error: 'Album not found for this team' }, { status: 404 });
            }
        }

        const updated = await prisma.mediaItem.update({
            where: { id },
            data: {
                ...(caption !== undefined && { caption: caption?.trim()?.slice(0, 500) || null }),
                ...(albumId !== undefined && { albumId: albumId || null }),
            },
            select: { id: true, caption: true, albumId: true },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update media error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update media' }, { status: 500 });
    }
}
