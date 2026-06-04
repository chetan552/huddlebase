import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const TEAM_STAFF_ROLES = ['COACH', 'MANAGER', 'ADMIN'];

function clearSessionCookie(response: NextResponse) {
    response.cookies.set('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });
}

export async function DELETE(req: NextRequest) {
    try {
        const sessionUser = getSessionUser(req);
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { confirmation, password } = await req.json();
        if (confirmation !== 'DELETE') {
            return NextResponse.json({ success: false, error: 'Type DELETE to confirm account deletion' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
                teamMembers: {
                    where: { role: { in: TEAM_STAFF_ROLES } },
                    select: {
                        teamId: true,
                        role: true,
                        team: { select: { name: true } },
                    },
                },
            },
        });

        if (!user) {
            const response = NextResponse.json({ success: true });
            clearSessionCookie(response);
            return response;
        }

        if (user.password) {
            if (!password) {
                return NextResponse.json({ success: false, error: 'Password is required to delete this account' }, { status: 400 });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return NextResponse.json({ success: false, error: 'Password is incorrect' }, { status: 401 });
            }
        }

        if (user.role === 'ADMIN') {
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
                return NextResponse.json(
                    { success: false, error: 'You are the last admin. Promote another admin before deleting your account.' },
                    { status: 400 }
                );
            }
        }

        const blockingTeams: string[] = [];
        for (const membership of user.teamMembers) {
            const otherStaffCount = await prisma.teamMember.count({
                where: {
                    teamId: membership.teamId,
                    userId: { not: user.id },
                    role: { in: TEAM_STAFF_ROLES },
                },
            });

            if (otherStaffCount === 0) {
                blockingTeams.push(membership.team.name);
            }
        }

        if (blockingTeams.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Transfer staff access or delete these teams first: ${blockingTeams.join(', ')}`,
                },
                { status: 400 }
            );
        }

        await prisma.user.delete({ where: { id: user.id } });

        const response = NextResponse.json({ success: true });
        clearSessionCookie(response);
        return response;
    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete account' }, { status: 500 });
    }
}
