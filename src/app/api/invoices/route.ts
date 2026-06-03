import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { toCSV } from '@/lib/utils';
import { sendEmail, invoiceCreatedEmail } from '@/lib/email';
import { isTeamStaff, isUserOnTeam } from '@/lib/permissions';

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

        let whereClause: Prisma.InvoiceWhereInput = {};

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

        if (req.nextUrl.searchParams.get('format') === 'csv') {
            const csv = toCSV(data, [
                { key: 'teamName', header: 'Team' },
                { key: 'playerName', header: 'Player' },
                { key: 'title', header: 'Title' },
                { key: 'description', header: 'Description' },
                { key: 'amount', header: 'Amount' },
                { key: 'status', header: 'Status' },
                { key: 'dueDate', header: 'Due Date' },
                { key: 'createdAt', header: 'Created At' },
            ]);
            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="invoices.csv"',
                },
            });
        }

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

        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can create invoices' }, { status: 403 });
        }

        if (!(await isUserOnTeam(playerId, teamId))) {
            return NextResponse.json({ success: false, error: 'Player must be on the selected team' }, { status: 400 });
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
                player: { select: { name: true, email: true } },
                team: { select: { name: true } },
            },
        });

        // Notify the player and linked parents
        const notifyUserIds = [playerId];
        const notifyEmails = [invoice.player.email].filter(Boolean) as string[];

        const familyLinks = await prisma.familyLink.findMany({
            where: { childId: playerId, status: 'ACTIVE' },
            include: { parent: { select: { id: true, email: true } } },
        });
        for (const link of familyLinks) {
            notifyUserIds.push(link.parentId);
            if (link.parent.email) notifyEmails.push(link.parent.email);
        }

        if (notifyUserIds.length > 0) {
            await prisma.notification.createMany({
                data: notifyUserIds.map((uid) => ({
                    userId: uid,
                    type: 'INVOICE_DUE',
                    title: `New invoice from ${invoice.team.name}`,
                    body: `${title} — $${parseFloat(amount).toFixed(2)} due ${new Date(dueDate).toLocaleDateString()}`,
                    link: `/payments`,
                })),
            });

            if (notifyEmails.length > 0) {
                const html = invoiceCreatedEmail({
                    title,
                    amount: parseFloat(amount),
                    dueDate,
                    teamName: invoice.team.name,
                });
                await sendEmail({
                    to: notifyEmails,
                    subject: `Invoice from ${invoice.team.name}: ${title}`,
                    html,
                });
            }
        }

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
