import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getSessionUser } from '@/lib/session';

interface ImportRecord {
    name: string;
    email: string;
    role?: string;
    jersey?: string;
    position?: string;
    phone?: string;
    category?: string;
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const isStaff = user.role === 'ADMIN' || user.role === 'COACH';
        if (!isStaff) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { teamId, records } = await req.json() as { teamId: string; records: ImportRecord[] };

        if (!teamId || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({ success: false, error: 'teamId and records are required' }, { status: 400 });
        }

        // Verify caller is a member of this team
        const membership = await prisma.teamMember.findFirst({
            where: { teamId, userId: user.id },
        });
        if (!membership && user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Not a member of this team' }, { status: 403 });
        }

        // Fetch existing jerseys on this team to check conflicts
        const existingJerseys = await prisma.teamMember.findMany({
            where: { teamId, jersey: { not: null } },
            select: { jersey: true },
        });
        const takenJerseys = new Set(existingJerseys.map((m) => m.jersey!));

        const created: string[] = [];
        const skipped: string[] = [];
        const errors: Array<{ row: number; name: string; error: string }> = [];

        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            const name = r.name?.trim();
            const email = r.email?.trim().toLowerCase();

            if (!name || !email) {
                errors.push({ row: i + 1, name: name || '(blank)', error: 'Name and email are required' });
                continue;
            }

            const jersey = r.jersey?.trim() || null;
            if (jersey && takenJerseys.has(jersey)) {
                errors.push({ row: i + 1, name, error: `Jersey #${jersey} is already taken on this team` });
                continue;
            }

            try {
                // Find or create user
                let playerUser = await prisma.user.findUnique({ where: { email } });
                if (!playerUser) {
                    const hashedPassword = await bcrypt.hash('password123', 12);
                    playerUser = await prisma.user.create({
                        data: {
                            email,
                            password: hashedPassword,
                            name,
                            role: 'PLAYER',
                            phone: r.phone?.trim() || null,
                        },
                    });
                }

                // Check if already on team
                const existing = await prisma.teamMember.findFirst({
                    where: { teamId, userId: playerUser.id },
                });
                if (existing) {
                    skipped.push(name);
                    continue;
                }

                await prisma.teamMember.create({
                    data: {
                        userId: playerUser.id,
                        teamId,
                        role: r.role?.toUpperCase() === 'COACH' ? 'COACH' : 'PLAYER',
                        jersey,
                        position: r.position?.trim() || null,
                        category: r.category?.trim() || null,
                    },
                });

                if (jersey) takenJerseys.add(jersey);
                created.push(name);
            } catch (err) {
                errors.push({ row: i + 1, name, error: 'Database error — row skipped' });
            }
        }

        return NextResponse.json({ success: true, data: { created, skipped, errors } });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
    }
}
