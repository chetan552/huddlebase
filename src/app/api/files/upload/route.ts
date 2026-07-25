import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { TEAM_FILE_MIME_TYPES, MAX_DOCUMENT_BYTES, isBlobConfigured } from '@/lib/blob';

/**
 * Client-upload authorisation for team documents.
 *
 * Same pattern as media uploads: the browser sends the file straight to storage,
 * and this route only authorises it and records the row on completion.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
    if (!isBlobConfigured()) {
        return NextResponse.json(
            {
                success: false,
                error: 'File storage is not configured. Set BLOB_READ_WRITE_TOKEN to enable uploads.',
            },
            { status: 503 },
        );
    }

    const body = (await req.json()) as HandleUploadBody;

    try {
        const result = await handleUpload({
            body,
            request: req,

            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                const user = getSessionUser(req);
                if (!user) throw new Error('Unauthorized');

                let payload: { teamId?: string; folderId?: string; staffOnly?: boolean; name?: string } = {};
                if (clientPayload) {
                    try {
                        payload = JSON.parse(clientPayload);
                    } catch {
                        throw new Error('Invalid upload payload');
                    }
                }

                const teamId = payload.teamId;
                if (!teamId) throw new Error('teamId is required');
                if (!(await isTeamStaff(user, teamId))) {
                    throw new Error('Only team staff can upload files');
                }

                if (payload.folderId) {
                    const folder = await prisma.teamFileFolder.findFirst({
                        where: { id: payload.folderId, teamId },
                        select: { id: true },
                    });
                    if (!folder) throw new Error('Folder not found for this team');
                }

                return {
                    allowedContentTypes: [...TEAM_FILE_MIME_TYPES],
                    maximumSizeInBytes: MAX_DOCUMENT_BYTES,
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({
                        userId: user.id,
                        teamId,
                        folderId: payload.folderId ?? null,
                        staffOnly: payload.staffOnly ?? false,
                        name: payload.name ?? null,
                    }),
                };
            },

            // Not invoked against localhost — Vercel can't reach a local dev server —
            // so the client records the row directly in development.
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                if (!tokenPayload) return;
                const { userId, teamId, folderId, staffOnly, name } = JSON.parse(tokenPayload);

                await prisma.teamFile.create({
                    data: {
                        teamId,
                        folderId: folderId || null,
                        uploaderId: userId,
                        name: name || blob.pathname.split('/').pop() || 'Untitled',
                        url: blob.url,
                        mimeType: blob.contentType ?? null,
                        staffOnly: Boolean(staffOnly),
                    },
                });
            },
        });

        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        const status = message === 'Unauthorized' ? 401 : 400;
        console.error('File upload error:', message);
        return NextResponse.json({ success: false, error: message }, { status });
    }
}
