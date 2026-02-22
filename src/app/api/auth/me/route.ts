import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        // Check cookie first (web), then Authorization header (mobile)
        const sessionCookie = req.cookies.get('session');
        let userData: string | null = sessionCookie?.value || null;

        if (!userData) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    userData = Buffer.from(token, 'base64').toString('utf-8');
                } catch {
                    userData = null;
                }
            }
        }

        if (!userData) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const parsed = JSON.parse(userData);

        // Fetch latest user data from DB to reflect avatar and profile updates
        const user = await prisma.user.findUnique({
            where: { id: parsed.id },
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
