import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { notifyUsers } from '@/lib/notify';

const STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED', 'WAITLISTED'];

/** Review a registration: approve, reject or waitlist. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const submission = await prisma.registrationSubmission.findUnique({
            where: { id },
            include: { form: { select: { teamId: true, title: true, team: { select: { name: true } } } } },
        });

        if (!submission) {
            return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, submission.form.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { status, reviewNote } = await req.json();

        if (status !== undefined && !STATUSES.includes(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        const updated = await prisma.registrationSubmission.update({
            where: { id },
            data: {
                ...(status !== undefined && { status }),
                ...(reviewNote !== undefined && { reviewNote: reviewNote?.trim()?.slice(0, 500) || null }),
            },
        });

        // Only notify a registrant who actually has an account to notify.
        if (status && status !== submission.status && submission.userId) {
            const outcome =
                status === 'APPROVED' ? 'approved'
                : status === 'REJECTED' ? 'declined'
                : status === 'WAITLISTED' ? 'waitlisted'
                : null;

            if (outcome) {
                await notifyUsers({
                    userIds: [submission.userId],
                    type: 'REGISTRATION',
                    title: `Registration ${outcome}`,
                    body: `${submission.playerName} — ${submission.form.title} (${submission.form.team.name})`,
                    link: '/registration',
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: { id: updated.id, status: updated.status, reviewNote: updated.reviewNote },
        });
    } catch (error) {
        console.error('Review submission error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update submission' }, { status: 500 });
    }
}

/** The signed waiver for a submission, for a club's records. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const submission = await prisma.registrationSubmission.findUnique({
            where: { id },
            include: {
                signature: true,
                form: { select: { teamId: true, title: true } },
            },
        });

        if (!submission) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        // Staff, or the person who submitted it, may retrieve the signed record.
        const staff = await isTeamStaff(user, submission.form.teamId);
        if (!staff && submission.userId !== user.id) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        if (!submission.signature) {
            return NextResponse.json({ success: false, error: 'No waiver was signed for this registration' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                submissionId: submission.id,
                formTitle: submission.form.title,
                playerName: submission.playerName,
                signedName: submission.signature.signedName,
                signedAt: submission.signature.signedAt.toISOString(),
                waiverText: submission.signature.waiverText,
                // Only staff see the audit trail; a parent doesn't need their own IP back.
                ...(staff && {
                    ipAddress: submission.signature.ipAddress,
                    userAgent: submission.signature.userAgent,
                }),
            },
        });
    } catch (error) {
        console.error('Fetch waiver error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load waiver' }, { status: 500 });
    }
}
