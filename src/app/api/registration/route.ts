import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember, isTeamStaff } from '@/lib/permissions';
import { parseFormFields, readFormFields, isFormOpen } from '@/lib/registration';
import { createSecureToken, appUrl } from '@/lib/tokens';

/** Registration forms for a team. Members see open forms; staff see drafts too. */
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');

        let teamIds: string[];
        if (teamId) {
            if (!(await isTeamMember(user, teamId))) {
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }
            teamIds = [teamId];
        } else {
            const memberships = await prisma.teamMember.findMany({
                where: { userId: user.id },
                select: { teamId: true },
            });
            teamIds = memberships.map((m) => m.teamId);
        }

        if (teamIds.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Staff on any of these teams can see drafts; everyone else only sees published forms.
        const staffTeams = new Set<string>();
        for (const id of teamIds) {
            if (await isTeamStaff(user, id)) staffTeams.add(id);
        }

        const forms = await prisma.registrationForm.findMany({
            where: {
                teamId: { in: teamIds },
                ...(staffTeams.size === teamIds.length
                    ? {}
                    : {
                          OR: [
                              { teamId: { in: Array.from(staffTeams) } },
                              { status: { in: ['OPEN', 'CLOSED'] } },
                          ],
                      }),
            },
            include: {
                team: { select: { id: true, name: true } },
                _count: { select: { submissions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: forms.map((f) => {
                const openState = isFormOpen(f);
                return {
                    id: f.id,
                    teamId: f.teamId,
                    teamName: f.team.name,
                    title: f.title,
                    description: f.description,
                    season: f.season,
                    fields: readFormFields(f.fields),
                    feeAmount: f.feeAmount,
                    feeTitle: f.feeTitle,
                    waiverTitle: f.waiverTitle,
                    waiverText: f.waiverText,
                    status: f.status,
                    isOpen: openState.open,
                    closedReason: openState.reason,
                    opensAt: f.opensAt?.toISOString() ?? null,
                    closesAt: f.closesAt?.toISOString() ?? null,
                    maxSubmissions: f.maxSubmissions,
                    submissionCount: f._count.submissions,
                    publicUrl: f.publicToken ? appUrl(`/register-team/${f.publicToken}`) : null,
                    canManage: staffTeams.has(f.teamId),
                };
            }),
        });
    } catch (error) {
        console.error('Fetch registration forms error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch forms' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const {
            teamId, title, description, season, fields, feeAmount, feeTitle,
            waiverTitle, waiverText, status, opensAt, closesAt, maxSubmissions,
        } = await req.json();

        if (!teamId || !title?.trim()) {
            return NextResponse.json({ success: false, error: 'teamId and title are required' }, { status: 400 });
        }
        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can create forms' }, { status: 403 });
        }

        const parsed = parseFormFields(fields);
        if (parsed.error) {
            return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
        }

        let fee: number | null = null;
        if (feeAmount !== undefined && feeAmount !== null && feeAmount !== '') {
            fee = Number(feeAmount);
            if (!Number.isFinite(fee) || fee < 0) {
                return NextResponse.json({ success: false, error: 'Fee must be a positive amount' }, { status: 400 });
            }
        }

        const form = await prisma.registrationForm.create({
            data: {
                teamId,
                title: title.trim().slice(0, 200),
                description: description?.trim()?.slice(0, 1000) || null,
                season: season?.trim()?.slice(0, 60) || null,
                fields: JSON.stringify(parsed.fields),
                feeAmount: fee,
                feeTitle: feeTitle?.trim()?.slice(0, 120) || null,
                waiverTitle: waiverTitle?.trim()?.slice(0, 200) || null,
                waiverText: waiverText?.trim()?.slice(0, 20000) || null,
                status: ['DRAFT', 'OPEN', 'CLOSED'].includes(status) ? status : 'DRAFT',
                opensAt: opensAt && !Number.isNaN(new Date(opensAt).getTime()) ? new Date(opensAt) : null,
                closesAt: closesAt && !Number.isNaN(new Date(closesAt).getTime()) ? new Date(closesAt) : null,
                maxSubmissions: Number.isInteger(maxSubmissions) && maxSubmissions > 0 ? maxSubmissions : null,
                // Public link so families can register before they have an account.
                publicToken: createSecureToken(),
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: form.id,
                title: form.title,
                status: form.status,
                publicUrl: form.publicToken ? appUrl(`/register-team/${form.publicToken}`) : null,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Create registration form error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create form' }, { status: 500 });
    }
}
