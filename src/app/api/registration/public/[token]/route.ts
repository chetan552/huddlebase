import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { readFormFields, validateAnswers, isFormOpen } from '@/lib/registration';
import { notifyUsers } from '@/lib/notify';

/**
 * Public registration form.
 *
 * Deliberately reachable without a session so families can sign up before they have
 * an account — the token in the URL is the capability. Only the fields needed to
 * render and submit the form are exposed; submissions are never listed here.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        if (!token || token.length < 20) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        const form = await prisma.registrationForm.findUnique({
            where: { publicToken: token },
            include: {
                team: { select: { name: true, color: true, sport: true } },
                _count: { select: { submissions: true } },
            },
        });

        if (!form) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        const openState = isFormOpen(form);
        const full = form.maxSubmissions !== null && form._count.submissions >= form.maxSubmissions;

        return NextResponse.json({
            success: true,
            data: {
                title: form.title,
                description: form.description,
                season: form.season,
                teamName: form.team.name,
                teamColor: form.team.color,
                sport: form.team.sport,
                fields: readFormFields(form.fields),
                feeAmount: form.feeAmount,
                feeTitle: form.feeTitle,
                waiverTitle: form.waiverTitle,
                waiverText: form.waiverText,
                isOpen: openState.open && !full,
                closedReason: full ? 'Registration is full' : openState.reason,
            },
        });
    } catch (error) {
        console.error('Public form error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load form' }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        const form = await prisma.registrationForm.findUnique({
            where: { publicToken: token },
            include: {
                team: { select: { id: true, name: true } },
                _count: { select: { submissions: true } },
            },
        });

        if (!form) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        const openState = isFormOpen(form);
        if (!openState.open) {
            return NextResponse.json({ success: false, error: openState.reason }, { status: 400 });
        }
        if (form.maxSubmissions !== null && form._count.submissions >= form.maxSubmissions) {
            return NextResponse.json({ success: false, error: 'Registration is full' }, { status: 400 });
        }

        const { playerName, playerEmail, answers, signedName } = await req.json();

        if (!playerName?.trim()) {
            return NextResponse.json({ success: false, error: 'Player name is required' }, { status: 400 });
        }

        const fields = readFormFields(form.fields);
        const validated = validateAnswers(fields, answers);
        if (validated.error) {
            return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
        }

        // A form carrying a waiver cannot be submitted without a signature.
        if (form.waiverText && !signedName?.trim()) {
            return NextResponse.json(
                { success: false, error: 'You must sign the waiver to continue' },
                { status: 400 },
            );
        }

        // Optional: link the submission to an account when one is signed in.
        const user = getSessionUser(req);

        const submission = await prisma.$transaction(async (tx) => {
            const created = await tx.registrationSubmission.create({
                data: {
                    formId: form.id,
                    userId: user?.id ?? null,
                    playerName: playerName.trim().slice(0, 200),
                    playerEmail: playerEmail?.trim()?.slice(0, 200) || null,
                    answers: JSON.stringify(validated.answers),
                },
            });

            if (form.waiverText) {
                await tx.waiverSignature.create({
                    data: {
                        submissionId: created.id,
                        userId: user?.id ?? null,
                        signedName: signedName.trim().slice(0, 200),
                        // Snapshot the exact wording agreed to — the form's text may
                        // change later, and the signature must stay evidence of what
                        // was actually signed.
                        waiverText: form.waiverText,
                        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
                        userAgent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
                    },
                });
            }

            return created;
        });

        // A fee generates an invoice, but only when we know which account to bill.
        // Anonymous registrations are invoiced by staff once the player is added.
        let invoiceId: string | null = null;
        if (form.feeAmount && form.feeAmount > 0 && user) {
            const invoice = await prisma.invoice.create({
                data: {
                    teamId: form.teamId,
                    playerId: user.id,
                    title: form.feeTitle || `${form.title} — registration fee`,
                    description: `Registration for ${playerName.trim()}`,
                    amount: form.feeAmount,
                    // Two weeks is the usual grace period for a season fee.
                    dueDate: new Date(Date.now() + 14 * 86400000),
                },
            });
            invoiceId = invoice.id;
            await prisma.registrationSubmission.update({
                where: { id: submission.id },
                data: { invoiceId },
            });
        }

        // Let the coaching staff know someone signed up.
        const staff = await prisma.teamMember.findMany({
            where: { teamId: form.teamId, role: { in: ['COACH', 'MANAGER'] } },
            select: { userId: true },
        });
        if (staff.length > 0) {
            await notifyUsers({
                userIds: staff.map((s) => s.userId),
                type: 'REGISTRATION',
                title: `New registration for ${form.title}`,
                body: `${playerName.trim()} just signed up`,
                link: `/registration?formId=${form.id}`,
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: submission.id,
                invoiceId,
                requiresPayment: Boolean(form.feeAmount && form.feeAmount > 0),
                // Tell an anonymous registrant that the fee will be billed separately.
                feeHandledSeparately: Boolean(form.feeAmount && form.feeAmount > 0 && !user),
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Submit registration error:', error);
        return NextResponse.json({ success: false, error: 'Failed to submit registration' }, { status: 500 });
    }
}
