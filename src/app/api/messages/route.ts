import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');

        if (!teamId) {
            return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400 });
        }

        const messages = await prisma.message.findMany({
            where: { teamId },
            include: { sender: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });

        const data = messages.map((m) => ({
            id: m.id,
            content: m.content,
            senderName: m.sender.name,
            senderId: m.sender.id,
            createdAt: m.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch messages error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, content } = await req.json();

        if (!teamId || !content?.trim()) {
            return NextResponse.json({ success: false, error: 'teamId and content are required' }, { status: 400 });
        }

        const message = await prisma.message.create({
            data: { teamId, senderId: user.id, content: content.trim() },
            include: {
                sender: { select: { id: true, name: true } },
                team: { select: { name: true } },
            },
        });

        // Notify other team members
        const members = await prisma.teamMember.findMany({
            where: { teamId, userId: { not: user.id } },
            select: { userId: true },
        });
        if (members.length > 0) {
            await prisma.notification.createMany({
                data: members.map((m) => ({
                    userId: m.userId,
                    type: 'NEW_MESSAGE',
                    title: `New message in ${message.team.name}`,
                    body: `${user.name}: ${content.trim().slice(0, 80)}`,
                    link: `/chat`,
                })),
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: message.id,
                content: message.content,
                senderName: message.sender.name,
                senderId: message.sender.id,
                createdAt: message.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
    }
}
