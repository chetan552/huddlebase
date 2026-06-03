import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const sessionUser = getSessionUser(req);
        if (!sessionUser) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Fetch latest user data from DB to reflect avatar and profile updates
        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { id: true, email: true, name: true, role: true, avatar: true },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 401 }
            );
        }

        return NextResponse.json({ success: true, data: user });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid session' },
            { status: 401 }
        );
    }
}
