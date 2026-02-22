import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// GET: Fetch all children linked to the logged-in parent
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const familyLinks = await prisma.familyLink.findMany({
            where: { parentId: user.id },
            include: {
                child: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        role: true,
                        teamMembers: {
                            include: { team: { select: { id: true, name: true, color: true } } }
                        }
                    }
                }
            }
        });

        // Map it so we return an array of the actual child user objects (with team info attached)
        const children = familyLinks.map(link => link.child);

        return NextResponse.json({ success: true, data: children });
    } catch (error) {
        console.error('Fetch family error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch family members' }, { status: 500 });
    }
}

// POST: Link a new child to the parent (via child email)
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user || user.role !== 'PARENT') {
            return NextResponse.json({ success: false, error: 'Unauthorized. Only Parents can add children.' }, { status: 403 });
        }

        const body = await req.json();
        const { childEmail } = body;

        if (!childEmail) {
            return NextResponse.json({ success: false, error: 'Child email is required' }, { status: 400 });
        }

        // 1. Find the child by email
        const childUser = await prisma.user.findUnique({
            where: { email: childEmail.toLowerCase() }
        });

        if (!childUser) {
            return NextResponse.json({ success: false, error: 'No player found with that email address.' }, { status: 404 });
        }

        if (childUser.id === user.id) {
            return NextResponse.json({ success: false, error: 'You cannot link your own account.' }, { status: 400 });
        }

        // 2. See if link already exists
        const existingLink = await prisma.familyLink.findFirst({
            where: { parentId: user.id, childId: childUser.id }
        });

        if (existingLink) {
            return NextResponse.json({ success: false, error: 'This player is already linked to your family.' }, { status: 400 });
        }

        // 3. Create the link
        const newLink = await prisma.familyLink.create({
            data: {
                parentId: user.id,
                childId: childUser.id,
                status: 'ACTIVE' // For MVP, auto-approve. In V2 we might require child consent.
            },
            include: { child: true }
        });

        // 4. Auto-join parent to all of the child's teams as PARENT role
        const childTeams = await prisma.teamMember.findMany({
            where: { userId: childUser.id },
            select: { teamId: true },
        });

        for (const ct of childTeams) {
            const existingMembership = await prisma.teamMember.findFirst({
                where: { userId: user.id, teamId: ct.teamId },
            });
            if (!existingMembership) {
                await prisma.teamMember.create({
                    data: { userId: user.id, teamId: ct.teamId, role: 'PARENT' },
                });
            }
        }

        return NextResponse.json({ success: true, data: newLink.child }, { status: 201 });
    } catch (error) {
        console.error('Add family member error:', error);
        return NextResponse.json({ success: false, error: 'Failed to link family member' }, { status: 500 });
    }
}
