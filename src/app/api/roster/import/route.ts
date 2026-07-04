import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getSessionUser } from '@/lib/session';
import { isApprovedCoachOrAdmin } from '@/lib/permissions';
import { appUrl, createSecureToken, hashToken } from '@/lib/tokens';
import { sendEmail, teamInviteEmail } from '@/lib/email';

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

        const isStaff = isApprovedCoachOrAdmin(user);
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

        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { name: true },
        });
        const teamName = team?.name ?? 'your team';
        const pendingInvites: Array<{ email: string; token: string }> = [];

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

            const teamRole = r.role?.toUpperCase() === 'COACH' ? 'COACH' : 'PLAYER';
            try {
                // Find or create user. New users get a random password and an invite token —
                // they cannot log in until they accept the invite (which sets their password).
                let playerUser = await prisma.user.findUnique({ where: { email } });
                let isNewUser = false;
                if (!playerUser) {
                    const temporaryPassword = randomBytes(24).toString('base64url');
                    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
                    playerUser = await prisma.user.create({
                        data: {
                            email,
                            password: hashedPassword,
                            name,
                            role: 'PLAYER',
                            coachApproved: false,
                            phone: r.phone?.trim() || null,
                        },
                    });
                    isNewUser = true;
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
                        role: teamRole,
                        jersey,
                        position: r.position?.trim() || null,
                        category: r.category?.trim() || null,
                    },
                });

                if (isNewUser) {
                    const inviteToken = createSecureToken();
                    await prisma.teamInvite.create({
                        data: {
                            email,
                            teamId,
                            userId: playerUser.id,
                            role: teamRole,
                            tokenHash: hashToken(inviteToken),
                            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                        },
                    });
                    pendingInvites.push({ email, token: inviteToken });
                }

                if (jersey) takenJerseys.add(jersey);
                created.push(name);
            } catch {
                errors.push({ row: i + 1, name, error: 'Database error — row skipped' });
            }
        }

        // Send invite emails after DB writes so an email failure doesn't roll back roster changes.
        for (const { email, token } of pendingInvites) {
            try {
                await sendEmail({
                    to: email,
                    subject: `You're invited to ${teamName} on HuddleBase`,
                    html: teamInviteEmail({
                        inviterName: user.name,
                        teamName,
                        inviteUrl: appUrl(`/accept-invite?token=${token}`),
                    }),
                });
            } catch (emailError) {
                console.error('Import invite email failed:', email, emailError);
            }
        }

        return NextResponse.json({ success: true, data: { created, skipped, errors } });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
    }
}
