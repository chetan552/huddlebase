import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

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

        // Fetch children IDs if the user is a Parent
        const familyLinks = await prisma.familyLink.findMany({
            where: { parentId: user.id },
            select: { childId: true }
        });
        const linkedPlayerIds = familyLinks.map(link => link.childId);
        linkedPlayerIds.push(user.id); // Add self to the list

        let whereClause: any = {};

        if (user.role === 'ADMIN' || user.role === 'COACH') {
            const teamIds = userTeams.map((t) => t.teamId);
            whereClause = {
                OR: [
                    { teamId: { in: teamIds } },
                    { playerId: { in: linkedPlayerIds } }
                ]
            };
        } else {
            whereClause = {
                playerId: { in: linkedPlayerIds }
            };
        }

        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: {
                player: { select: { name: true } },
                team: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const data = invoices.map((i) => ({
            id: i.id,
            title: i.title,
            description: i.description,
            amount: i.amount,
            dueDate: i.dueDate.toISOString(),
            status: i.status,
            playerName: i.player.name,
            teamName: i.team.name,
            createdAt: i.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch invoices error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { title, description, amount, dueDate, teamId, playerId } = await req.json();

        if (!title || !amount || !dueDate || !teamId || !playerId) {
            return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
        }

        const invoice = await prisma.invoice.create({
            data: {
                title,
                description: description || null,
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                teamId,
                playerId,
            },
            include: {
                player: { select: { name: true } },
                team: { select: { name: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: invoice.id,
                title: invoice.title,
                description: invoice.description,
                amount: invoice.amount,
                dueDate: invoice.dueDate.toISOString(),
                status: invoice.status,
                playerName: invoice.player.name,
                teamName: invoice.team.name,
                createdAt: invoice.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Create invoice error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create invoice' }, { status: 500 });
    }
}
