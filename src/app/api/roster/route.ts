import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionUser } from '@/lib/session';
import { toCSV } from '@/lib/utils';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userTeams = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        const teamIds = userTeams.map((t) => t.teamId);

        const members = await prisma.teamMember.findMany({
            where: { teamId: { in: teamIds } },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
                team: { select: { name: true } },
            },
        });

        const data = members.map((m) => ({
            id: m.id,
            userId: m.user.id,
            userName: m.user.name,
            userEmail: m.user.email,
            phone: m.user.phone,
            role: m.role,
            jerseyNumber: m.jersey,
            position: m.position,
            category: m.category,
            teamId: m.teamId,
            teamName: m.team.name,
        }));

        if (req.nextUrl.searchParams.get('format') === 'csv') {
            const csv = toCSV(data, [
                { key: 'teamName', header: 'Team' },
                { key: 'userName', header: 'Name' },
                { key: 'userEmail', header: 'Email' },
                { key: 'phone', header: 'Phone' },
                { key: 'role', header: 'Role' },
                { key: 'jerseyNumber', header: 'Jersey' },
                { key: 'position', header: 'Position' },
                { key: 'category', header: 'Category' },
            ]);
            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="roster.csv"',
                },
            });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch roster error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch roster' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { name, email, teamId, role, jersey, position, phone, category } = await req.json();

        if (!name || !email || !teamId) {
            return NextResponse.json({ success: false, error: 'Name, email, and team are required' }, { status: 400 });
        }

        // Find or create user
        let playerUser = await prisma.user.findUnique({ where: { email } });
        if (!playerUser) {
            const hashedPassword = await bcrypt.hash('password123', 12);
            playerUser = await prisma.user.create({
                data: { email, password: hashedPassword, name, role: role || 'PLAYER', phone: phone || null },
            });
        }

        // Check for jersey number conflict on the same team
        if (jersey) {
            const existingJersey = await prisma.teamMember.findFirst({
                where: { teamId, jersey },
            });
            if (existingJersey) {
                return NextResponse.json(
                    { success: false, error: `Jersey #${jersey} is already taken on this team` },
                    { status: 409 }
                );
            }
        }

        // Add to team
        const member = await prisma.teamMember.create({
            data: {
                userId: playerUser.id,
                teamId,
                role: role || 'PLAYER',
                jersey: jersey || null,
                position: position || null,
                category: category || null,
            },
            include: {
                user: { select: { name: true, email: true, phone: true } },
                team: { select: { name: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: member.id,
                name: member.user.name,
                email: member.user.email,
                phone: member.user.phone,
                role: member.role,
                jersey: member.jersey,
                position: member.position,
                category: member.category,
                teamName: member.team.name,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Add player error:', error);
        return NextResponse.json({ success: false, error: 'Failed to add player' }, { status: 500 });
    }
}
