import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember } from '@/lib/permissions';
import {
    IMAGE_MIME_TYPES,
    VIDEO_MIME_TYPES,
    mediaTypeFor,
    maxBytesForPathname,
    isBlobConfigured,
} from '@/lib/blob';

/**
 * Issues a scoped client-upload token, then records the finished upload.
 *
 * The browser uploads straight to Blob storage rather than through this route:
 * serverless request bodies cap at 4.5MB, which no team video clears. This endpoint
 * only authorises the upload and writes the row once storage confirms it.
 */

export async function POST(req: NextRequest): Promise<NextResponse> {
    if (!isBlobConfigured()) {
        return NextResponse.json(
            {
                success: false,
                error: 'Media storage is not configured. Set BLOB_READ_WRITE_TOKEN to enable uploads.',
            },
            { status: 503 },
        );
    }

    const body = (await req.json()) as HandleUploadBody;

    try {
        const result = await handleUpload({
            body,
            request: req,

            // Runs before the client is handed a token. Everything the completion
            // callback needs must be validated and stashed here, because that callback
            // is invoked by Blob storage and carries no session.
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                const user = getSessionUser(req);
                if (!user) throw new Error('Unauthorized');

                let payload: { teamId?: string; albumId?: string; caption?: string } = {};
                if (clientPayload) {
                    try {
                        payload = JSON.parse(clientPayload);
                    } catch {
                        throw new Error('Invalid upload payload');
                    }
                }

                const teamId = payload.teamId;
                if (!teamId) throw new Error('teamId is required');
                if (!(await isTeamMember(user, teamId))) {
                    throw new Error('You are not a member of that team');
                }

                if (payload.albumId) {
                    const album = await prisma.mediaAlbum.findFirst({
                        where: { id: payload.albumId, teamId },
                        select: { id: true },
                    });
                    if (!album) throw new Error('Album not found for this team');
                }

                return {
                    allowedContentTypes: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
                    maximumSizeInBytes: maxBytesForPathname(pathname),
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({
                        userId: user.id,
                        teamId,
                        albumId: payload.albumId ?? null,
                        caption: payload.caption ?? null,
                    }),
                };
            },

            // Called by Blob storage once the upload lands. Note this does not fire
            // against localhost — Vercel can't reach a local dev server — so in
            // development the client falls back to POSTing /api/media directly.
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                if (!tokenPayload) return;
                const { userId, teamId, albumId, caption } = JSON.parse(tokenPayload);

                await prisma.mediaItem.create({
                    data: {
                        teamId,
                        albumId: albumId || null,
                        uploaderId: userId,
                        url: blob.url,
                        type: mediaTypeFor(blob.contentType ?? '') ?? 'IMAGE',
                        caption: caption || null,
                    },
                });

                if (albumId) {
                    // First upload doubles as the album cover.
                    await prisma.mediaAlbum.updateMany({
                        where: { id: albumId, coverUrl: null },
                        data: { coverUrl: blob.url },
                    });
                }
            },
        });

        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        const status = message === 'Unauthorized' ? 401 : 400;
        console.error('Media upload error:', message);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
