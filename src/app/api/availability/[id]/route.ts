import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { applyBlockToEvents, clearBlockFromEvents, isAvailabilityStatus } from '@/lib/availability';

async function loadOwnedBlock(userId: string, blockId: string) {
    const block = await prisma.availabilityBlock.findUnique({ where: { id: blockId } });
    if (!block) return { block: null, allowed: false };

    if (block.userId === userId) return { block, allowed: true };

    // Parents manage their linked children's blocks.
    const link = await prisma.familyLink.findFirst({
        where: { parentId: userId, childId: block.userId, status: 'ACTIVE' },
        select: { id: true },
    });
    return { block, allowed: Boolean(link) };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { block, allowed } = await loadOwnedBlock(user.id, id);
        if (!block) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        if (!allowed) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { startDate, endDate, status, reason } = await req.json();

        if (status !== undefined && !isAvailabilityStatus(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        const start = startDate ? new Date(startDate) : block.startDate;
        const end = endDate ? new Date(endDate) : block.endDate;
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 });
        }
        if (end.getTime() < start.getTime()) {
            return NextResponse.json({ success: false, error: 'End date must be on or after the start date' }, { status: 400 });
        }
        if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(String(endDate).trim())) {
            end.setUTCHours(23, 59, 59, 999);
        }

        // Roll back the old range first: shrinking a block must release the events it
        // no longer covers, which a plain update would leave stranded as NOT_GOING.
        await clearBlockFromEvents(block);

        const updated = await prisma.availabilityBlock.update({
            where: { id },
            data: {
                startDate: start,
                endDate: end,
                ...(status !== undefined && { status }),
                ...(reason !== undefined && { reason: reason?.trim() || null }),
            },
        });

        const rsvpsUpdated = await applyBlockToEvents(updated);

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                userId: updated.userId,
                teamId: updated.teamId,
                startDate: updated.startDate.toISOString(),
                endDate: updated.endDate.toISOString(),
                status: updated.status,
                reason: updated.reason,
            },
            meta: { rsvpsUpdated },
        });
    } catch (error) {
        console.error('Update availability error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update availability' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { block, allowed } = await loadOwnedBlock(user.id, id);
        if (!block) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        if (!allowed) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Release the auto-filled RSVPs before the block disappears.
        const rsvpsCleared = await clearBlockFromEvents(block);
        await prisma.availabilityBlock.delete({ where: { id } });

        return NextResponse.json({ success: true, data: { id }, meta: { rsvpsCleared } });
    } catch (error) {
        console.error('Delete availability error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete availability' }, { status: 500 });
    }
}
