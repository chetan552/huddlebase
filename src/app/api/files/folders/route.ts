import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, name } = await req.json();

        if (!teamId || !name?.trim()) {
            return NextResponse.json({ success: false, error: 'teamId and name are required' }, { status: 400 });
        }
        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can create folders' }, { status: 403 });
        }

        const folder = await prisma.teamFileFolder.create({
            data: { teamId, name: name.trim().slice(0, 80) },
        });

        return NextResponse.json({ success: true, data: { id: folder.id, name: folder.name, fileCount: 0 } }, { status: 201 });
    } catch (error) {
        // Folder names are unique per team.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json({ success: false, error: 'A folder with that name already exists' }, { status: 409 });
        }
        console.error('Create folder error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create folder' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
        }

        const folder = await prisma.teamFileFolder.findUnique({ where: { id }, select: { teamId: true } });
        if (!folder) {
            return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, folder.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Files survive and fall back to the root listing (the FK is onDelete: SetNull),
        // so deleting a folder never destroys documents.
        await prisma.teamFileFolder.delete({ where: { id } });

        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error('Delete folder error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete folder' }, { status: 500 });
    }
}
