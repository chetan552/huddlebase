import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { parseFormFields, readFormFields } from '@/lib/registration';

/** Form detail plus its submissions. Staff only — submissions contain personal data. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const form = await prisma.registrationForm.findUnique({
            where: { id },
            include: {
                team: { select: { id: true, name: true } },
                submissions: {
                    include: {
                        signature: { select: { signedName: true, signedAt: true } },
                        user: { select: { id: true, name: true, email: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!form) {
            return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, form.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const fields = readFormFields(form.fields);

        // Invoice status per submission, so staff can see who has actually paid.
        const invoiceIds = form.submissions.map((s) => s.invoiceId).filter((v): v is string => Boolean(v));
        const invoices = invoiceIds.length
            ? await prisma.invoice.findMany({
                  where: { id: { in: invoiceIds } },
                  select: { id: true, status: true, amount: true },
              })
            : [];
        const invoiceById = new Map(invoices.map((i) => [i.id, i]));

        return NextResponse.json({
            success: true,
            data: {
                id: form.id,
                teamId: form.teamId,
                teamName: form.team.name,
                title: form.title,
                description: form.description,
                season: form.season,
                fields,
                feeAmount: form.feeAmount,
                feeTitle: form.feeTitle,
                waiverTitle: form.waiverTitle,
                waiverText: form.waiverText,
                status: form.status,
                opensAt: form.opensAt?.toISOString() ?? null,
                closesAt: form.closesAt?.toISOString() ?? null,
                maxSubmissions: form.maxSubmissions,
                submissions: form.submissions.map((s) => {
                    let answers: Record<string, unknown> = {};
                    try {
                        answers = JSON.parse(s.answers);
                    } catch { /* corrupt row shouldn't break the list */ }

                    const invoice = s.invoiceId ? invoiceById.get(s.invoiceId) : null;

                    return {
                        id: s.id,
                        playerName: s.playerName,
                        playerEmail: s.playerEmail ?? s.user?.email ?? null,
                        accountName: s.user?.name ?? null,
                        answers,
                        status: s.status,
                        reviewNote: s.reviewNote,
                        signedName: s.signature?.signedName ?? null,
                        signedAt: s.signature?.signedAt.toISOString() ?? null,
                        invoiceId: s.invoiceId,
                        invoiceStatus: invoice?.status ?? null,
                        invoiceAmount: invoice?.amount ?? null,
                        createdAt: s.createdAt.toISOString(),
                    };
                }),
            },
        });
    } catch (error) {
        console.error('Fetch form error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load form' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const form = await prisma.registrationForm.findUnique({ where: { id }, select: { teamId: true } });
        if (!form) {
            return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, form.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const {
            title, description, season, fields, feeAmount, feeTitle,
            waiverTitle, waiverText, status, opensAt, closesAt, maxSubmissions,
        } = await req.json();

        let serialisedFields: string | undefined;
        if (fields !== undefined) {
            const parsed = parseFormFields(fields);
            if (parsed.error) {
                return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
            }
            serialisedFields = JSON.stringify(parsed.fields);
        }

        let fee: number | null | undefined;
        if (feeAmount !== undefined) {
            if (feeAmount === null || feeAmount === '') {
                fee = null;
            } else {
                fee = Number(feeAmount);
                if (!Number.isFinite(fee) || fee < 0) {
                    return NextResponse.json({ success: false, error: 'Fee must be a positive amount' }, { status: 400 });
                }
            }
        }

        if (status !== undefined && !['DRAFT', 'OPEN', 'CLOSED'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        const updated = await prisma.registrationForm.update({
            where: { id },
            data: {
                ...(title !== undefined && { title: String(title).trim().slice(0, 200) }),
                ...(description !== undefined && { description: description?.trim()?.slice(0, 1000) || null }),
                ...(season !== undefined && { season: season?.trim()?.slice(0, 60) || null }),
                ...(serialisedFields !== undefined && { fields: serialisedFields }),
                ...(fee !== undefined && { feeAmount: fee }),
                ...(feeTitle !== undefined && { feeTitle: feeTitle?.trim()?.slice(0, 120) || null }),
                ...(waiverTitle !== undefined && { waiverTitle: waiverTitle?.trim()?.slice(0, 200) || null }),
                ...(waiverText !== undefined && { waiverText: waiverText?.trim()?.slice(0, 20000) || null }),
                ...(status !== undefined && { status }),
                ...(opensAt !== undefined && {
                    opensAt: opensAt && !Number.isNaN(new Date(opensAt).getTime()) ? new Date(opensAt) : null,
                }),
                ...(closesAt !== undefined && {
                    closesAt: closesAt && !Number.isNaN(new Date(closesAt).getTime()) ? new Date(closesAt) : null,
                }),
                ...(maxSubmissions !== undefined && {
                    maxSubmissions: Number.isInteger(maxSubmissions) && maxSubmissions > 0 ? maxSubmissions : null,
                }),
            },
            select: { id: true, title: true, status: true },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update form error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update form' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const form = await prisma.registrationForm.findUnique({
            where: { id },
            select: { teamId: true, _count: { select: { submissions: true } } },
        });
        if (!form) {
            return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, form.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Deleting would take signed waivers with it, which are records a club may
        // need to keep. Close the form instead.
        if (form._count.submissions > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This form has submissions and signed waivers. Close it instead of deleting.',
                },
                { status: 409 },
            );
        }

        await prisma.registrationForm.delete({ where: { id } });
        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error('Delete form error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete form' }, { status: 500 });
    }
}
