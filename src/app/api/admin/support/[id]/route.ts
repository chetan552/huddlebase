import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { writeAuditLog } from '@/lib/audit';

const STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED']);

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = getSessionUser(req);
        if (!admin) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (admin.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        const { status, adminNote } = await req.json();
        const cleanStatus = typeof status === 'string' ? status : '';
        const cleanAdminNote = typeof adminNote === 'string' ? adminNote.trim() : undefined;

        if (!STATUSES.has(cleanStatus)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }
        if (cleanAdminNote && cleanAdminNote.length > 2000) {
            return NextResponse.json({ success: false, error: 'Admin note must be 2000 characters or less' }, { status: 400 });
        }

        const existing = await prisma.supportRequest.findUnique({
            where: { id },
            select: { id: true, subject: true, status: true, adminNote: true, requesterEmail: true },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Support request not found' }, { status: 404 });
        }

        const updated = await prisma.supportRequest.update({
            where: { id },
            data: {
                status: cleanStatus,
                ...(cleanAdminNote !== undefined ? { adminNote: cleanAdminNote || null } : {}),
            },
        });

        await writeAuditLog({
            actor: admin,
            action: 'admin.support.update',
            targetType: 'SupportRequest',
            targetId: updated.id,
            targetLabel: updated.subject,
            metadata: {
                requesterEmail: updated.requesterEmail,
                before: { status: existing.status, adminNote: existing.adminNote },
                after: { status: updated.status, adminNote: updated.adminNote },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                requesterName: updated.requesterName,
                requesterEmail: updated.requesterEmail,
                requesterRole: updated.requesterRole,
                category: updated.category,
                subject: updated.subject,
                message: updated.message,
                status: updated.status,
                adminNote: updated.adminNote,
                createdAt: updated.createdAt.toISOString(),
                updatedAt: updated.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Update support request error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update support request' }, { status: 500 });
    }
}
