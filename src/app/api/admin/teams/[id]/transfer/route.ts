import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { writeAuditLog } from '@/lib/audit';

export async function POST(
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

        const { id: teamId } = await params;
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
        }

        const [team, targetUser] = await Promise.all([
            prisma.team.findUnique({
                where: { id: teamId },
                select: {
                    id: true,
                    name: true,
                    members: {
                        where: { role: 'COACH' },
                        select: { userId: true, user: { select: { email: true, name: true } } },
                    },
                },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true },
            }),
        ]);

        if (!team) {
            return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
        }
        if (!targetUser) {
            return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: targetUser.id },
                data: { role: 'COACH', coachApproved: true, suspended: false },
            }),
            prisma.teamMember.updateMany({
                where: { teamId, role: 'COACH', userId: { not: targetUser.id } },
                data: { role: 'MANAGER' },
            }),
            prisma.teamMember.upsert({
                where: { userId_teamId: { userId: targetUser.id, teamId } },
                update: { role: 'COACH' },
                create: { userId: targetUser.id, teamId, role: 'COACH' },
            }),
        ]);

        await writeAuditLog({
            actor: admin,
            action: 'admin.team.transfer_lead',
            targetType: 'Team',
            targetId: team.id,
            targetLabel: team.name,
            metadata: {
                newLeadCoach: { id: targetUser.id, email: targetUser.email, name: targetUser.name },
                previousCoaches: team.members.map((member) => ({
                    id: member.userId,
                    email: member.user.email,
                    name: member.user.name,
                })),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Transfer team lead error:', error);
        return NextResponse.json({ success: false, error: 'Failed to transfer team lead' }, { status: 500 });
    }
}
