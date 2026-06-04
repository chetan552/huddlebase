import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const ADMIN_ROLES = new Set(['ADMIN', 'COACH', 'PARENT', 'PLAYER']);

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sessionUser = getSessionUser(req);
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (sessionUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const { id } = await params;
        const { role, coachApproved } = await req.json();

        if (!ADMIN_ROLES.has(role)) {
            return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
        }
        if (id === sessionUser.id && role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'You cannot remove your own admin role' }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: {
                role,
                coachApproved: role === 'COACH' ? Boolean(coachApproved) : role === 'ADMIN',
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                coachApproved: true,
                avatar: true,
                createdAt: true,
                _count: { select: { teamMembers: true, authAccounts: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                coachApproved: updated.coachApproved,
                avatar: updated.avatar,
                createdAt: updated.createdAt.toISOString(),
                teamCount: updated._count.teamMembers,
                authProviderCount: updated._count.authAccounts,
            },
        });
    } catch (error) {
        console.error('Admin update user error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
    }
}
