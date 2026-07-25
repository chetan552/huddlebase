import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember, isTeamStaff } from '@/lib/permissions';
import { isBlobConfigured } from '@/lib/blob';

/** Record a download and hand back the URL, so staff can see what's actually being read. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const file = await prisma.teamFile.findUnique({
            where: { id },
            select: { id: true, url: true, teamId: true, staffOnly: true, name: true },
        });
        if (!file) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        if (!(await isTeamMember(user, file.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        if (file.staffOnly && !(await isTeamStaff(user, file.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        await prisma.teamFile.update({
            where: { id },
            data: { downloadCount: { increment: 1 } },
        });

        return NextResponse.json({ success: true, data: { url: file.url, name: file.name } });
    } catch (error) {
        console.error('File download error:', error);
        return NextResponse.json({ success: false, error: 'Failed to open file' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const file = await prisma.teamFile.findUnique({
            where: { id },
            select: { teamId: true },
        });
        if (!file) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, file.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { name, description, folderId, staffOnly } = await req.json();

        if (name !== undefined && !String(name).trim()) {
            return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
        }
        if (folderId) {
            const folder = await prisma.teamFileFolder.findFirst({
                where: { id: folderId, teamId: file.teamId },
                select: { id: true },
            });
            if (!folder) {
                return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
            }
        }

        const updated = await prisma.teamFile.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: String(name).trim().slice(0, 200) }),
                ...(description !== undefined && { description: description?.trim()?.slice(0, 500) || null }),
                ...(folderId !== undefined && { folderId: folderId || null }),
                ...(staffOnly !== undefined && { staffOnly: Boolean(staffOnly) }),
            },
            select: { id: true, name: true, description: true, folderId: true, staffOnly: true },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update file error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update file' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const file = await prisma.teamFile.findUnique({
            where: { id },
            select: { id: true, url: true, teamId: true, uploaderId: true },
        });
        if (!file) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        const staff = await isTeamStaff(user, file.teamId);
        if (!staff && file.uploaderId !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        await prisma.teamFile.delete({ where: { id } });

        // Best-effort storage cleanup; the row is already gone either way.
        if (isBlobConfigured() && file.url.includes('.blob.vercel-storage.com')) {
            try {
                await del(file.url);
            } catch (error) {
                console.error('Blob delete failed:', error);
            }
        }

        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error('Delete file error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 });
    }
}
