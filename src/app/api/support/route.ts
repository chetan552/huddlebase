import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

const CATEGORIES = new Set(['ACCOUNT', 'COACH_APPROVAL', 'TEAM_ISSUE', 'BILLING', 'AI_ACCESS', 'OTHER']);

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { category, subject, message } = await req.json();
        const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
        const cleanMessage = typeof message === 'string' ? message.trim() : '';
        const cleanCategory = typeof category === 'string' && CATEGORIES.has(category) ? category : 'OTHER';

        if (!cleanSubject || !cleanMessage) {
            return NextResponse.json({ success: false, error: 'Subject and message are required' }, { status: 400 });
        }
        if (cleanSubject.length > 140) {
            return NextResponse.json({ success: false, error: 'Subject must be 140 characters or less' }, { status: 400 });
        }
        if (cleanMessage.length > 3000) {
            return NextResponse.json({ success: false, error: 'Message must be 3000 characters or less' }, { status: 400 });
        }

        const supportRequest = await prisma.$transaction(async (tx) => {
            const created = await tx.supportRequest.create({
                data: {
                    requesterId: user.id,
                    requesterName: user.name,
                    requesterEmail: user.email,
                    requesterRole: user.role,
                    category: cleanCategory,
                    subject: cleanSubject,
                    message: cleanMessage,
                },
                select: { id: true, status: true, subject: true, requesterName: true, createdAt: true },
            });

            const admins = await tx.user.findMany({
                where: { role: 'ADMIN', suspended: false },
                select: { id: true },
            });

            if (admins.length > 0) {
                await tx.notification.createMany({
                    data: admins.map((admin) => ({
                        userId: admin.id,
                        type: 'SUPPORT_REQUEST',
                        title: 'New support request',
                        body: `${created.requesterName}: ${created.subject}`,
                        link: '/admin?tab=support',
                    })),
                });
            }

            return created;
        });

        return NextResponse.json({
            success: true,
            data: {
                id: supportRequest.id,
                status: supportRequest.status,
                createdAt: supportRequest.createdAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Create support request error:', error);
        return NextResponse.json({ success: false, error: 'Failed to submit support request' }, { status: 500 });
    }
}
