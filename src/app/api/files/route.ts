import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember, isTeamStaff } from '@/lib/permissions';
import { notifyTeam } from '@/lib/notify';

/**
 * Team document repository — waivers, playbooks, league rules, medical forms.
 *
 * Staff-only files are filtered server-side rather than hidden in the UI, so a
 * player calling the API directly still can't see the team budget.
 */
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');
        const folderId = searchParams.get('folderId');

        if (!teamId) {
            return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400 });
        }
        if (!(await isTeamMember(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const staff = await isTeamStaff(user, teamId);

        const [files, folders] = await Promise.all([
            prisma.teamFile.findMany({
                where: {
                    teamId,
                    ...(folderId && { folderId }),
                    ...(staff ? {} : { staffOnly: false }),
                },
                include: {
                    uploader: { select: { id: true, name: true } },
                    folder: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.teamFileFolder.findMany({
                where: { teamId },
                include: { _count: { select: { files: true } } },
                orderBy: { name: 'asc' },
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                files: files.map((f) => ({
                    id: f.id,
                    name: f.name,
                    description: f.description,
                    url: f.url,
                    mimeType: f.mimeType,
                    sizeBytes: f.sizeBytes,
                    staffOnly: f.staffOnly,
                    downloadCount: f.downloadCount,
                    folderId: f.folderId,
                    folderName: f.folder?.name ?? null,
                    uploaderName: f.uploader.name,
                    createdAt: f.createdAt.toISOString(),
                    canDelete: staff || f.uploaderId === user.id,
                })),
                folders: folders.map((fo) => ({
                    id: fo.id,
                    name: fo.name,
                    fileCount: fo._count.files,
                })),
                canUpload: staff,
            },
        });
    } catch (error) {
        console.error('Fetch files error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch files' }, { status: 500 });
    }
}

/** Record an uploaded document. Staff only — this is the team's shared filing cabinet. */
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, folderId, name, description, url, mimeType, sizeBytes, staffOnly, notify } = await req.json();

        if (!teamId || !url || !name?.trim()) {
            return NextResponse.json({ success: false, error: 'teamId, name and url are required' }, { status: 400 });
        }
        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can upload files' }, { status: 403 });
        }

        // Only accept URLs we issued, so this can't attach arbitrary remote content.
        let parsed: URL;
        try {
            parsed = new URL(String(url));
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid url' }, { status: 400 });
        }
        const isBlobUrl = parsed.protocol === 'https:' && parsed.hostname.endsWith('.blob.vercel-storage.com');
        const isLocalUpload = parsed.pathname.startsWith('/uploads/');
        if (!isBlobUrl && !isLocalUpload) {
            return NextResponse.json({ success: false, error: 'Unsupported file URL' }, { status: 400 });
        }

        if (folderId) {
            const folder = await prisma.teamFileFolder.findFirst({
                where: { id: folderId, teamId },
                select: { id: true },
            });
            if (!folder) {
                return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
            }
        }

        const file = await prisma.teamFile.create({
            data: {
                teamId,
                folderId: folderId || null,
                uploaderId: user.id,
                name: name.trim().slice(0, 200),
                description: description?.trim()?.slice(0, 500) || null,
                url: String(url),
                mimeType: mimeType ? String(mimeType).slice(0, 120) : null,
                sizeBytes: Number.isInteger(sizeBytes) ? sizeBytes : null,
                staffOnly: Boolean(staffOnly),
            },
        });

        // Staff-only files are never announced to the whole team.
        if (notify && !file.staffOnly) {
            const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
            await notifyTeam(teamId, {
                exceptUserId: user.id,
                type: 'NEW_FILE',
                title: `New file in ${team?.name ?? 'your team'}`,
                body: `${user.name} shared "${file.name}"`,
                link: `/files?teamId=${teamId}`,
            });
        }

        return NextResponse.json({ success: true, data: { id: file.id, name: file.name, url: file.url } }, { status: 201 });
    } catch (error) {
        console.error('Create file error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save file' }, { status: 500 });
    }
}
